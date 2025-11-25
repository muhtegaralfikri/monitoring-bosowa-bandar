// /backend/src/users/users.service.ts
import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'; 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
// Tambahkan 'implements OnModuleInit'
export class UsersService implements OnModuleInit { 
  // Tambahkan Logger untuk pesan yang rapi di konsol
  private readonly logger = new Logger(UsersService.name);
  private readonly shouldSeed: boolean;

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private rolesRepository: Repository<RoleEntity>,
    private readonly configService: ConfigService,
  ) {
    this.shouldSeed = this.configService.get<string>('SEED_DEFAULT_USERS', 'true') === 'true';
  }

  /**
   * Method ini akan dipanggil otomatis oleh NestJS
   * saat UsersModule diinisialisasi.
   */
  async onModuleInit() {
    if (!this.shouldSeed) {
      this.logger.log('Seeding default users skipped (SEED_DEFAULT_USERS=false)');
      return;
    }
    await this.seedInitialData();
  }

  /**
   * Logic untuk membuat data awal (Roles dan Admin User)
   * Ini 'idempotent', artinya aman dijalankan berkali-kali.
   */
  private async seedInitialData() {
    try {
      // 1. Buat Roles jika belum ada
      let adminRole = await this.rolesRepository.findOne({ where: { name: 'admin' } });
      if (!adminRole) {
        adminRole = this.rolesRepository.create({ name: 'admin' });
        await this.rolesRepository.save(adminRole);
        this.logger.log('Admin role created');
      }

      let opRole = await this.rolesRepository.findOne({ where: { name: 'operasional' } });
      if (!opRole) {
        opRole = this.rolesRepository.create({ name: 'operasional' });
        await this.rolesRepository.save(opRole);
        this.logger.log('Operasional role created');
      }

      // 2. Buat Admin User jika belum ada
      const adminEmail = 'admin@example.com'; // <-- Ganti jika perlu
      const adminUser = await this.usersRepository.findOne({ where: { email: adminEmail } });

      if (!adminUser) {
        const newAdmin = this.usersRepository.create({
          username: 'Admin Bosowa',
          email: adminEmail,
          password: 'password123', // <-- Ganti ini dengan password yang kuat
          role: adminRole, // Assign role admin
        });
        
        // Ingat: Entity 'user.entity.ts' kita punya hook @BeforeInsert
        // yang akan otomatis HASH password 'password123' ini sebelum disimpan.
        await this.usersRepository.save(newAdmin);
        this.logger.log('Admin user created successfully');
      }
      // 3. TAMBAHKAN INI: Buat Operasional User jika belum ada
      const opEmail = 'op@example.com'; // <-- Ganti jika perlu
      const opUser = await this.usersRepository.findOne({ where: { email: opEmail } });

      if (!opUser) {
        const newOp = this.usersRepository.create({
          username: 'Operasional Lapangan',
          email: opEmail,
          password: 'password123', // <-- Nanti ganti
          role: opRole, // Assign role operasional
        });
        await this.usersRepository.save(newOp);
        this.logger.log('Operasional user created successfully'); // <-- Pesan log baru
      }
    } catch (error) {
      this.logger.error('Failed to seed initial data', error);
    }
  }
  /**
   * Method baru untuk mencari user berdasarkan username
   * Kita pakai 'relations' untuk otomatis mengambil data 'role'
   */
  async findOneByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['role'], // Ini akan join tabel 'roles'
    });
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'], // Tetap ambil role-nya
    });
  }
  async findOneById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'], // Kita juga ambil role-nya
    });
  }

  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  async findOneSafe(id: string) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return this.toSafeUser(user);
  }

  async createUser(createUserDto: CreateUserDto) {
    await this.ensureUniqueEmail(createUserDto.email);
    await this.ensureUniqueUsername(createUserDto.username);
    const role = await this.getRoleOrFail(createUserDto.role);

    const site =
      createUserDto.role === 'operasional'
        ? createUserDto.site
        : createUserDto.site ?? 'ALL';

    if (createUserDto.role === 'operasional' && (!site || site === 'ALL')) {
      throw new BadRequestException(
        'User operasional harus terikat lokasi spesifik',
      );
    }

    const newUser = this.usersRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      password: createUserDto.password,
      site: site ?? 'ALL',
      role,
    });

    const saved = await this.usersRepository.save(newUser);
    return this.toSafeUser(saved);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (
      updateUserDto.email &&
      updateUserDto.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      await this.ensureUniqueEmail(updateUserDto.email);
      user.email = updateUserDto.email;
    }

    if (
      updateUserDto.username &&
      updateUserDto.username.toLowerCase() !== user.username.toLowerCase()
    ) {
      await this.ensureUniqueUsername(updateUserDto.username);
      user.username = updateUserDto.username;
    }

    if (updateUserDto.role) {
      user.role = await this.getRoleOrFail(updateUserDto.role);
    }

    if (typeof updateUserDto.site !== 'undefined') {
      user.site = updateUserDto.site;
    }

    if (
      user.role?.name === 'operasional' &&
      (!user.site || user.site === 'ALL')
    ) {
      throw new BadRequestException(
        'User operasional harus terikat lokasi spesifik',
      );
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.usersRepository.save(user);
    return this.toSafeUser(updated);
  }

  async removeUser(id: string) {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return { success: true };
  }

  private async ensureUniqueEmail(email: string) {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email sudah digunakan');
    }
  }

  private async ensureUniqueUsername(username: string) {
    const existing = await this.usersRepository.findOne({ where: { username } });
    if (existing) {
      throw new BadRequestException('Username sudah digunakan');
    }
  }

  private async getRoleOrFail(roleName: 'admin' | 'operasional') {
    const role = await this.rolesRepository.findOne({ where: { name: roleName } });
    if (!role) {
      throw new BadRequestException(`Role ${roleName} belum tersedia`);
    }
    return role;
  }

  private toSafeUser(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      site: user.site,
      role: user.role?.name,
      createdAt: user.createdAt,
    };
  }
}

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Beritahu Passport untuk pakai 'email' sebagai usernameField
    super({
      usernameField: 'email',
    });
  }

  // Parameter pertama 'username' sekarang akan otomatis diisi
  // oleh nilai 'email' dari body request
  async validate(email: string, password: string): Promise<any> { // <-- Ganti 'username'
    const user = await this.authService.validateUser(email, password); // <-- Ganti 'username'
    if (!user) {
      // Ganti juga pesan errornya
      throw new UnauthorizedException('Email atau password salah');
    }
    return user;
  }
}
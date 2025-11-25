import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  const createContext = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const result = guard.canActivate(createContext('admin'));
    expect(result).toBe(true);
  });

  it('allows access when role matches requirement', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    const result = guard.canActivate(createContext('admin'));
    expect(result).toBe(true);
  });

  it('denies access when role missing', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    const result = guard.canActivate(createContext('operasional'));
    expect(result).toBe(false);
  });
});

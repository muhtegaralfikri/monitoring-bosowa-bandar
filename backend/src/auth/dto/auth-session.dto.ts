export interface AuthenticatedUserDto {
  id: string;
  username: string;
  email: string;
  role: string;
  site?: string | null;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedUserDto;
}

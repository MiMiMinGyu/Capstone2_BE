import { JwtUser } from './jwt-user.interface';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse extends TokenPair {
  user: JwtUser;
}

export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

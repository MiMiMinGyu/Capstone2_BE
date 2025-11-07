export interface JwtUser {
  id: string;
  username: string;
  name: string | null;
  email: string;
  created_at: Date | null;
}

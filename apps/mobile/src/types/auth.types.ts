export interface User {
  id: string;
  email: string;
  role: 'service-user' | 'system-staff';
  token: string;
  fullName?: string;
  phone?: string;
  isVerified?: boolean;
  avatarUrl?: string | null;
}
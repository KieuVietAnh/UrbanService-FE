export interface User {
  id: string;
  email: string;
  role: 'service-user' | 'system-staff';
  token: string;
}
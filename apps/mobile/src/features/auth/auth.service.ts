import { User } from '@/types/auth.types';

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock users
    if (email === 'resident@urbanmind.vn' && password === '123456') {
      return {
        id: '1',
        email: 'resident@urbanmind.vn',
        role: 'service-user',
        token: 'mock-resident-token',
      };
    }

    if (email === 'staff@urbanmind.vn' && password === '123456') {
      return {
        id: '2',
        email: 'staff@urbanmind.vn',
        role: 'system-staff',
        token: 'mock-staff-token',
      };
    }

    throw new Error('Invalid credentials');
  }

  // TODO: Add other auth methods like register, logout, etc.
}
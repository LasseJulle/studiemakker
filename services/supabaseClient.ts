

// This is a simplified mock of the Supabase client to avoid needing real credentials.
// It mimics the structure of the actual Supabase JS v2 library.
import { User } from '../types';

// FIX: Added missing properties `display_name` and `is_premium` to match the `User` type.
const MOCK_USER: User = {
  id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  email: 'bruger@eksempel.dk',
  display_name: 'Test Bruger',
  is_premium: false,
};

const mockAuth = {
  signUp: async ({ email, password }: { email?: string; password?: string }) => {
    console.log(`Simulating signup for ${email}`);
    if (!email || !password) {
      return { data: null, error: { message: 'Email og adgangskode er påkrævet.' } };
    }
    await new Promise(res => setTimeout(res, 500));
    return { data: { user: MOCK_USER, session: {} }, error: null };
  },
  signInWithPassword: async ({ email, password }: { email?: string; password?: string }) => {
    console.log(`Simulating signin for ${email}`);
    if (!email || !password || password !== 'password123') {
       return { data: null, error: { message: 'Ugyldig email eller adgangskode.' } };
    }
    await new Promise(res => setTimeout(res, 500));
    return { data: { user: MOCK_USER, session: {} }, error: null };
  },
  signOut: async () => {
    console.log('Simulating signout');
    await new Promise(res => setTimeout(res, 200));
    return { error: null };
  },
  getSession: () => {
    // In this mock, we always start logged out.
    return null;
  }
};

export const supabase = {
  auth: mockAuth,
};
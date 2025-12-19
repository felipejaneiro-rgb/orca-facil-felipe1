
import { supabase } from '../lib/supabase';
import { User } from '../types';

export const authService = {
  
  // Transforma o usuário do Supabase no formato interno do App
  mapSupabaseUser: (sbUser: any): User => {
    return {
      id: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || 'Usuário',
      email: sbUser.email || '',
      document: sbUser.user_metadata?.document || '',
      whatsapp: sbUser.user_metadata?.phone || '',
      website: sbUser.user_metadata?.website || '',
      passwordHash: '',
      createdAt: sbUser.created_at
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return authService.mapSupabaseUser(session.user);
  },

  loginWithGoogle: async () => {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    if (error) throw error;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return authService.mapSupabaseUser(data.user);
  },

  /**
   * Registro aprimorado que retorna sessão se disponível
   */
  register: async (userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          full_name: userData.name
        }
      }
    });
    if (error) throw error;
    return data; // Retorna { user, session }
  }
};

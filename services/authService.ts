
import { supabase } from '../lib/supabase';
import { User } from '../types';

export const authService = {
  
  // Transforma o usuário do Supabase no formato interno do App
  mapSupabaseUser: (sbUser: any): User => {
    return {
      id: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || 'Usuário Google',
      email: sbUser.email || '',
      document: sbUser.user_metadata?.document || '', // Campos adicionais podem ser vindo do profile/metadata
      whatsapp: sbUser.user_metadata?.phone || '',
      website: sbUser.user_metadata?.website || '',
      passwordHash: '', // Não usado com OAuth
      createdAt: sbUser.created_at
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return authService.mapSupabaseUser(session.user);
  },

  loginWithGoogle: async () => {
    // Definimos a URL de redirecionamento explicitamente. 
    // Em alguns sandboxes, window.location.origin pode não ser suficiente.
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

  // Added updatePassword method to fix the error in CompanySettingsModal
  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  // Mantido para compatibilidade com login manual via email se necessário no futuro
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return authService.mapSupabaseUser(data.user);
  },

  register: async (userData: any): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          document: userData.document,
          phone: userData.whatsapp,
          website: userData.website
        }
      }
    });
    if (error) throw error;
    return authService.mapSupabaseUser(data.user);
  }
};

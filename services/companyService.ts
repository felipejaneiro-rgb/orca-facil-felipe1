
import { supabase } from '../lib/supabase';
import { CompanyProfile } from '../types';

export const companyService = {
  /**
   * Busca a empresa vinculada ao usuário logado pelo owner_id
   */
  getCompany: async (userId: string): Promise<CompanyProfile | null> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle(); // maybeSingle não gera erro se não encontrar nada

    if (error) {
      console.error("Erro ao buscar empresa:", error);
      throw error;
    }

    return data;
  },

  /**
   * Insere o perfil da empresa no Supabase.
   * Forçamos o uso do ID da sessão atual para garantir compatibilidade com RLS.
   */
  createCompany: async (userId: string, profile: CompanyProfile): Promise<CompanyProfile> => {
    // Verificação extra: garantir que o usuário está realmente autenticado no cliente
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Sessão expirada ou usuário não autenticado.");
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([
        { 
          owner_id: user.id, // Usamos o ID vindo direto da sessão validada
          razao_social: profile.razao_social,
          nome_fantasia: profile.nome_fantasia,
          cnpj: profile.cnpj,
          email: profile.email,
          telefone: profile.telefone,
          endereco: profile.endereco,
          brand_color: profile.brand_color || '#2563eb',
          tipo_empresa: profile.tipo_empresa
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro RLS/Database (createCompany):", error);
      if (error.code === '42501') {
        throw new Error("Erro de permissão (RLS). Verifique as políticas no Supabase.");
      }
      throw new Error(error.message || "Erro ao salvar dados da empresa.");
    }

    return data;
  }
};

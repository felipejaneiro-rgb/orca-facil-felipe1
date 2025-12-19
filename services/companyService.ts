
import { supabase } from '../lib/supabase';
import { CompanyProfile } from '../types';

export const companyService = {
  /**
   * Busca a empresa vinculada ao usuário logado pelo owner_id.
   * Modificado para ser uma função pura de busca no banco.
   */
  getCompany: async (userId: string): Promise<CompanyProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (e: any) {
      console.warn("Erro ao buscar empresa no Supabase:", e.message);
      throw e; 
    }
  },

  /**
   * Insere o perfil da empresa no Supabase.
   */
  createCompany: async (userId: string, profile: CompanyProfile): Promise<CompanyProfile> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Sessão inválida para cadastro.");
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([
        { 
          owner_id: user.id,
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
      console.error("Erro ao criar empresa:", error);
      throw new Error(error.message || "Erro ao salvar perfil.");
    }

    return data;
  }
};

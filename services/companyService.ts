
import { supabase } from '../lib/supabase';
import { CompanyProfile } from '../types';

export const companyService = {
  /**
   * Busca a empresa vinculada ao usuário logado pelo owner_id.
   * Removido o timeout manual para permitir que a rede opere em seu tempo natural.
   */
  getCompany: async (userId: string): Promise<CompanyProfile | null> => {
    try {
      const { data, error }: any = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) {
        console.error("Erro Supabase (getCompany):", error);
        return null; 
      }

      return data;
    } catch (e) {
      console.warn("Erro ao buscar dados da empresa:", e);
      return null;
    }
  },

  /**
   * Insere o perfil da empresa no Supabase.
   */
  createCompany: async (userId: string, profile: CompanyProfile): Promise<CompanyProfile> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Sessão inválida. Por favor, tente fazer login novamente.");
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
      console.error("Erro Supabase (createCompany):", error);
      throw new Error(error.message || "Não foi possível salvar os dados da empresa.");
    }

    return data;
  }
};

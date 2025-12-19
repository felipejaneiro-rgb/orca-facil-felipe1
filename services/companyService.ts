
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
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Erro ao buscar empresa:", error);
      throw error;
    }

    return data;
  },

  /**
   * Insere o perfil da empresa no Supabase.
   * O RLS do banco deve permitir INSERT se auth.uid() == owner_id.
   */
  createCompany: async (userId: string, profile: CompanyProfile): Promise<CompanyProfile> => {
    const { data, error } = await supabase
      .from('companies')
      .insert([
        { 
          owner_id: userId,
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
      // Tratamento de erro específico para duplicidade ou violação de RLS
      console.error("Erro Supabase (createCompany):", error);
      throw new Error(error.message || "Erro ao salvar dados da empresa.");
    }

    return data;
  }
};

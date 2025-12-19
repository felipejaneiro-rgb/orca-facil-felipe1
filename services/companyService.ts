
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
      .maybeSingle(); 

    if (error) {
      console.error("Erro ao buscar empresa:", error);
      throw error;
    }

    return data;
  },

  /**
   * Insere o perfil da empresa no Supabase.
   * Usamos auth.getUser() no momento do clique para garantir o ID mais recente.
   */
  createCompany: async (userId: string, profile: CompanyProfile): Promise<CompanyProfile> => {
    // Busca o usuário da sessão atual para garantir que não há discrepância de ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Sessão inválida. Por favor, faça login novamente.");
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([
        { 
          owner_id: user.id, // UID real vindo da sessão do Supabase
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
      
      // Se cair aqui com erro de RLS mesmo após o SQL, o erro 42501 é o código padrão
      if (error.code === '42501') {
        throw new Error("Erro de permissão (RLS). Certifique-se de executar as políticas de SELECT e INSERT no SQL Editor do Supabase.");
      }
      
      throw new Error(error.message || "Erro ao salvar dados da empresa.");
    }

    return data;
  }
};

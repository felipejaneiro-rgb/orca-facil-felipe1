
import { supabase } from '../lib/supabase';
import { CompanyProfile } from '../types';

export const companyService = {
  /**
   * Busca a empresa vinculada ao usuário logado pelo owner_id.
   * Modificado para tratar erros de rede sem assumir que a empresa não existe.
   */
  getCompany: async (userId: string): Promise<CompanyProfile | null> => {
    try {
      // Pequeno atraso para garantir que o Supabase está pronto para a query
      await new Promise(r => setTimeout(r, 200));

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) {
        // Se houve erro de rede/timeout, lançamos para o catch
        throw error;
      }

      // Se data for null, significa que a query rodou mas não achou nada (Onboarding necessário)
      return data;
    } catch (e: any) {
      console.warn("Falha na comunicação com o banco:", e.message);
      // Lança o erro para que o App.tsx possa decidir se tenta novamente 
      // ou se mantém o usuário no Dashboard com dados locais se houver.
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

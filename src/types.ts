export interface CompanyData {
  empresa: {
    nome_oficial: string;
    nif_cnpj: string;
    morada_sede: string;
    dimensao_estimada: string;
    faturacao_estimada: string;
    gps?: [number, number];
  };
  qualificacao_eplan: {
    setor_principal: string;
    especializacao_vertical: string;
    disciplinas_identificadas: string[];
    score_de_fit_eplan: "Alto" | "Médio" | "Baixo";
    volume_projetos_anual: string;
    complexidade_projetos: string;
    estrutura_equipa_engenharia: string;
    maturidade_workflow: string;
    integracao_digital: string;
    capacidade_fabrico_automacao: string;
    presenca_cadeia_valor: string;
    pain_points_detetados: string[];
  };
  colaboradores_decisores: {
    nome: string;
    cargo: string;
    departamento: string;
    linkedin_url?: string;
  }[];
  compliance_e_risco: {
    nivel_risco_kyb: "Baixo" | "Médio" | "Alto";
    alerta_rgpd: string;
    prazo_retencao_recomendado: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

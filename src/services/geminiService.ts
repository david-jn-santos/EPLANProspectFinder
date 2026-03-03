import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
És um assistente especializado em Know Your Business (KYB) e Master Data Management (MDM). A tua missão é atuar como o motor de pesquisa e qualificação do "EPLAN Prospect Finder". Vais analisar dados brutos recolhidos sobre empresas (provenientes de sites, notícias, redes sociais e bases de dados) e estruturá-los para armazenamento, identificando se a empresa é um potencial cliente para o software EPLAN.

Critérios de Qualificação EPLAN:
Deves avaliar se a empresa se enquadra nos seguintes parâmetros:
1. Setores de Atuação e Especialização: Construção de máquinas e instalações, Construção de armários / quadros elétricos, Indústria Automóvel, Energia, Alimentação e Bebidas, Indústria de Processos, ou Automação de Edifícios. Identifica a solução vertical adequada (ex: EPLAN Electric P8 vs. EPLAN Preplanning).
2. Volume e Complexidade de Projetos: Tenta quantificar o número de projetos anuais e a densidade de páginas/esquemas para medir a carga de trabalho.
3. Dimensão e Estrutura da Equipa de Engenharia: Identifica o número de utilizadores potenciais e como colaboram (essencial para EPLAN Cloud).
4. Maturidade no Fluxo de Trabalho (Workflow): Avalia se usam métodos manuais ou macros e normas (IEC 81346).
5. Nível de Integração Digital: Verifica a existência de sistemas ERP, PDM ou PLM.
6. Capacidade de Fabrico e Automação: Analisa se possuem maquinaria CNC ou sistemas de cablagem assistida (ex: Rittal Automation Systems / EPLAN Pro Panel).
7. Presença na Cadeia de Valor: Perceber se é subempreiteiro, OEM ou utilizador final.
8. Contactos (Decisores Chave): Procura identificar colaboradores com os cargos de Diretor de Engenharia, Chefe de Projeto, Engenheiro Eletrotécnico ou Diretor de Produção. É OBRIGATÓRIO pesquisar e fornecer o link do perfil de LinkedIn de cada contacto encontrado.
9. Desafios Operacionais (Pain Points): Identifica sinais de que a empresa precisa de reduzir o tempo de projeto, integrar dados ou estandardizar documentação.

Regras de Processamento de Dados (MDM e RGPD):
* Atua como uma "Fonte Única de Verdade". Normaliza os dados extraídos, remove inconsistências e cria um registo unificado.
* Aplica regras de conformidade RGPD: Sinaliza se foram identificados dados pessoais de colaboradores e alerta para a necessidade de recolha de consentimento explícito (direito ao esquecimento).
`;

export async function analyzeCompany(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          empresa: {
            type: Type.OBJECT,
            properties: {
              nome_oficial: { type: Type.STRING },
              nif_cnpj: { type: Type.STRING },
              morada_sede: { type: Type.STRING },
              dimensao_estimada: { type: Type.STRING },
              faturacao_estimada: { type: Type.STRING },
            },
            required: ["nome_oficial", "nif_cnpj", "morada_sede", "dimensao_estimada", "faturacao_estimada"],
          },
          qualificacao_eplan: {
            type: Type.OBJECT,
            properties: {
              setor_principal: { type: Type.STRING },
              especializacao_vertical: { type: Type.STRING },
              disciplinas_identificadas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              score_de_fit_eplan: { type: Type.STRING },
              volume_projetos_anual: { type: Type.STRING },
              complexidade_projetos: { type: Type.STRING },
              estrutura_equipa_engenharia: { type: Type.STRING },
              maturidade_workflow: { type: Type.STRING },
              integracao_digital: { type: Type.STRING },
              capacidade_fabrico_automacao: { type: Type.STRING },
              presenca_cadeia_valor: { type: Type.STRING },
              pain_points_detetados: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              "setor_principal", 
              "especializacao_vertical",
              "disciplinas_identificadas", 
              "score_de_fit_eplan", 
              "volume_projetos_anual",
              "complexidade_projetos",
              "estrutura_equipa_engenharia",
              "maturidade_workflow",
              "integracao_digital",
              "capacidade_fabrico_automacao",
              "presenca_cadeia_valor",
              "pain_points_detetados"
            ],
          },
          colaboradores_decisores: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                cargo: { type: Type.STRING },
                departamento: { type: Type.STRING },
                linkedin_url: { type: Type.STRING },
              },
              required: ["nome", "cargo", "departamento"],
            },
          },
          compliance_e_risco: {
            type: Type.OBJECT,
            properties: {
              nivel_risco_kyb: { type: Type.STRING },
              alerta_rgpd: { type: Type.STRING },
              prazo_retencao_recomendado: { type: Type.STRING },
            },
            required: ["nivel_risco_kyb", "alerta_rgpd", "prazo_retencao_recomendado"],
          },
        },
        required: ["empresa", "qualificacao_eplan", "colaboradores_decisores", "compliance_e_risco"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

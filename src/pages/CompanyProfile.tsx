import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Share2, MoreVertical, Factory, MapPin, Zap, AlertTriangle, CloudOff, Cloud, BarChart3, ShieldCheck, History, Edit, RefreshCw, Check, X, MessageSquare } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { cn } from "../lib/utils";
import { CompanyData } from "../types";
import { analyzeCompany } from "../services/geminiService";

export function CompanyProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("dados");
  const [data, setData] = useState<CompanyData | null>(location.state?.companyData || null);
  const [isLoading, setIsLoading] = useState(!location.state?.companyData);
  const [coords, setCoords] = useState<[number, number] | null>(data?.empresa?.gps || null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<CompanyData | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newData, setNewData] = useState<CompanyData | null>(null);

  const handleEditSave = async () => {
    if (!editFormData || !id) return;
    try {
      const response = await fetch(`/api/company/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.empresa.nome_oficial,
          nif: editFormData.empresa.nif_cnpj,
          sector: editFormData.qualificacao_eplan.setor_principal,
          size: editFormData.empresa.dimensao_estimada,
          location: editFormData.empresa.morada_sede,
          gps: editFormData.empresa.gps,
          fullData: editFormData
        })
      });
      if (response.ok) {
        setData(editFormData);
        setIsEditModalOpen(false);
      } else {
        alert("Erro ao guardar as alterações.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao guardar as alterações.");
    }
  };

  const handleUpdateFetch = async () => {
    if (!data) return;
    setIsUpdating(true);
    try {
      const result = await analyzeCompany(data.empresa.nome_oficial);
      setNewData(result);
      setIsUpdateModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao procurar novos dados.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateConfirm = async () => {
    if (!newData || !id) return;
    try {
      let newGps = newData.empresa.gps || coords;
      if (newData.empresa.morada_sede !== data?.empresa.morada_sede) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newData.empresa.morada_sede)}&limit=1`);
          const geoResults = await res.json();
          if (geoResults && geoResults.length > 0) {
            newGps = [parseFloat(geoResults[0].lat), parseFloat(geoResults[0].lon)];
            newData.empresa.gps = newGps;
          }
        } catch (e) {
          console.error("Geocoding failed during update", e);
        }
      }

      const response = await fetch(`/api/company/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newData.empresa.nome_oficial,
          nif: newData.empresa.nif_cnpj,
          sector: newData.qualificacao_eplan.setor_principal,
          size: newData.empresa.dimensao_estimada,
          location: newData.empresa.morada_sede,
          gps: newGps,
          fullData: newData
        })
      });
      if (response.ok) {
        setData(newData);
        if (newGps) setCoords(newGps);
        setIsUpdateModalOpen(false);
      } else {
        alert("Erro ao atualizar os dados.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar os dados.");
    }
  };

  useEffect(() => {
    if (!data && id) {
      fetch(`/api/company/${id}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.fullData) {
            // Ensure gps is merged into fullData if it exists at the root level
            if (resData.gps) {
              resData.fullData.empresa.gps = resData.gps;
            }
            setData(resData.fullData);
            if (resData.fullData.empresa.gps) {
              setCoords(resData.fullData.empresa.gps);
            }
          }
        })
        .catch(err => console.error("Failed to fetch company", err))
        .finally(() => setIsLoading(false));
    }
  }, [id, data]);

  // Geocoding effect
  useEffect(() => {
    if (data?.empresa.morada_sede && !coords) {
      const fetchCoords = async () => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.empresa.morada_sede)}&limit=1`);
          const results = await response.json();
          if (results && results.length > 0) {
            const newCoords: [number, number] = [parseFloat(results[0].lat), parseFloat(results[0].lon)];
            setCoords(newCoords);
            
            // Update data state
            const updatedData = { ...data };
            updatedData.empresa.gps = newCoords;
            setData(updatedData);

            // Save to database if we have an ID
            if (id) {
              fetch(`/api/company/${id}/gps`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gps: newCoords })
              }).catch(err => console.error("Failed to save GPS coordinates", err));
            }
          }
        } catch (error) {
          console.error("Geocoding failed", error);
        }
      };
      fetchCoords();
    }
  }, [data?.empresa.morada_sede, coords, id]);

  if (isLoading) {
    return (
      <div className="bg-background-dark min-h-screen flex items-center justify-center text-white">
        A carregar perfil da empresa...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-background-dark min-h-screen flex flex-col items-center justify-center text-white gap-4">
        <p>Empresa não encontrada.</p>
        <button onClick={() => navigate("/dashboard")} className="px-4 py-2 bg-primary rounded-lg">Voltar</button>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-primary/20">
        <div className="flex items-center p-4 justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">Perfil da Empresa</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setEditFormData(data); setIsEditModalOpen(true); }} className="p-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-full" title="Editar Dados">
              <Edit className="w-5 h-5" />
            </button>
            <button onClick={handleUpdateFetch} disabled={isUpdating} className="p-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-full" title="Atualizar Dados">
              <RefreshCw className={cn("w-5 h-5", isUpdating && "animate-spin")} />
            </button>
            <button className="p-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-full">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-full">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full pb-24">
        <section className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-primary to-background-dark flex items-center justify-center text-white shrink-0 shadow-lg overflow-hidden">
              <Factory className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{data.empresa.nome_oficial}</h2>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  data.compliance_e_risco.nivel_risco_kyb === "Baixo" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                  data.compliance_e_risco.nivel_risco_kyb === "Médio" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                )}>
                  Risco: {data.compliance_e_risco.nivel_risco_kyb} 
                </span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  Enquadramento EPLAN: {data.qualificacao_eplan.score_de_fit_eplan}
                </span>
              </div>
            </div>
            <div className="w-full md:w-auto flex gap-2 pt-2 md:pt-0">
            </div>
          </div>
        </section>

        <nav className="sticky top-[73px] z-10 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-primary/20 overflow-x-auto">
          <div className="flex px-4 gap-8">
            {["dados", "qualificacao", "localizacao", "decisores", "sinais", "insights"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  document.getElementById(tab)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={cn(
                  "flex flex-col items-center justify-center pb-3 pt-4 whitespace-nowrap transition-colors",
                  activeTab === tab
                    ? "border-b-4 border-primary text-primary"
                    : "text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary"
                )}
              >
                <span className="text-sm font-bold tracking-wide capitalize">
                  {tab === "dados" ? "Dados Comerciais" :
                   tab === "qualificacao" ? "Qualificação EPLAN" :
                   tab === "localizacao" ? "Localização" :
                   tab === "decisores" ? "Contactos" :
                   tab === "sinais" ? "Sinais Tecnológicos" : "Insights"}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 space-y-8 mt-4">
          <section id="dados" className="scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-primary w-6 h-6" />
              <h3 className="text-lg font-bold">Dados Comerciais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-primary/5 border border-slate-200 dark:border-primary/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Informação de Faturação</p>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Receita Anual: {data.empresa.faturacao_estimada}</p>
                  <p className="text-sm">NIF/CNPJ: {data.empresa.nif_cnpj}</p>
                  <p className="text-sm font-semibold">Capacidade: {data.empresa.dimensao_estimada}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-primary/5 border border-slate-200 dark:border-primary/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Sede</p>
                <div className="space-y-1">
                  <p className="text-sm">{data.empresa.morada_sede}</p>
                </div>
              </div>
            </div>
          </section>

          <section id="qualificacao" className="scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="text-primary w-6 h-6" />
              <h3 className="text-lg font-bold">Qualificação Estratégica EPLAN</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 space-y-4">
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Setor e Especialização</p>
                  <p className="text-sm">{data.qualificacao_eplan.especializacao_vertical}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Volume e Complexidade</p>
                  <p className="text-sm">{data.qualificacao_eplan.volume_projetos_anual} • {data.qualificacao_eplan.complexidade_projetos}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Equipa de Engenharia</p>
                  <p className="text-sm">{data.qualificacao_eplan.estrutura_equipa_engenharia}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Presença na Cadeia de Valor</p>
                  <p className="text-sm">{data.qualificacao_eplan.presenca_cadeia_valor}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 space-y-4">
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Maturidade de Workflow</p>
                  <p className="text-sm">{data.qualificacao_eplan.maturidade_workflow}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Integração Digital (ERP/PDM/PLM)</p>
                  <p className="text-sm">{data.qualificacao_eplan.integracao_digital}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase mb-1">Capacidade de Fabrico e Automação</p>
                  <p className="text-sm">{data.qualificacao_eplan.capacidade_fabrico_automacao}</p>
                </div>
              </div>
            </div>
          </section>

          <section id="localizacao" className="scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-primary w-6 h-6" />
              <h3 className="text-lg font-bold">Localização</h3>
            </div>
            <div className="aspect-video w-full rounded-xl bg-slate-100 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 overflow-hidden relative shadow-inner z-0">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(data.empresa.morada_sede)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="absolute inset-0"
                title="Localização da Empresa"
              ></iframe>
              <div className="absolute bottom-4 left-4 bg-background-light/90 dark:bg-background-dark/90 p-3 rounded-lg border border-slate-200 dark:border-primary/20 backdrop-blur-md shadow-lg z-10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Sede Confirmada</p>
                <p className="text-sm font-medium">{data.empresa.morada_sede}</p>
              </div>
            </div>
          </section>

          <section id="sinais" className="scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-primary w-6 h-6" />
              <h3 className="text-lg font-bold">Sinais Tecnológicos e Pontos de Dor</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {data.qualificacao_eplan.pain_points_detetados.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30">
                  <AlertTriangle className="text-orange-500 w-5 h-5" />
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400">{point}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="decisores" className="scroll-mt-36">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-primary w-6 h-6" />
              <h3 className="text-lg font-bold">Contactos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.colaboradores_decisores.map((decisor, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-100 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{decisor.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{decisor.cargo} • {decisor.departamento}</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/company/${id}/training`, { 
                      state: { 
                        companyData: data, 
                        contactName: decisor.nome, 
                        contactRole: decisor.cargo 
                      } 
                    })}
                    className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-2"
                    title="Treinar Abordagem Comercial"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">Treinar</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="insights" className="mt-12 border-t border-slate-200 dark:border-primary/20 pt-8 scroll-mt-36">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="text-green-500 w-6 h-6" />
                  <h4 className="text-md font-bold uppercase tracking-wider text-slate-500">CONFORMIDADE E RGPD</h4>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-primary/5 border border-dashed border-slate-300 dark:border-primary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Estado do Consentimento de Dados</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-bold">ATIVO</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{data.compliance_e_risco.alerta_rgpd}</p>
                  <p className="text-xs text-slate-500">{data.compliance_e_risco.prazo_retencao_recomendado}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="text-slate-500 w-6 h-6" />
                  <h4 className="text-md font-bold uppercase tracking-wider text-slate-500">HISTÓRICO DE VERSÕES</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3 text-xs">
                    <span className="font-mono text-primary whitespace-nowrap">v2.4.1</span>
                    <span className="text-slate-500 dark:text-slate-400">Perfil atualizado com dados de faturação por admin_sales</span>
                    <span className="text-slate-400 ml-auto whitespace-nowrap">há 2h</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Editar Dados da Empresa</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Oficial</label>
                <input type="text" value={editFormData.empresa.nome_oficial} onChange={e => setEditFormData({...editFormData, empresa: {...editFormData.empresa, nome_oficial: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIF / CNPJ</label>
                <input type="text" value={editFormData.empresa.nif_cnpj} onChange={e => setEditFormData({...editFormData, empresa: {...editFormData.empresa, nif_cnpj: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Morada Sede</label>
                <input type="text" value={editFormData.empresa.morada_sede} onChange={e => setEditFormData({...editFormData, empresa: {...editFormData.empresa, morada_sede: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setor Principal</label>
                <input type="text" value={editFormData.qualificacao_eplan.setor_principal} onChange={e => setEditFormData({...editFormData, qualificacao_eplan: {...editFormData.qualificacao_eplan, setor_principal: e.target.value}})} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Score de Fit EPLAN (0-100)</label>
                <input type="number" value={editFormData.qualificacao_eplan.score_de_fit_eplan} onChange={e => setEditFormData({...editFormData, qualificacao_eplan: {...editFormData.qualificacao_eplan, score_de_fit_eplan: parseInt(e.target.value) || 0}})} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
              <button onClick={handleEditSave} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors">Guardar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {isUpdateModalOpen && newData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Atualização de Dados</h2>
            <p className="text-sm text-slate-500 mb-6">Reveja as diferenças encontradas antes de guardar.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase">
                <div>Campo</div>
                <div>Atual</div>
                <div>Novo</div>
              </div>
              
              {[
                { label: "Nome", old: data.empresa.nome_oficial, new: newData.empresa.nome_oficial },
                { label: "NIF", old: data.empresa.nif_cnpj, new: newData.empresa.nif_cnpj },
                { label: "Morada", old: data.empresa.morada_sede, new: newData.empresa.morada_sede },
                { label: "Setor", old: data.qualificacao_eplan.setor_principal, new: newData.qualificacao_eplan.setor_principal },
                { label: "Fit Score", old: data.qualificacao_eplan.score_de_fit_eplan.toString(), new: newData.qualificacao_eplan.score_de_fit_eplan.toString() },
                { label: "Dimensão", old: data.empresa.dimensao_estimada, new: newData.empresa.dimensao_estimada },
              ].map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-4 py-2 border-b border-slate-100 dark:border-slate-800/50 items-center">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</div>
                  <div className={cn("text-sm", item.old !== item.new ? "text-red-500 line-through opacity-70" : "text-slate-500")}>{item.old}</div>
                  <div className={cn("text-sm font-medium", item.old !== item.new ? "text-green-500" : "text-slate-500")}>{item.new}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsUpdateModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
              <button onClick={handleUpdateConfirm} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors">Confirmar Atualização</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

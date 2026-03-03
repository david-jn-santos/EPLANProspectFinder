import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, UserCircle, SlidersHorizontal, ChevronDown, Bookmark, MapPin, Factory, Zap, Settings, Bot, Loader2, Trash2, Check, X, LogOut } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { analyzeCompany } from "../services/geminiService";
import { CompanyData } from "../types";

const MOCK_COMPANIES = [
  {
    id: "1",
    name: "TechMotive Solutions GmbH",
    nif: "DE123456789",
    sector: "Automotive",
    size: "50-250 Emp.",
    location: "Stuttgart, Germany",
    icon: <Factory className="text-primary w-8 h-8" />
  },
  {
    id: "2",
    name: "Energize Systems Int.",
    nif: "GB987654321",
    sector: "Energy",
    size: "250+ Emp.",
    location: "London, UK",
    icon: <Zap className="text-primary w-8 h-8" />
  },
  {
    id: "3",
    name: "PanelBuild Pro Ltd.",
    nif: "ES445566778",
    sector: "Cabinets",
    size: "< 50 Emp.",
    location: "Barcelona, Spain",
    icon: <Settings className="text-primary w-8 h-8" />
  }
];

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [pendingCompany, setPendingCompany] = useState<any | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  
  // Filters state
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("Qualquer dimensão");
  const [locationFilter, setLocationFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      navigate("/");
      return;
    }
    
    fetch(`/api/companies/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map(c => ({
            id: c.id,
            name: c.name,
            nif: c.nif,
            sector: c.sector,
            size: c.size,
            location: c.location,
            icon: <Factory className="text-primary w-8 h-8" />,
            fullData: c.fullData
          }));
          setCompanies(formatted);
        }
      })
      .catch(err => console.error("Failed to fetch companies", err));
  }, [user.id, navigate]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsAnalyzing(true);
    try {
      const result: CompanyData = await analyzeCompany(aiPrompt);
      
      let gpsCoords: [number, number] | null = null;
      if (result.empresa.morada_sede) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(result.empresa.morada_sede)}&limit=1`);
          const geoResults = await response.json();
          if (geoResults && geoResults.length > 0) {
            gpsCoords = [parseFloat(geoResults[0].lat), parseFloat(geoResults[0].lon)];
            result.empresa.gps = gpsCoords;
          }
        } catch (error) {
          console.error("Geocoding failed during analysis", error);
        }
      }

      const newCompanyId = Date.now().toString();
      const newCompany = {
        id: newCompanyId,
        name: result.empresa.nome_oficial,
        nif: result.empresa.nif_cnpj,
        sector: result.qualificacao_eplan.setor_principal,
        size: result.empresa.dimensao_estimada,
        location: result.empresa.morada_sede,
        gps: gpsCoords,
        icon: <Factory className="text-primary w-8 h-8" />,
        fullData: result
      };

      setPendingCompany(newCompany);
      setAiPrompt("");
    } catch (error) {
      console.error("Failed to analyze company:", error);
      alert("Erro ao analisar a empresa. Verifique a consola para mais detalhes.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confirmSaveCompany = async () => {
    if (!pendingCompany) return;
    
    try {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          companyId: pendingCompany.id,
          name: pendingCompany.name,
          nif: pendingCompany.nif,
          sector: pendingCompany.sector,
          size: pendingCompany.size,
          location: pendingCompany.location,
          gps: pendingCompany.gps,
          fullData: pendingCompany.fullData
        })
      });

      setCompanies([pendingCompany, ...companies]);
      setPendingCompany(null);
    } catch (error) {
      console.error("Failed to save company:", error);
      alert("Erro ao guardar a empresa.");
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    try {
      await fetch(`/api/company/${companyToDelete}`, { method: "DELETE" });
      setCompanies(companies.filter(c => c.id !== companyToDelete));
      setCompanyToDelete(null);
    } catch (error) {
      console.error("Failed to delete company:", error);
      alert("Erro ao eliminar a empresa.");
    }
  };

  const handleCompanyClick = (company: any) => {
    navigate(`/company/${company.id}`, { state: { companyData: company.fullData } });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSector(null);
    setSelectedSize("Qualquer dimensão");
    setLocationFilter("");
    setVisibleCount(6);
  };

  const filteredCompanies = companies.filter(company => {
    // Search query filter
    const matchesSearch = 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      company.nif.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Sector filter
    const matchesSector = !selectedSector || company.sector.toLowerCase().includes(selectedSector.toLowerCase());
    
    // Size filter
    let matchesSize = true;
    if (selectedSize !== "Qualquer dimensão") {
      const sizeStr = company.size.toLowerCase();
      if (selectedSize === "Até 50 funcionários") {
        matchesSize = sizeStr.includes("1-10") || sizeStr.includes("11-50") || sizeStr.includes("micro") || sizeStr.includes("pequena");
      } else if (selectedSize === "Até 250 funcionários") {
        matchesSize = sizeStr.includes("51-200") || sizeStr.includes("51-250") || sizeStr.includes("média");
      } else if (selectedSize === "+250 funcionários") {
        matchesSize = sizeStr.includes("201-500") || sizeStr.includes("501-1000") || sizeStr.includes("1000+") || sizeStr.includes("grande");
      }
    }
    
    // Location filter
    const matchesLocation = !locationFilter || company.location.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesSector && matchesSize && matchesLocation;
  });

  const visibleCompanies = filteredCompanies.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCompanies.length;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center p-4 justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center">
              <Search className="text-white w-6 h-6" />
            </div>
            <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">
              EPLAN <span className="text-primary">Prospect Finder</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center justify-center rounded-full w-10 h-10 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <Link to="/profile" className="flex items-center justify-center rounded-full w-10 h-10 bg-slate-200 dark:bg-primary/20 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-primary/30 hover:bg-slate-300 dark:hover:bg-primary/30 transition-colors">
              <UserCircle className="w-6 h-6" />
            </Link>
            <button 
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="flex items-center justify-center rounded-full w-10 h-10 bg-red-100 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 space-y-6 pb-24">
        {pendingCompany && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">Validar Dados Extraídos</h2>
              <div className="space-y-3 mb-6 text-sm text-slate-700 dark:text-slate-300">
                <p><strong className="text-slate-900 dark:text-slate-100">Empresa:</strong> {pendingCompany.name}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">NIF:</strong> {pendingCompany.nif}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Setor/Especialização:</strong> {pendingCompany.fullData.qualificacao_eplan.especializacao_vertical}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Score de Fit:</strong> {pendingCompany.fullData.qualificacao_eplan.score_de_fit_eplan}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Cadeia de Valor:</strong> {pendingCompany.fullData.qualificacao_eplan.presenca_cadeia_valor}</p>
                <p><strong className="text-slate-900 dark:text-slate-100">Risco KYB:</strong> {pendingCompany.fullData.compliance_e_risco.nivel_risco_kyb}</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setPendingCompany(null)} 
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                  <X className="w-4 h-4" /> Descartar
                </button>
                <button 
                  onClick={confirmSaveCompany} 
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                >
                  <Check className="w-4 h-4" /> Confirmar e Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {companyToDelete && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <Trash2 className="w-6 h-6" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Eliminar Empresa</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Tem a certeza que deseja eliminar esta empresa? Esta ação não pode ser desfeita e os dados serão removidos permanentemente.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setCompanyToDelete(null)} 
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteCompany} 
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-4">
          {/* AI Search Box */}
          <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-4">
            <h3 className="text-primary font-bold flex items-center gap-2 mb-3">
              <Bot className="w-5 h-5" /> Assistente AI (KYB & MDM)
            </h3>
            <form onSubmit={handleAiSearch} className="flex flex-col gap-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Analisa a empresa fictícia 'TechMachines PT', com o NIF 500123456. Encontrei notícias a dizer que faturaram 5 milhões..."
                className="w-full p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-primary/30 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 min-h-[100px] resize-y"
              />
              <button
                type="submit"
                disabled={isAnalyzing || !aiPrompt.trim()}
                className="self-end px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> A Analisar...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" /> Qualificar Prospecto
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-primary w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-primary/40"
              placeholder="Pesquisar por nome da empresa, NIF..."
            />
          </div>

          <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-primary font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filtros Avançados
              </h3>
              <button onClick={clearFilters} className="text-xs font-medium text-slate-500 hover:text-primary transition-colors">
                Limpar tudo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-primary/60">
                  Setor de Indústria
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Máquinas", "Automóvel", "Energia"].map(sector => (
                    <button 
                      key={sector}
                      onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedSector === sector 
                          ? "bg-primary text-white" 
                          : "bg-slate-100 dark:bg-primary/10 text-slate-700 dark:text-slate-300 hover:bg-primary/20"
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-primary/60">
                  Dimensão da Empresa
                </label>
                <select 
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-primary/10 border-none rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary p-2.5"
                >
                  <option>Qualquer dimensão</option>
                  <option>Até 50 funcionários</option>
                  <option>Até 250 funcionários</option>
                  <option>+250 funcionários</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-primary/60">
                  Região
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full pl-8 bg-slate-100 dark:bg-primary/10 border-none rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary p-2.5"
                    placeholder="ex: Baviera, Alemanha"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold">
              Resultados da Pesquisa <span className="text-slate-400 font-normal text-sm ml-2">({filteredCompanies.length} encontrados)</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Ordenar por:</span>
              <button className="text-xs font-bold text-primary flex items-center gap-1">
                Relevância <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleCompanies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company)}
                className="group bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompanyToDelete(company.id);
                    }}
                    className="text-slate-300 dark:text-primary/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <Bookmark className="text-slate-300 dark:text-primary/20 group-hover:text-primary transition-colors w-5 h-5" />
                </div>
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-primary/20 flex items-center justify-center shrink-0 border border-slate-200 dark:border-primary/30">
                    {company.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{company.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-primary/60 font-medium">NIF: {company.nif}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                        {company.sector}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-primary/10 text-slate-500 dark:text-slate-300 text-[10px] font-bold uppercase">
                        {company.size}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                    <MapPin className="w-4 h-4" /> {company.location}
                  </div>
                  <button className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Ver Detalhes <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-6">
              <button 
                onClick={() => setVisibleCount(prev => prev + 6)}
                className="px-6 py-2 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all text-sm"
              >
                Carregar mais resultados
              </button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

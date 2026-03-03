import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Briefcase, Eye, EyeOff, HelpCircle, Network } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      if (res.ok) {
        const userData = await res.json();
        login(userData);
        navigate("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 md:px-8 bg-black/50 backdrop-blur-md sticky top-0 z-50 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Network className="text-primary w-8 h-8" />
          <span className="text-xl font-bold tracking-tighter text-slate-100">
            EPLAN <span className="text-primary">PROSPECT FINDER</span>
          </span>
        </div>
        <div className="flex items-center">
          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
            <HelpCircle className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pb-20">
        <div className="w-full max-w-[480px] space-y-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight mb-2">
              Criar Nova Conta
            </h1>
            <p className="text-slate-400">Junte-se à maior rede de engenharia industrial.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="Insira o seu nome"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Email Profissional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="exemplo@empresa.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Cargo</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="" disabled>
                    Selecione o seu cargo
                  </option>
                  <option value="engineering_director">Engineering Director</option>
                  <option value="project_lead">Project Lead</option>
                  <option value="electrical_engineer">Electrical Engineer</option>
                  <option value="automation_specialist">Automation Specialist</option>
                  <option value="procurement">Procurement Manager</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-black"
                />
              </div>
              <label htmlFor="terms" className="text-sm text-slate-400 leading-tight">
                Aceito os <a href="#" className="text-primary hover:underline">Termos e Condições</a> e a <a href="#" className="text-primary hover:underline">Política de Privacidade (RGPD)</a>.
              </label>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4"
            >
              Registar
            </button>
          </form>

          <div className="text-center pt-4">
            <p className="text-slate-400">
              Já tem uma conta?{" "}
              <Link
                to="/"
                className="text-primary font-semibold hover:underline decoration-2 underline-offset-4"
              >
                Iniciar Sessão
              </Link>
            </p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 right-0 -z-10 opacity-20 pointer-events-none">
        <div className="w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>

      <footer className="p-6 text-center text-slate-600 text-xs uppercase tracking-widest border-t border-slate-900/50">
        © 2024 EPLAN Software & Service. Todos os direitos reservados.
      </footer>
    </div>
  );
}

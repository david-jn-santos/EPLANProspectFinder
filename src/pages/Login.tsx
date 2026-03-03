import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, Factory, HelpCircle, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      if (res.ok) {
        const userData = await res.json();
        login(userData);
        navigate("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display">
      <header className="flex items-center bg-transparent p-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1 rounded">
            <Factory className="text-white w-6 h-6" />
          </div>
          <h1 className="text-slate-100 text-sm font-bold tracking-widest uppercase">EPLAN</h1>
        </div>
        <div className="text-slate-400 hover:text-primary transition-colors cursor-pointer">
          <HelpCircle className="w-6 h-6" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-md mx-auto w-full">
        <div className="w-full mb-10 text-center relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 border border-primary/30 rounded-xl flex items-center justify-center bg-background-dark relative group">
              <div className="absolute inset-0 border border-primary/10 rounded-xl scale-125"></div>
              <Search className="text-primary w-8 h-8" />
            </div>
          </div>
          <h2 className="text-slate-100 tracking-tight text-3xl font-bold leading-tight mb-2">
            Bem-vindo ao Prospect Finder
          </h2>
          <div className="engineering-line mb-4"></div>
          <p className="text-slate-400 text-sm font-light leading-normal">
            Inicie sessão para aceder aos seus dados
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-5">
          <div className="space-y-1.5">
            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex w-full rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary border border-slate-800 bg-slate-900/50 focus:border-primary h-14 placeholder:text-slate-600 pl-12 pr-4 text-base font-normal transition-all"
                placeholder="exemplo@eplan.pt"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">
              Palavra-passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex w-full rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary border border-slate-800 bg-slate-900/50 focus:border-primary h-14 placeholder:text-slate-600 pl-12 pr-4 text-base font-normal transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <Link
              to="/register"
              className="text-slate-400 hover:text-primary text-xs font-medium transition-colors"
            >
              Criar conta
            </Link>
            <Link
              to="/forgot-password"
              className="text-slate-400 hover:text-primary text-xs font-medium transition-colors"
            >
              Esqueceu-se da palavra-passe?
            </Link>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
          >
            <span>Entrar</span>
            <LogIn className="w-5 h-5" />
          </button>
        </form>

        <footer className="mt-12 w-full text-center">
          <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] font-medium">
            © 2024 EPLAN SOFTWARE & SERVICE
          </p>
        </footer>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"></div>
    </div>
  );
}

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle2, Lock } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Reset password state (simulated flow)
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReset, setIsReset] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (res.ok) {
        setIsSent(true);
        // Simulate receiving a link and clicking it by showing the reset form after a delay
        setTimeout(() => setShowResetForm(true), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao solicitar recuperação.");
      }
    } catch (err) {
      setError("Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword })
      });
      
      if (res.ok) {
        setIsReset(true);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao repor palavra-passe.");
      }
    } catch (err) {
      setError("Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isReset) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark px-4 font-display">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <h2 className="text-slate-100 text-3xl font-bold">Palavra-passe reposta!</h2>
          <p className="text-slate-400">A sua palavra-passe foi atualizada com sucesso. Já pode iniciar sessão.</p>
          <Link
            to="/"
            className="block w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg transition-all"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display">
      <header className="flex items-center bg-transparent p-6">
        <Link to="/" className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar ao Login</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-md mx-auto w-full">
        {!showResetForm ? (
          <div className="w-full space-y-8">
            <div className="text-center">
              <h2 className="text-slate-100 tracking-tight text-3xl font-bold leading-tight mb-2">
                Recuperar Palavra-passe
              </h2>
              <p className="text-slate-400 text-sm font-light">
                Introduza o seu email para receber um link de recuperação.
              </p>
            </div>

            {isSent ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-green-500 font-medium">Email enviado com sucesso!</p>
                <p className="text-slate-400 text-xs">Verifique a sua caixa de entrada. (Simulando redirecionamento para o formulário de reset...)</p>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-6">
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

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? "A enviar..." : "Enviar Link"}
                  <Send className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="w-full space-y-8">
            <div className="text-center">
              <h2 className="text-slate-100 tracking-tight text-3xl font-bold leading-tight mb-2">
                Nova Palavra-passe
              </h2>
              <p className="text-slate-400 text-sm font-light">
                Defina a sua nova palavra-passe de acesso.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">
                  Nova Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex w-full rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary border border-slate-800 bg-slate-900/50 focus:border-primary h-14 placeholder:text-slate-600 pl-12 pr-4 text-base font-normal transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider ml-1">
                  Confirmar Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex w-full rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary border border-slate-800 bg-slate-900/50 focus:border-primary h-14 placeholder:text-slate-600 pl-12 pr-4 text-base font-normal transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? "A processar..." : "Repor Palavra-passe"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

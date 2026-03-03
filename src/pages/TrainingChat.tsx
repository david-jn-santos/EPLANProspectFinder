import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, User, Bot, Loader2, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { CompanyData } from "../types";
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: "user" | "model";
  content: string;
}

const DISC_PROFILES = [
  {
    type: "Dominance (D)",
    description: "Direto, focado em resultados, impaciente, assertivo. Quer saber 'o quê' e 'quais os resultados'.",
    instructions: "Seja direto, focado em resultados, um pouco impaciente e muito assertivo. Vá direto ao ponto. Não gosta de perder tempo com detalhes técnicos excessivos se não mostrarem o ROI imediato. Responda de forma concisa e focada no negócio."
  },
  {
    type: "Influence (I)",
    description: "Comunicativo, entusiasta, focado em pessoas, otimista. Quer saber 'quem' e 'como afeta a equipa'.",
    instructions: "Seja muito comunicativo, entusiasta, focado nas pessoas e otimista. Gosta de conversar e de saber como as soluções vão afetar a equipa e melhorar o ambiente de trabalho. Use um tom amigável e expressivo."
  },
  {
    type: "Steadiness (S)",
    description: "Paciente, calmo, focado na segurança e estabilidade, bom ouvinte. Quer saber 'como' e 'quais as garantias'.",
    instructions: "Seja paciente, calmo, focado na segurança, estabilidade e previsibilidade. Mostre resistência a mudanças bruscas. Precisa de garantias e de saber passo a passo como as coisas vão funcionar. Use um tom tranquilizador e metódico."
  },
  {
    type: "Conscientiousness (C)",
    description: "Analítico, preciso, focado em detalhes e factos, sistemático. Quer saber 'porquê' e 'quais os dados'.",
    instructions: "Seja altamente analítico, preciso, focado em detalhes, factos e dados. Faça perguntas técnicas e exija provas. Não se deixa levar por emoções ou entusiasmo. Use um tom formal, objetivo e questionador."
  }
];

export function TrainingChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const data = location.state?.companyData as CompanyData;
  const contactName = location.state?.contactName as string;
  const contactRole = location.state?.contactRole as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [discProfile, setDiscProfile] = useState(DISC_PROFILES[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat and select random DISC profile
  useEffect(() => {
    if (!data || !contactName) {
      navigate(`/company/${id}`);
      return;
    }

    const randomProfile = DISC_PROFILES[Math.floor(Math.random() * DISC_PROFILES.length)];
    setDiscProfile(randomProfile);

    setMessages([
      {
        role: "model",
        content: `Olá, sou o ${contactName} (${contactRole}) da ${data.empresa.nome_oficial}. Em que posso ajudar?`
      }
    ]);
  }, [data, contactName, contactRole, id, navigate]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || "dummy_key_for_build"; // Replace with actual key handling if needed or rely on backend
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `
        Você é ${contactName}, ${contactRole} na empresa ${data.empresa.nome_oficial}.
        O seu perfil comportamental DISC é: ${discProfile.type}.
        Instruções de comportamento: ${discProfile.instructions}
        
        Contexto da sua empresa:
        - Setor: ${data.qualificacao_eplan.setor_principal}
        - Dores/Desafios atuais: ${data.qualificacao_eplan.pain_points_detetados.join(", ")}
        - Maturidade de Workflow: ${data.qualificacao_eplan.maturidade_workflow}
        - Integração Digital: ${data.qualificacao_eplan.integracao_digital}
        
        O utilizador é um comercial da EPLAN a tentar qualificar a sua empresa e vender soluções EPLAN.
        Responda sempre em Português de Portugal.
        Mantenha as respostas curtas e naturais, como numa conversa real.
        Incorpore as dores da empresa nas suas respostas quando fizer sentido, mas sempre através da lente do seu perfil DISC.
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      // Replay history
      for (const msg of messages) {
        if (msg.role === "user") {
           await chat.sendMessage({ message: msg.content });
        }
        // Note: The SDK manages history internally for new chats, but since we are creating a new chat instance per request here (stateless), 
        // we should ideally maintain the chat instance in a ref or state. 
        // For simplicity in this stateless approach, we will just send the full context in one message if we don't maintain the chat object.
      }
      
      // Better approach: maintain chat instance or send formatted history
      const historyContext = messages.map(m => `${m.role === 'user' ? 'Comercial' : contactName}: ${m.content}`).join('\n');
      const prompt = `Histórico da conversa:\n${historyContext}\n\nComercial: ${userMessage}\n\nResponda como ${contactName}:`;

      const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
              systemInstruction
          }
      });

      setMessages(prev => [...prev, { role: "model", content: response.text || "Desculpe, não consegui processar a resposta." }]);

    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => [...prev, { role: "model", content: "Ocorreu um erro na comunicação. Por favor, tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!data) return null;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-primary/20">
        <div className="flex items-center p-4 justify-between max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">Treino Comercial</h1>
              <p className="text-xs text-slate-500">{contactName} • {data.empresa.nome_oficial}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 flex flex-col">
        {/* DISC Profile Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 mb-6 flex gap-3 items-start">
          <Info className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">
              Perfil do Cliente: {discProfile.type}
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {discProfile.description}
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pb-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3 max-w-[85%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user" ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm",
                msg.role === "user" 
                  ? "bg-primary text-white rounded-tr-sm" 
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-slate-500">A escrever...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="sticky bottom-4 mt-auto">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva a sua mensagem..."
              className="w-full pl-4 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-full text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-lg"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

import { Search, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export function BottomNav() {
  const location = useLocation();

  return (
    <footer className="fixed bottom-0 w-full z-20">
      <div className="flex gap-2 border-t border-slate-200 dark:border-primary/30 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pb-6 pt-2 max-w-5xl mx-auto rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <Link
          to="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center justify-end gap-1 transition-colors",
            location.pathname === "/dashboard"
              ? "text-primary"
              : "text-slate-400 dark:text-slate-500 hover:text-primary"
          )}
        >
          <div className="flex h-8 items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-xs font-medium leading-normal tracking-wide">Pesquisa</p>
        </Link>
        <Link
          to="/profile"
          className={cn(
            "flex flex-1 flex-col items-center justify-end gap-1 transition-colors",
            location.pathname === "/profile"
              ? "text-primary"
              : "text-slate-400 dark:text-slate-500 hover:text-primary"
          )}
        >
          <div className="flex h-8 items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <p className="text-xs font-medium leading-normal tracking-wide">Perfil</p>
        </Link>
      </div>
    </footer>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";
import { PlanBadge } from "@/components/ui/PlanBadge";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string };

  const [plan, setPlan] = useState<string>("FREE");

  // Fetch async — não dispara o lint de setState-in-effect porque o
  // setPlan acontece dentro de uma promise callback (assíncrono).
  useEffect(() => {
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data?.subscription) {
          setPlan(data.data.subscription.plan);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex items-center h-16 px-6 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Breadcrumb espaço */}
      <div className="flex-1" />

      {/* Ações direita */}
      <div className="flex items-center gap-2">
        {/* Toggle tema — usa Tailwind dark: para evitar hydration mismatch
            sem precisar do estado `mounted`. O <html> recebe a classe
            `dark` via next-themes antes de qualquer paint. */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Alternar tema"
          suppressHydrationWarning
        >
          <Sun className="w-5 h-5 hidden dark:block" />
          <Moon className="w-5 h-5 block dark:hidden" />
        </button>

        {/* Badge do Plano */}
        <div className="hidden sm:block mr-2">
          <PlanBadge plan={plan} compact />
        </div>

        {/* Notificações */}
        <NotificationBell />

        {/* Separador */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Avatar e info do usuário */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">
              {user?.name ?? "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.role ?? "MEMBER"}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="w-5 h-5" />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

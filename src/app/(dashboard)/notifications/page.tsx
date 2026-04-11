"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/utils";
import { Bell, CheckCheck, ShoppingCart, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import type { NotificationType } from "@prisma/client";

const NOTIF_ICONS: Record<NotificationType, React.ElementType> = {
  NEW_SALE: ShoppingCart,
  LOW_STOCK: AlertTriangle,
  OUT_OF_STOCK: AlertCircle,
  INTEGRATION_ERROR: AlertCircle,
  SYSTEM: Info,
};
const NOTIF_COLORS: Record<NotificationType, string> = {
  NEW_SALE: "text-green-500 bg-green-100 dark:bg-green-900/30",
  LOW_STOCK: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
  OUT_OF_STOCK: "text-red-500 bg-red-100 dark:bg-red-900/30",
  INTEGRATION_ERROR: "text-red-500 bg-red-100 dark:bg-red-900/30",
  SYSTEM: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
};

async function fetchNotifications() {
  const res = await fetch("/api/notifications?limit=50");
  if (!res.ok) throw new Error("Erro");
  return res.json();
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => fetch("/api/notifications/read-all", { method: "PATCH" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Todas as notificações marcadas como lidas");
      queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: "PATCH" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.meta?.unreadCount ?? 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} não lida(s)</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 bg-card border border-border rounded-xl animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
          </div>
        ) : (
          notifications.map((n: { id: string; type: NotificationType; title: string; message: string; isRead: boolean; createdAt: string }) => {
            const Icon = NOTIF_ICONS[n.type] ?? Info;
            const colorClass = NOTIF_COLORS[n.type] ?? "text-gray-500 bg-gray-100";
            return (
              <div key={n.id}
                onClick={() => !n.isRead && markOneMutation.mutate(n.id)}
                className={`flex gap-3 p-4 rounded-xl border transition-all cursor-pointer ${n.isRead ? "bg-card border-border opacity-70" : "bg-card border-primary/20 shadow-sm hover:shadow-md"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 bg-primary rounded-full mt-1 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useNotificationStore } from "@/stores/notification.store";
import { useEffect } from "react";

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications?unread=true&limit=1");
  if (!res.ok) return 0;
  const data = await res.json();
  return data.meta?.unreadCount ?? 0;
}

export function NotificationBell() {
  const { unreadCount, setUnreadCount } = useNotificationStore();

  const { data } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000, // Polling a cada 30s
    staleTime: 15_000,
  });

  useEffect(() => {
    if (data !== undefined) setUnreadCount(data);
  }, [data, setUnreadCount]);

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Notificações"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-fade-in">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

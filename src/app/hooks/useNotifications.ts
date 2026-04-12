import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";

export type NotificationType =
  | "logbook"
  | "riset"
  | "komentar"
  | "cuti"
  | "deadline"
  | "pengumuman"
  | "dokumen";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  timeMs: number;
  read: boolean;
  link?: string;
}

function normalizeType(raw: string): NotificationType {
  switch (String(raw || "").toLowerCase()) {
    case "logbook":
      return "logbook";
    case "riset":
      return "riset";
    case "komentar":
      return "komentar";
    case "cuti":
      return "cuti";
    case "deadline":
      return "deadline";
    case "dokumen":
      return "dokumen";
    default:
      return "pengumuman";
  }
}

function formatRelativeTime(value?: string) {
  if (!value) return "Baru saja";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Baru saja";

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getLink(role: string | undefined, type: NotificationType) {
  if (role === "operator") {
    switch (type) {
      case "logbook":
        return "/operator/logbook";
      case "cuti":
        return "/operator/cuti";
      case "dokumen":
        return "/operator/surat";
      case "riset":
      case "deadline":
      case "komentar":
        return "/operator/progress-board";
      default:
        return "/operator/dashboard";
    }
  }

  if (role === "dosen") {
    switch (type) {
      case "logbook":
      case "komentar":
        return "/dosen/logbook";
      case "cuti":
        return "/dosen/dashboard";
      case "riset":
      case "deadline":
        return "/dosen/progress";
      case "dokumen":
        return "/dosen/sertifikat";
      default:
        return "/dosen/dashboard";
    }
  }

  switch (type) {
    case "logbook":
      return "/logbook";
    case "cuti":
      return "/leave";
    case "dokumen":
      return "/documents";
    case "riset":
    case "deadline":
    case "komentar":
      return "/research";
    default:
      return "/dashboard";
  }
}

function mapNotificationRows(rows: Array<any>, role?: string): AppNotification[] {
  return (rows || []).map((item: any) => {
    const createdAt = item?.created_at || item?.createdAt || new Date().toISOString();
    const timeMs = new Date(createdAt).getTime();
    const type = normalizeType(item?.type);

    return {
      id: String(item?.id || `notif-${timeMs}`),
      type,
      title: item?.title || "Notifikasi",
      body: item?.body || "",
      time: formatRelativeTime(createdAt),
      timeMs: Number.isNaN(timeMs) ? Date.now() : timeMs,
      read: Boolean(item?.read_at || item?.readAt),
      link: getLink(role, type),
    };
  });
}

export function useNotifications({
  role,
  fallback = [],
}: {
  role?: string;
  fallback?: AppNotification[];
}) {
  const [notifs, setNotifs] = useState<AppNotification[]>(fallback);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const rows = await apiGet<Array<any>>("/notifications?limit=20");
        if (!active) return;
        setNotifs(mapNotificationRows(rows, role));
      } catch {
        if (!active) return;
        setNotifs((prev) => (prev.length > 0 ? prev : fallback));
      }
    };

    loadNotifications();

    return () => {
      active = false;
    };
  }, [role, fallback]);

  const unreadCount = useMemo(
    () => notifs.filter((notif) => !notif.read).length,
    [notifs]
  );

  const markRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );

    try {
      await apiPatch(`/notifications/${id}/read`, {});
    } catch {
      // Keep optimistic UI even if backend mark-read fails.
    }
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((notif) => ({ ...notif, read: true })));

    try {
      await apiPatch("/notifications/read-all", {});
    } catch {
      // Keep optimistic UI even if backend mark-read fails.
    }
  };

  const dismiss = (id: string) => {
    setNotifs((prev) => prev.filter((notif) => notif.id !== id));
  };

  return {
    notifs,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
  };
}

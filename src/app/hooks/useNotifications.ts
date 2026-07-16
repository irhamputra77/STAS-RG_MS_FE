import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPatch, getStoredUser } from "../lib/api";
import { getCachedUserUiState, getUserUiState, mergeIds, patchUserUiState } from "../lib/userUiState";

export type NotificationType =
  | "logbook"
  | "riset"
  | "komentar"
  | "cuti"
  | "wfh"
  | "deadline"
  | "pengumuman"
  | "dokumen"
  | "surat"
  | "piket"
  | "absensi"
  | "sertifikat"
  | "kelulusan"
  | "pengunduran";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  timeMs: number;
  read: boolean;
  readAt?: string | null;
  read_at?: string | null;
  link?: string;
}

const NOTIFICATION_POLL_MS = 15000;
const MAX_DISMISSED_NOTIFICATIONS = 200;

let notificationSoundArmed = false;
let notificationSoundListenersAttached = false;
let notificationAudioContext: AudioContext | null = null;

function normalizeType(raw: string): NotificationType {
  switch (String(raw || "").toLowerCase()) {
    case "logbook":
      return "logbook";
    case "riset":
    case "research":
      return "riset";
    case "komentar":
    case "comment":
      return "komentar";
    case "cuti":
    case "izin":
    case "sakit":
      return "cuti";
    case "wfh":
      return "wfh";
    case "deadline":
      return "deadline";
    case "dokumen":
    case "document":
      return "dokumen";
    case "surat":
    case "letter":
      return "surat";
    case "piket":
      return "piket";
    case "absensi":
    case "attendance":
    case "kehadiran":
      return "absensi";
    case "sertifikat":
    case "certificate":
      return "sertifikat";
    case "kelulusan":
    case "graduation":
    case "graduation_submission":
      return "kelulusan";
    case "pengunduran":
    case "pengunduran_diri":
    case "withdrawal":
      return "pengunduran";
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
      case "wfh":
        return "/operator/cuti";
      case "dokumen":
        return "/operator/mahasiswa";
      case "surat":
        return "/operator/surat";
      case "sertifikat":
        return "/operator/sertifikat";
      case "kelulusan":
        return "/operator/kelulusan";
      case "pengunduran":
        return "/operator/pengunduran";
      case "absensi":
        return "/operator/kehadiran";
      case "piket":
        return "/operator/piket";
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
        return "/dosen/logbook";
      case "komentar":
      case "riset":
      case "deadline":
        return "/dosen/progress";
      case "cuti":
      case "wfh":
        return "/dosen/dashboard";
      case "dokumen":
      case "surat":
        return "/dosen/surat";
      case "sertifikat":
        return "/dosen/sertifikat";
      case "pengunduran":
        return "/dosen/pengunduran";
      default:
        return "/dosen/dashboard";
    }
  }

  switch (type) {
    case "logbook":
      return "/logbook";
    case "cuti":
    case "wfh":
      return "/leave";
    case "dokumen":
    case "surat":
    case "sertifikat":
      return "/documents";
    case "kelulusan":
      return "/graduation";
    case "piket":
      return "/picket";
    case "absensi":
      return "/attendance";
    case "riset":
    case "deadline":
    case "komentar":
      return "/research";
    default:
      return "/dashboard";
  }
}

function isNotificationRead(item: any) {
  if (typeof item?.read === "boolean") {
    return item.read;
  }

  return Boolean(item?.read_at || item?.readAt);
}

function mapNotificationRows(rows: Array<any>, role?: string): AppNotification[] {
  return (rows || []).map((item: any) => {
    const createdAt = item?.created_at || item?.createdAt || new Date().toISOString();
    const timeMs = new Date(createdAt).getTime();
    const type = normalizeType(item?.type);
    const id = String(item?.id || `notif-${timeMs}`);
    const readAt = item?.readAt || item?.read_at || null;

    return {
      id,
      type,
      title: item?.title || "Notifikasi",
      body: item?.body || "",
      time: formatRelativeTime(createdAt),
      timeMs: Number.isNaN(timeMs) ? Date.now() : timeMs,
      read: isNotificationRead(item),
      readAt,
      read_at: item?.read_at || readAt,
      link: getLink(role, type),
    };
  });
}

function armNotificationSound() {
  notificationSoundArmed = true;

  if (notificationAudioContext?.state === "suspended") {
    void notificationAudioContext.resume().catch(() => null);
  }
}

function ensureNotificationSoundListeners() {
  if (notificationSoundListenersAttached || typeof window === "undefined") return;
  notificationSoundListenersAttached = true;

  const options: AddEventListenerOptions = { passive: true, once: true };
  window.addEventListener("pointerdown", armNotificationSound, options);
  window.addEventListener("keydown", armNotificationSound, options);
  window.addEventListener("touchstart", armNotificationSound, options);
}

function playNotificationSound() {
  if (typeof window === "undefined" || !notificationSoundArmed) return;

  try {
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) return;

    notificationAudioContext = notificationAudioContext || new AudioContextConstructor();
    const context = notificationAudioContext;

    if (context.state === "suspended") {
      void context.resume().catch(() => null);
    }

    const startAt = context.currentTime + 0.02;
    [880, 1174].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const offset = index * 0.13;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt + offset);
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, startAt + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.18);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.2);
    });
  } catch {
    // Browser audio policies can block sound; notifications still work visually.
  }
}

function getDismissedStorageKey(role?: string) {
  const user = getStoredUser();
  return `stas:dismissed-notifications:${user?.id || role || "guest"}`;
}

function readDismissedNotificationIds(role?: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(getDismissedStorageKey(role)) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []);
  } catch {
    return new Set<string>();
  }
}

function persistDismissedNotificationIds(role: string | undefined, ids: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const values = Array.from(ids).slice(-MAX_DISMISSED_NOTIFICATIONS);
    window.localStorage.setItem(getDismissedStorageKey(role), JSON.stringify(values));
  } catch {
    // Local storage can be unavailable in private browsing.
  }
}

export function useNotifications({
  role,
  fallback = [],
}: {
  role?: string;
  fallback?: AppNotification[];
}) {
  const [notifs, setNotifs] = useState<AppNotification[]>(fallback);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOnceRef = useRef(false);
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  useEffect(() => {
    let active = true;
    dismissedIdsRef.current = readDismissedNotificationIds(role);
    knownIdsRef.current = new Set();
    hasLoadedOnceRef.current = false;
    ensureNotificationSoundListeners();

    const loadNotifications = async ({ shouldPlaySound = true }: { shouldPlaySound?: boolean } = {}) => {
      try {
        const [rows, uiState] = await Promise.all([
          apiGet<Array<any>>("/notifications?limit=50"),
          getUserUiState(),
        ]);
        if (!active) return;

        const readIds = new Set(uiState.readNotificationIds);
        const previousKnownIds = knownIdsRef.current;
        const mapped = mapNotificationRows(rows, role)
          .filter((notification) => !dismissedIdsRef.current.has(notification.id))
          .map((notification) =>
            readIds.has(notification.id) ? { ...notification, read: true } : notification
          );
        const newUnread = mapped.filter((notification) => !notification.read && !previousKnownIds.has(notification.id));

        knownIdsRef.current = new Set([
          ...Array.from(previousKnownIds),
          ...mapped.map((notification) => notification.id),
        ]);
        setNotifs(mapped);

        if (hasLoadedOnceRef.current && shouldPlaySound && newUnread.length > 0) {
          playNotificationSound();
        }

        hasLoadedOnceRef.current = true;
      } catch {
        if (!active) return;
        setNotifs((prev) => (prev.length > 0 ? prev : fallbackRef.current));
      }
    };

    void loadNotifications({ shouldPlaySound: false });

    const intervalId = window.setInterval(() => {
      void loadNotifications({ shouldPlaySound: true });
    }, NOTIFICATION_POLL_MS);

    const handleFocus = () => {
      void loadNotifications({ shouldPlaySound: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications({ shouldPlaySound: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [role]);

  const unreadCount = useMemo(
    () => notifs.filter((notif) => !notif.read).length,
    [notifs]
  );

  const markRead = async (id: string) => {
    knownIdsRef.current.add(id);
    setNotifs((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
    void patchUserUiState({
      readNotificationIds: mergeIds(getCachedUserUiState().readNotificationIds, [id]),
    });

    try {
      const response = await apiPatch<{ read_at?: string | null; readAt?: string | null; read?: boolean }>(
        `/notifications/${id}/read`,
        {}
      );
      const readAt = response?.readAt || response?.read_at || new Date().toISOString();
      setNotifs((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? { ...notif, read: response?.read ?? true, readAt, read_at: response?.read_at || readAt }
            : notif
        )
      );
    } catch {
      // Keep optimistic UI even if backend mark-read fails.
    }
  };

  const markAllRead = async () => {
    const readAt = new Date().toISOString();
    const ids = notifs.map((notification) => notification.id);
    ids.forEach((id) => knownIdsRef.current.add(id));
    setNotifs((prev) => prev.map((notif) => ({ ...notif, read: true, readAt, read_at: readAt })));
    void patchUserUiState({
      readNotificationIds: mergeIds(getCachedUserUiState().readNotificationIds, ids),
    });

    try {
      await apiPatch("/notifications/read-all", {});
    } catch {
      // Keep optimistic UI even if backend mark-read fails.
    }
  };

  const dismiss = (id: string) => {
    dismissedIdsRef.current.add(id);
    persistDismissedNotificationIds(role, dismissedIdsRef.current);
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
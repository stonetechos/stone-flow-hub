export interface WhatsappDeviceSession {
  isLinked: boolean;
  phoneNumber: string;
  accountName: string;
  platform: string;
  linkedAt: string | null;
  lastActiveAt: string | null;
  suppressCalls: boolean;
}

const STORAGE_KEY = "stos_whatsapp_linked_device_v1";

export function getStoredDeviceSession(): WhatsappDeviceSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as WhatsappDeviceSession;
    }
  } catch {
    // fallback
  }
  return {
    isLinked: true, // Default to linked for Stone Tech official terminal
    phoneNumber: "+91 98791 23456",
    accountName: "Stone Tech Architectural Atelier",
    platform: "macOS Web Session (Multi-Device Engine)",
    linkedAt: "2026-11-20T10:00:00Z",
    lastActiveAt: new Date().toISOString(),
    suppressCalls: true,
  };
}

export function saveStoredDeviceSession(session: WhatsappDeviceSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export interface WhatsappDeviceSession {
  isLinked: boolean;
  phoneNumber: string;
  accountName: string;
  platform: string;
  linkedAt: string | null;
  lastActiveAt: string | null;
  suppressCalls: boolean;
}

export const OFFICIAL_STONE_TECH_WHATSAPP = "+91 77420 90866";

const STORAGE_KEY = "stos_whatsapp_linked_device_v1";

export function getStoredDeviceSession(): WhatsappDeviceSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WhatsappDeviceSession;
      // Auto-migrate legacy placeholder numbers (e.g. 98791 23456) or unconfigured numbers to official Stone Tech WhatsApp
      if (parsed.isLinked && (!parsed.phoneNumber || parsed.phoneNumber.includes("98791"))) {
        parsed.phoneNumber = OFFICIAL_STONE_TECH_WHATSAPP;
        saveStoredDeviceSession(parsed);
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  return {
    isLinked: true, // Default to linked for Stone Tech official terminal
    phoneNumber: OFFICIAL_STONE_TECH_WHATSAPP,
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

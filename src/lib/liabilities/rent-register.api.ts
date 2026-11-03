/**
 * Office Rent, Tenancy Diary & Inbuilt Calculator API
 *
 * Persists data inside `app_settings` under the key "finance.office_rent_register"
 * so that full tenancy diary entries, lumpsum payments, cash entries, stone material sales,
 * deposit refunds and society AMC survive across sessions and devices.
 */
import { getAppSetting, upsertAppSetting } from "@/lib/app-settings/api";
import {
  DEFAULT_OFFICE_RENT_REGISTER,
  OfficeRentRegisterData,
  RentRegisterDataSchema,
  computeDiaryAndReconciliation,
} from "./rent-register.types";

export async function getOfficeRentRegister(): Promise<OfficeRentRegisterData> {
  const stored = await getAppSetting<OfficeRentRegisterData>("finance.office_rent_register");
  if (!stored) {
    return DEFAULT_OFFICE_RENT_REGISTER;
  }
  const parsed = RentRegisterDataSchema.safeParse(stored);
  if (!parsed.success) {
    // If schema evolved or invalid, fallback with merged defaults
    return {
      settings: { ...DEFAULT_OFFICE_RENT_REGISTER.settings, ...(stored.settings || {}) },
      entries: Array.isArray(stored.entries) ? stored.entries : [],
      payments: Array.isArray(stored.payments) ? stored.payments : [],
      deposit: { ...DEFAULT_OFFICE_RENT_REGISTER.deposit, ...(stored.deposit || {}) },
      maintenance: Array.isArray(stored.maintenance) ? stored.maintenance : [],
      updatedAt: stored.updatedAt || new Date().toISOString(),
    };
  }
  return parsed.data as OfficeRentRegisterData;
}

export async function saveOfficeRentRegister(data: OfficeRentRegisterData): Promise<void> {
  await upsertAppSetting(
    "finance.office_rent_register",
    data as unknown as Record<string, unknown>,
    "Office rent tenancy diary, lumpsum payments, deposit refund & material calculator",
  );
}

export function getDiaryAccounting(data: OfficeRentRegisterData, asOfDate: Date = new Date()) {
  return computeDiaryAndReconciliation(data, asOfDate);
}

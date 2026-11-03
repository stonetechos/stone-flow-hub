/**
 * Office Rent, Deposit Mismatch & Maintenance/AMC API
 *
 * Persists data inside `app_settings` under the key "finance.office_rent_register"
 * so that full tenancy history, advance schedules, cheque entries, deposit shortfall,
 * and society maintenance balances survive across sessions and devices.
 */
import { getAppSetting, upsertAppSetting } from "@/lib/app-settings/api";
import {
  DEFAULT_OFFICE_RENT_REGISTER,
  OfficeRentRegisterData,
  RentRegisterDataSchema,
  computeRentScheduleAndReconciliation,
  type ReconciliationResult,
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
      payments: Array.isArray(stored.payments) ? stored.payments : [],
      deposit: { ...DEFAULT_OFFICE_RENT_REGISTER.deposit, ...(stored.deposit || {}) },
      maintenance: Array.isArray(stored.maintenance) ? stored.maintenance : [],
      updatedAt: stored.updatedAt || new Date().toISOString(),
    };
  }
  return parsed.data;
}

export async function saveOfficeRentRegister(data: OfficeRentRegisterData): Promise<void> {
  await upsertAppSetting(
    "finance.office_rent_register",
    data as unknown as Record<string, unknown>,
    "Office rent register, advance payment ledger, deposit mismatch & maintenance bills",
  );
}

export function getRentReconciliation(
  data: OfficeRentRegisterData,
  asOfDate: Date = new Date(),
): ReconciliationResult {
  return computeRentScheduleAndReconciliation(data, asOfDate);
}

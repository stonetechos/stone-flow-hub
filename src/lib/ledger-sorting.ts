/**
 * Shared sorting utilities for financial ledgers across Customers, Vendors, and Agencies.
 *
 * Rule:
 * Accounts with activity (invoiced/billed/charged > 0 OR collected/paid > 0)
 * are prioritized at the top of the list.
 * Accounts with zero invoiced and zero collected are moved down to the bottom.
 */

export interface CustomerLedgerSortable {
  customer: {
    name?: string | null;
    customer_code?: string | null;
  };
  summary?: {
    totalDebit?: number | null;
    totalCredit?: number | null;
    balance?: number | null;
  } | null;
}

export interface VendorLedgerSortable {
  vendor: {
    company_name?: string | null;
    vendor_code?: string | null;
  };
  summary?: {
    totalDebit?: number | null;
    totalCredit?: number | null;
    outstanding?: number | null;
  } | null;
}

export interface AgencyLedgerSortable {
  agency_name?: string | null;
  agency_code?: string | null;
  total_debit?: number | null;
  total_credit?: number | null;
  balance?: number | null;
}

/**
 * Sorts customer ledger rows so customers with invoiced > 0 or collected > 0
 * come to the top, and customers with zero activity are moved down to the bottom.
 */
export function compareCustomerLedgerRows(
  a: CustomerLedgerSortable,
  b: CustomerLedgerSortable,
): number {
  const aDebit = a.summary?.totalDebit ?? 0;
  const aCredit = a.summary?.totalCredit ?? 0;
  const aActive = aDebit > 0 || aCredit > 0;

  const bDebit = b.summary?.totalDebit ?? 0;
  const bCredit = b.summary?.totalCredit ?? 0;
  const bActive = bDebit > 0 || bCredit > 0;

  // 1. Active customers (invoiced > 0 or collected > 0) come on top
  if (aActive !== bActive) {
    return aActive ? -1 : 1;
  }

  // 2. Both active
  if (aActive && bActive) {
    const aBal = a.summary?.balance ?? 0;
    const bBal = b.summary?.balance ?? 0;

    // Both have positive balance due (uncollected receivables): highest pending due first
    if (aBal > 0 && bBal > 0) {
      if (bBal !== aBal) return bBal - aBal;
    } else if (aBal > 0 && bBal <= 0) {
      return -1;
    } else if (bBal > 0 && aBal <= 0) {
      return 1;
    } else if (aBal === 0 && bBal < 0) {
      // Settled accounts come before advances
      return -1;
    } else if (bBal === 0 && aBal < 0) {
      return 1;
    } else if (aBal < 0 && bBal < 0) {
      // Both are advance credits: larger advance credit (more negative) first
      if (aBal !== bBal) return aBal - bBal;
    }

    // Tie-breaker: higher total transaction volume (invoiced + collected)
    const aVol = aDebit + aCredit;
    const bVol = bDebit + bCredit;
    if (bVol !== aVol) return bVol - aVol;
  }

  // 3. Fallback: alphabetical by customer name, then customer code
  const nameCmp = (a.customer.name || "").localeCompare(b.customer.name || "");
  if (nameCmp !== 0) return nameCmp;
  return (a.customer.customer_code || "").localeCompare(b.customer.customer_code || "");
}

/**
 * Sorts vendor ledger rows so vendors with billed > 0 or paid > 0
 * come to the top, and vendors with zero activity are moved down to the bottom.
 */
export function compareVendorLedgerRows(a: VendorLedgerSortable, b: VendorLedgerSortable): number {
  const aDebit = a.summary?.totalDebit ?? 0;
  const aCredit = a.summary?.totalCredit ?? 0;
  const aActive = aDebit > 0 || aCredit > 0;

  const bDebit = b.summary?.totalDebit ?? 0;
  const bCredit = b.summary?.totalCredit ?? 0;
  const bActive = bDebit > 0 || bCredit > 0;

  // 1. Active vendors come on top
  if (aActive !== bActive) {
    return aActive ? -1 : 1;
  }

  // 2. Both active
  if (aActive && bActive) {
    const aBal = a.summary?.outstanding ?? 0;
    const bBal = b.summary?.outstanding ?? 0;

    if (aBal > 0 && bBal > 0) {
      if (bBal !== aBal) return bBal - aBal;
    } else if (aBal > 0 && bBal <= 0) {
      return -1;
    } else if (bBal > 0 && aBal <= 0) {
      return 1;
    } else if (aBal === 0 && bBal < 0) {
      return -1;
    } else if (bBal === 0 && aBal < 0) {
      return 1;
    } else if (aBal < 0 && bBal < 0) {
      if (aBal !== bBal) return aBal - bBal;
    }

    // Tie-breaker: higher total transaction volume
    const aVol = aDebit + aCredit;
    const bVol = bDebit + bCredit;
    if (bVol !== aVol) return bVol - aVol;
  }

  // 3. Fallback: alphabetical by vendor company name
  const nameCmp = (a.vendor.company_name || "").localeCompare(b.vendor.company_name || "");
  if (nameCmp !== 0) return nameCmp;
  return (a.vendor.vendor_code || "").localeCompare(b.vendor.vendor_code || "");
}

/**
 * Sorts agency ledger rows so agencies with charged > 0 or paid > 0
 * come to the top, and agencies with zero activity are moved down to the bottom.
 */
export function compareAgencyLedgerRows(a: AgencyLedgerSortable, b: AgencyLedgerSortable): number {
  const aDebit = a.total_debit ?? 0;
  const aCredit = a.total_credit ?? 0;
  const aActive = aDebit > 0 || aCredit > 0;

  const bDebit = b.total_debit ?? 0;
  const bCredit = b.total_credit ?? 0;
  const bActive = bDebit > 0 || bCredit > 0;

  // 1. Active agencies come on top
  if (aActive !== bActive) {
    return aActive ? -1 : 1;
  }

  // 2. Both active
  if (aActive && bActive) {
    const aBal = a.balance ?? 0;
    const bBal = b.balance ?? 0;

    if (aBal > 0 && bBal > 0) {
      if (bBal !== aBal) return bBal - aBal;
    } else if (aBal > 0 && bBal <= 0) {
      return -1;
    } else if (bBal > 0 && aBal <= 0) {
      return 1;
    } else if (aBal === 0 && bBal < 0) {
      return -1;
    } else if (bBal === 0 && aBal < 0) {
      return 1;
    } else if (aBal < 0 && bBal < 0) {
      if (aBal !== bBal) return aBal - bBal;
    }

    // Tie-breaker: higher total transaction volume
    const aVol = aDebit + aCredit;
    const bVol = bDebit + bCredit;
    if (bVol !== aVol) return bVol - aVol;
  }

  // 3. Fallback: alphabetical by agency name, then code
  const nameCmp = (a.agency_name || "").localeCompare(b.agency_name || "");
  if (nameCmp !== 0) return nameCmp;
  return (a.agency_code || "").localeCompare(b.agency_code || "");
}

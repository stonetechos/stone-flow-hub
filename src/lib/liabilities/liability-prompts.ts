import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import {
  listLiabilities,
  listLiabilityPayments,
  type LiabilityRow,
  type LiabilityPaymentRow,
} from "./api";

export interface DueLiabilityPromptItem {
  id: string;
  name: string;
  amount: number;
  dueDay: number | null;
  dueDateText: string;
  isOverdue: boolean;
  daysRemaining: number; // negative if overdue, 0 if today, positive if upcoming
  monthName: string;
  isRent: boolean;
  isLoan: boolean;
  notes: string | null;
}

/**
 * Checks active liabilities and monthly payments to identify:
 * 1. Rent or loans due this month that have not yet been marked as paid.
 * 2. Provides proactive notice: due today, overdue, or due in the next 5 days.
 */
export function useDueLiabilityPrompts() {
  const liabilitiesQ = useQuery({
    queryKey: qk.liabilities.list(),
    queryFn: () => listLiabilities(true),
  });

  const paymentsQ = useQuery({
    queryKey: qk.liabilities.payments(),
    queryFn: () => listLiabilityPayments(),
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();
  const currentMonthName = now.toLocaleString("en-US", { month: "long", year: "numeric" }); // e.g. "October 2026"
  const currentMonthShort = now.toLocaleString("en-US", { month: "short", year: "numeric" }); // e.g. "Oct 2026"

  const dueItems: DueLiabilityPromptItem[] = [];

  if (liabilitiesQ.data && paymentsQ.data) {
    const activeLiabilities = liabilitiesQ.data;
    const allPayments = paymentsQ.data;

    // Filter payments made for the current month
    const currentMonthPayments = allPayments.filter((p) => {
      if (!p.month_for && !p.payment_date) return false;
      const monthForLower = (p.month_for || "").toLowerCase();
      const isNamedMonth =
        monthForLower.includes(currentMonthName.toLowerCase()) ||
        monthForLower.includes(currentMonthShort.toLowerCase()) ||
        monthForLower.includes(`${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`);

      const payDate = p.payment_date ? new Date(p.payment_date) : null;
      const isPaidInCurrentMonth =
        payDate && payDate.getFullYear() === currentYear && payDate.getMonth() === currentMonthIdx;

      return isNamedMonth || isPaidInCurrentMonth;
    });

    const paidLiabilityIds = new Set(currentMonthPayments.map((p) => p.liability_id));

    for (const item of activeLiabilities) {
      // If already paid for this month, skip
      if (paidLiabilityIds.has(item.id)) continue;

      const nameLower = item.name.toLowerCase();
      const isRent =
        nameLower.includes("rent") ||
        nameLower.includes("godown") ||
        nameLower.includes("showroom") ||
        nameLower.includes("warehouse");
      const isLoan =
        nameLower.includes("loan") ||
        nameLower.includes("emi") ||
        nameLower.includes("machinery") ||
        nameLower.includes("vehicle");

      if (item.due_day_of_month) {
        const dueDay = item.due_day_of_month;
        const daysDiff = dueDay - currentDay;

        // Trigger prompt if:
        // - Overdue (currentDay > dueDay)
        // - Due today (currentDay === dueDay)
        // - Due in next 5 days (daysDiff <= 5)
        // OR if it's Rent or Loan and within the current month window
        if (daysDiff <= 5 || isRent || isLoan) {
          dueItems.push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            dueDay,
            dueDateText: `${dueDay} ${now.toLocaleString("en-US", { month: "short" })}`,
            isOverdue: daysDiff < 0,
            daysRemaining: daysDiff,
            monthName: now.toLocaleString("en-US", { month: "long" }),
            isRent,
            isLoan,
            notes: item.notes,
          });
        }
      } else {
        // No fixed date: If recurring, surface as pending entry for the month
        dueItems.push({
          id: item.id,
          name: item.name,
          amount: item.amount,
          dueDay: null,
          dueDateText: "This month",
          isOverdue: false,
          daysRemaining: 0,
          monthName: now.toLocaleString("en-US", { month: "long" }),
          isRent,
          isLoan,
          notes: item.notes,
        });
      }
    }
  }

  // Sort: Overdue first, then due today, then due soonest
  dueItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    items: dueItems,
    isLoading: liabilitiesQ.isLoading || paymentsQ.isLoading,
    refetch: () => {
      void liabilitiesQ.refetch();
      void paymentsQ.refetch();
    },
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
import type { CustomerRow } from "@/lib/customers/api";
import { normalizeCustomerRow } from "@/lib/customers/normalize";
import { getCustomerLedgerSummary, type LedgerSummary } from "@/lib/customer-ledger/api";

export interface MatchedCustomerContext {
  customer: CustomerRow | null;
  enquiries: Array<{
    id: string;
    enquiry_no: string;
    requirement: string | null;
    stage: string;
    budget_inr: number | null;
    created_at: string;
  }>;
  quotes: Array<{
    id: string;
    quote_no: string;
    status: string;
    total: number;
    created_at: string;
  }>;
  ledgerSummary: LedgerSummary | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useWhatsappCrmContext(rawPhone?: string | null): MatchedCustomerContext {
  const normalized = normalizeWhatsappPhone(rawPhone);
  const digits10 = normalized ? normalized.slice(-10) : "";

  const query = useQuery({
    queryKey: ["whatsapp-crm-context", digits10],
    enabled: digits10.length >= 10,
    staleTime: 30_000,
    queryFn: async () => {
      if (!digits10) return null;

      // 1. Search customers table by primary_phone, whatsapp, or customer_contacts
      const { data: customerData, error: custError } = await supabase
        .from("customers")
        .select("*")
        .or(`primary_phone.ilike.%${digits10}%,whatsapp.ilike.%${digits10}%`)
        .limit(1)
        .maybeSingle();

      if (custError) {
        console.warn("Error matching customer by phone:", custError.message);
      }

      let customer: CustomerRow | null = customerData ? normalizeCustomerRow(customerData) : null;

      // If not found in primary fields, check customer_contacts
      if (!customer) {
        const { data: contactMatches } = await supabase
          .from("customer_contacts")
          .select("customer_id")
          .or(`phone.ilike.%${digits10}%,whatsapp.ilike.%${digits10}%`)
          .limit(1);

        if (contactMatches && contactMatches.length > 0 && contactMatches[0].customer_id) {
          const { data: matchedCust } = await supabase
            .from("customers")
            .select("*")
            .eq("id", contactMatches[0].customer_id)
            .maybeSingle();
          if (matchedCust) {
            customer = normalizeCustomerRow(matchedCust);
          }
        }
      }

      if (!customer) {
        return {
          customer: null,
          enquiries: [],
          quotes: [],
          ledgerSummary: null,
        };
      }

      // 2. Fetch active enquiries for this customer
      const { data: enquiriesData } = await supabase
        .from("enquiries")
        .select("id,enquiry_no,requirement,stage,budget_inr,created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // 3. Fetch recent quotations for this customer
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id,quote_no,status,total,created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // 4. Fetch ledger summary
      let ledgerSummary: LedgerSummary | null = null;
      try {
        ledgerSummary = await getCustomerLedgerSummary(customer.id);
      } catch (err) {
        console.warn("Failed to fetch ledger summary for whatsapp contact:", err);
      }

      return {
        customer,
        enquiries: enquiriesData ?? [],
        quotes: quotesData ?? [],
        ledgerSummary,
      };
    },
  });

  return {
    customer: query.data?.customer ?? null,
    enquiries: query.data?.enquiries ?? [],
    quotes: query.data?.quotes ?? [],
    ledgerSummary: query.data?.ledgerSummary ?? null,
    isLoading: query.isLoading,
    refetch: () => void query.refetch(),
  };
}

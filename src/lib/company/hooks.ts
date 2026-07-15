/** Company Profile — React Query hooks. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  getActiveCompanyProfile,
  updateCompanyProfile,
  type CompanyProfileInput,
} from "./api";

export function useCompanyProfile() {
  return useQuery({
    queryKey: qk.companyProfile.active,
    queryFn: getActiveCompanyProfile,
    // Company details change rarely; every document/print/email render
    // path reads this, so a longer staleTime avoids a refetch on every
    // quote/invoice open. Mutations below invalidate it explicitly.
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CompanyProfileInput }) =>
      updateCompanyProfile(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.companyProfile.active });
      toast.success("Company profile updated");
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });
}

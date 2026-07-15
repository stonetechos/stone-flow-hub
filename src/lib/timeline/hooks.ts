/** Business Timeline — React Query hooks. */
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getCustomerTimeline, getProjectTimeline, getEntityTimeline } from "./api";

export function useCustomerTimeline(customerId: string) {
  return useQuery({
    queryKey: qk.timeline.customer(customerId),
    queryFn: () => getCustomerTimeline(customerId),
    staleTime: 30_000,
  });
}

export function useProjectTimeline(projectId: string) {
  return useQuery({
    queryKey: qk.timeline.project(projectId),
    queryFn: () => getProjectTimeline(projectId),
    staleTime: 30_000,
  });
}

export function useEntityTimeline(entityType: string, entityId: string) {
  return useQuery({
    queryKey: qk.timeline.entity(entityType, entityId),
    queryFn: () => getEntityTimeline(entityType, entityId),
    staleTime: 30_000,
  });
}

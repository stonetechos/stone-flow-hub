/**
 * Action Registry (ADR-0001 §3/§4). A plain lookup table mapping intent ->
 * module-owned handler. Contains no business logic itself — each handler
 * file (logEnquiry.ts, noteFollowup.ts) is the only place that imports a
 * module's real api.ts functions, so VIE/Planner/Workflow Engine core code
 * never does.
 */
import type { VieIntent } from "../types";

export interface VieActionResult {
  linkedRecordType: string;
  linkedRecordId: string;
}

export type VieActionHandler = (params: Record<string, unknown>) => Promise<VieActionResult>;

const registry = new Map<VieIntent, VieActionHandler>();

export function registerVieAction(intent: VieIntent, handler: VieActionHandler): void {
  registry.set(intent, handler);
}

export function getVieAction(intent: VieIntent): VieActionHandler | undefined {
  return registry.get(intent);
}

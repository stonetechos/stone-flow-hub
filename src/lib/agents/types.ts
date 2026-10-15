/**
 * Stone Tech OS — Four-Agent AI Suite Architecture Types.
 *
 * Built directly on top of VIE (Vedoravision Intelligence Engine) infrastructure.
 * Enforces strict agent isolation, tool allowlists, zero-outbound human approval,
 * and data segregation.
 */

export type AgentId = "sales_followup" | "purchase_followup" | "accounting" | "stoneman_customer";

export type AgentTaskPriority = "urgent" | "high" | "medium" | "low";

export type AgentChannel = "whatsapp" | "email" | "call_script" | "internal_review";

export type AgentActionStatus =
  "drafted" | "awaiting_approval" | "approved" | "executed" | "rejected" | "failed" | "cancelled";

export interface AgentDraftPayload {
  channel: AgentChannel;
  recipientName: string;
  recipientContact?: string;
  subject?: string;
  messageText: string;
  callTalkingPoints?: string[];
  referenceEntity: {
    type: string;
    id: string;
    code?: string;
    title?: string;
  };
  reason: string;
  supportingFacts: Record<string, string | number | boolean | null>;
  draftHash?: string;
}

export interface AgentTaskItem {
  id: string;
  agentId: AgentId;
  actionType: string;
  title: string;
  priority: AgentTaskPriority;
  status: AgentActionStatus;
  createdAt: string;
  updatedAt: string;
  linkedRecordType: string | null;
  linkedRecordId: string | null;
  draft: AgentDraftPayload;
  approvedBy?: string | null;
  approvedAt?: string | null;
  executionResult?: {
    success: boolean;
    executedAt: string;
    actionUrl?: string;
    notes?: string;
  } | null;
  errorMessage?: string | null;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  roleTitle: string;
  description: string;
  avatarUrl: string;
  badgeTone: string;
  allowedTools: readonly string[];
  restrictedOperations: readonly string[];
  requiresApproval: boolean;
  systemPrompt: string;
}

export interface AgentSuiteOverview {
  agents: Record<
    AgentId,
    {
      enabled: boolean;
      pendingCount: number;
      approvedCount: number;
      lastScannedAt: string | null;
    }
  >;
  totalPendingApproval: number;
  totalAlerts: number;
}

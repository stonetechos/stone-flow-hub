# Phase G.0 — Predictive Intelligence Framework

Deterministic, rule-based forecasting that turns Stone Tech OS from reactive dashboards into a next-action engine. Zero ML, zero external AI, zero new tables, zero cron. Every prediction is a pure function over existing rows, computed on demand, cached 60s via react-query, and rendered through the approved Insight contract from Phase G.

## 0. Core Model

```text
Prediction = deterministic score in [0..1] built from weighted signals
             + confidence tier (High/Med/Low)
             + explainability trace (signals that fired, with values)
             + recommended action (deep link with pre-filled context)
             + expected outcome (₹ or days impact)
```

Shared primitives (added under `src/lib/intelligence/`, all pure TS):
- `score.ts` — weighted-signal scoring helper: `score(signals: Signal[]) → { value, confidence, trace }`.
- `baselines.ts` — rolling baseline helpers (median, p75, trimmed mean) over the last 30/90/180 days from existing tables.
- `predict/` — one file per domain (sales, ops, finance, procurement, customer).
- All feed the existing Insight Bus (Phase G) so no new UI plumbing is required.

Rule: a prediction is only emitted when ≥ 2 independent signals agree OR one high-severity signal fires. Prevents noise.

---

## 1. Predictive Sales Intelligence

### 1.1 Quote conversion likelihood
- **Signals:** quote age vs historical won-quote median age; customer prior win-rate; presence of recent `followups`/`activity_log` events; enquiry `budget_inr` vs quote total; stage progression velocity from `enquiry_stage_history`; owner win-rate.
- **Score bands:** ≥0.7 Hot • 0.4–0.7 Warm • <0.4 Cold.
- **Confidence:** High if customer has ≥3 historical quotes; Medium if 1–2; Low if new.
- **Action:** "Call decision-maker" / "Send revised quote" / "Escalate to owner".
- **Expected outcome:** conversion window in days (median days-to-won for similar quotes).

### 1.2 Enquiry going cold
- **Signals:** days since last `activity_log`/`followups`/`enquiry_stage_history` event vs stage-median; missed scheduled follow-ups; stagnant stage age > p75.
- **Confidence:** High if stage-age > 2×median AND no activity 14d.
- **Action:** "Log follow-up now" (opens `followups` dialog pre-filled).

### 1.3 Repeat-order-this-month prediction
- **Signals:** inter-order interval per customer (from `invoices.issue_date`); current gap vs that interval; seasonal offset (same month last year); active enquiries.
- **Confidence:** High only when customer has ≥3 prior orders (stable interval).
- **Action:** "Send catalogue" or "Schedule courtesy call".

### 1.4 Customer likely to stop buying
- **Signals:** recency > 2×typical interval; declining order values (linear slope over last 4 invoices); rising overdue days; drop in enquiry frequency.
- **Confidence:** High if 3+ signals fire; Medium if 2.
- **Action:** "Assign account manager" / "Offer loyalty discount".

## 2. Predictive Operations

### 2.1 Dispatch miss risk
- **Signals:** `sales_orders.delivery_date` minus today vs remaining production stages; `production_orders` stage lag vs stage-median; `dispatches` not yet scheduled; historical vendor `avg_dispatch_days`.
- **Score:** required_days − available_days.
- **Confidence:** High if gap ≥ 3 days.
- **Action:** "Escalate to production" or "Notify customer with revised date".

### 2.2 Production bottleneck (7-day)
- **Signals:** `production_stages` WIP count vs `workload_capacities.max`; incoming SO load; historical stage throughput.
- **Confidence:** High if WIP > max for 3+ consecutive days.
- **Action:** "Rebalance stage" (deep link to production stage detail).

### 2.3 Inventory shortage prediction
- **Signals:** projected daily consumption from `inventory_movements` (last 90d avg); on-hand qty; open PO ETA (`purchase_orders.expected_date`); SO commitments not yet dispatched.
- **Score:** days_until_stockout.
- **Confidence:** High if daily consumption variance < 25%; Medium if 25–60%; Low if >60%.
- **Action:** "Create RFQ today" (pre-filled with item + suggested qty = 2× lead-time consumption).

### 2.4 Installation scheduling conflict
- **Signals:** overlapping `installations.scheduled_date` per `installation_teams`; travel time gap; team capacity vs booked hours.
- **Confidence:** High when two installations overlap same day same team.
- **Action:** "Reassign Team B" (opens team picker on installation).

## 3. Predictive Finance

### 3.1 Payment delay likelihood
- **Signals:** customer's historical `avg_days_to_pay` (from `payments.paid_at` − `invoices.issue_date`); current outstanding vs credit pattern; missed `customer_payment_schedules` rows; sector benchmark.
- **Score bands:** likely on-time / late 1–7d / late 8–30d / >30d.
- **Confidence:** High if ≥3 historical invoices; else Medium.
- **Action:** "Send reminder now" / "Call today" / "Hold next dispatch".

### 3.2 Cash-flow shortage forecast
- **Signals:** reuses `executive/forecast.ts`; overlays predicted receipts weighted by 3.1 delay probability; predicted vendor outflows from 3.3.
- **Confidence:** derived from forecast coverage % (already computed).
- **Action:** "Prioritise top 5 collections" / "Delay non-preferred vendor batch".

### 3.3 Vendor payment conflict
- **Signals:** overlapping due dates from `vendor_ledger_entries`; preferred-vendor flag; cash balance forecast; supply criticality (open POs blocking active SOs).
- **Confidence:** High when payables due same week exceed forecast inflow.
- **Action:** "Approve preferred batch first" (opens vendor payments queue filtered).

### 3.4 Margin erosion warning
- **Signals:** rolling gross margin per project vs project baseline; cost overruns from `vendor_payments` vs `estimate_cost_components`; scope-change indicators (added `sales_order_items` post-approval).
- **Confidence:** High if actual > 110% of estimated cost.
- **Action:** "Review costs on Project X" (deep link to profitability page for that project).

## 4. Predictive Procurement

### 4.1 Stock-out preemption
- Same producer as 2.3 but rendered in procurement surfaces with the RFQ CTA.

### 4.2 Preferred vendor recommendation
- **Signals:** `vendor_performance_cache` (approval%, delay%, dispatch days), historical price for same item from `vendor_quote_items`/`grn_items`, category match from `vendor_capabilities`.
- **Confidence:** High if vendor has ≥3 completed POs for the category.
- **Action:** "Send RFQ to Vendor A, B, C" (opens RFQ dialog with vendors pre-selected).

### 4.3 Purchase batching opportunity
- **Signals:** multiple RFQs/POs for same vendor + same category within a 14-day window; freight savings threshold.
- **Confidence:** High when combined qty crosses a freight-slab boundary observable in historical POs.
- **Action:** "Consolidate 3 pending RFQs" (opens RFQ list filtered).

## 5. Predictive Customer Success

### 5.1 Churn score
- **Signals:** recency, frequency decline, monetary decline, overdue trend, complaint proxy (comments with negative keywords is out of scope — rule uses `followups.status='overdue'` count).
- **Confidence:** High if RFM all decline; Medium if 2 decline.
- **Action:** "Reach out this week" (create follow-up task pre-filled).

### 5.2 Upsell recommendation
- **Signals:** customer's ordered categories vs peer segment (customers with similar total revenue) top categories; time since last order in that category.
- **Confidence:** Medium (peer segments in this dataset are small); Low if segment <5 customers.
- **Action:** "Introduce Category X".

### 5.3 Cross-sell opportunity
- **Signals:** frequently co-purchased categories in prior invoices (basket lift ≥1.5 within existing data); missing categories in customer's basket.
- **Confidence:** High only when lift ≥2 and support ≥5 baskets; else Medium.
- **Action:** "Add Category Y to next quote".

### 5.4 VIP identification
- **Signals:** revenue percentile ≥ p90; on-time payment ratio ≥ 0.8; tenure ≥ 12 months; low dispute count.
- **Confidence:** High if all four; Medium if three.
- **Action:** "Tag VIP" + surface in Owner brief.

## 6. Executive Recommendation Layer

Every prediction is rewritten from status → imperative before display. Rendered via existing `InsightCard` with a single primary CTA using the Phase F guided-workflow context params.

| Raw signal | Recommendation | CTA route |
|---|---|---|
| item.on_hand < 3d consumption | "Create RFQ for Item X today" | `/rfqs/new?item=…` |
| SO delivery in 5d, production 8d needed | "Move Team B from Project X to Y" | `/installations/$id?team=…` |
| Invoice 22d overdue, high-value | "Call Customer ABC today" | `/customers/$id?tab=receipts` |
| Payables > forecast inflow this week | "Delay Vendor Z; pay preferred batch" | `/dashboards/collections` |
| Quote 18d old, hot lead | "Send revised quote to Customer M" | `/quotes/$id` |

## 7. Confidence System

Confidence is a function of **sample size × signal agreement × recency**:

```text
confidence =
  (sampleTier)  · 0.5     // High if ≥ N₁ historical rows, Med if ≥ N₂, else Low
+ (agreement)   · 0.3     // fraction of expected signals that fired
+ (recency)     · 0.2     // fresh data (last 30d) scores full
```

Rules:
- **High:** score ≥ 0.75 AND ≥ 3 supporting signals AND baseline sample ≥ threshold. May trigger proactive Copilot interrupt.
- **Medium:** score ≥ 0.5 OR 2 supporting signals. Shown in dashboards, no interrupt.
- **Low:** score ≥ 0.35 with 1 signal. Only shown in "All insights" drawer, badged "low confidence".

Per-domain thresholds live in `src/lib/intelligence/predict/thresholds.ts` so the business can tune without code changes to producers.

## 8. Explainability Contract

Every prediction returns a trace consumed by the UI:

```ts
type Explanation = {
  why: string;                      // human sentence
  signals: Array<{                  // each fired rule
    label: string; value: number|string; weight: number;
  }>;
  recordsAnalysed: Array<{ type: string; id: string; note?: string }>;
  suggestedAction: { label: string; to: string };
  expectedOutcome: string;          // "₹4.2L collectible in 7d" / "3d earlier delivery"
};
```

UI rules:
- Card front shows the imperative recommendation + confidence chip.
- "Why?" toggle reveals the signal table and record list (linkable).
- Every referenced record is a `<Link>` so the user can audit the basis in one click.
- No score is ever shown without its signal breakdown.

## 9. Performance Constraints

- **Zero schema changes.** Only reads existing tables/views.
- **Zero cron.** Producers run in-browser via react-query, `staleTime: 60_000`, `gcTime: 5m`.
- **Zero ML / external AI.** Pure deterministic TypeScript.
- **Batching.** Each domain producer performs ≤ 4 Supabase reads and shares data with the Phase G bus so dashboards fetch once.
- **Bounded rows.** All reads use existing pagination limits (≤ 2000 rows) matching current `executive/*` patterns.
- **On-demand.** Producers execute only when a surface subscribes; heavy ones (customer segmentation for cross-sell) are lazily loaded from the Customer Intelligence page and cached.
- **No writes.** Framework is read-only; actions are triggered by the user via existing routes.

## Roadmap (build order, incremental, no schema changes)

1. **G.0.1 Foundation:** `score.ts`, `baselines.ts`, `Explanation` type, `thresholds.ts`.
2. **G.0.2 Sales predictors:** conversion, cold, repeat, churn-sales.
3. **G.0.3 Finance predictors:** payment delay, cash shortage overlay, vendor conflict, margin erosion.
4. **G.0.4 Ops predictors:** dispatch risk, bottleneck, install conflict.
5. **G.0.5 Procurement predictors:** stock-out, preferred vendor, batching.
6. **G.0.6 Customer success predictors:** churn, upsell, cross-sell, VIP.
7. **G.0.7 Recommendation rewriter + Copilot integration** (imperative phrasing, dedup, interrupts).

## Success Criteria

- Every prediction is deterministic, reproducible, and traceable to concrete rows.
- No black-box outputs; every card exposes signals + records + expected outcome.
- No new tables, cron, ML, or external calls.
- Owner sees the top 5 recommended actions of the day on Command Centre, each with confidence and one-click execution.

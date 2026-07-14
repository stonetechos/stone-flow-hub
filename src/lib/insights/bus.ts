/**
 * Insight Bus — lightweight pub/sub for real-time, push-style insight
 * events (Phase G.1 infrastructure).
 *
 * Distinct from the Insight Registry: the registry manages *pollable*
 * producers fetched on a fixed cadence via react-query (60s staleTime, see
 * ./hooks). The bus is for one-off insights a feature can emit the moment
 * they happen — e.g. "PO approved", "payment just crossed 30 days overdue"
 * — without waiting for the next poll.
 *
 * Phase G.1 wires the plumbing only; nothing in the app calls `emitInsight`
 * yet.
 */
import type { Insight } from "./types";

type Listener = (insight: Insight) => void;

const listeners = new Set<Listener>();

/** Most recently emitted insights (newest first), replayed to new
 *  subscribers so a late-mounting component (e.g. a freshly opened
 *  dashboard) still sees recent activity instead of starting blank. */
const buffer: Insight[] = [];
const BUFFER_SIZE = 50;

/** Publish an insight to every current subscriber. */
export function emitInsight(insight: Insight): void {
  buffer.unshift(insight);
  buffer.length = Math.min(buffer.length, BUFFER_SIZE);
  for (const listener of listeners) listener(insight);
}

/** Subscribe to newly emitted insights. Returns an unsubscribe function. */
export function subscribeInsightBus(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Snapshot of recently emitted insights, most recent first. */
export function getInsightBufferSnapshot(): readonly Insight[] {
  return buffer;
}

/** Test/dev helper — clears the buffer and all listeners. */
export function resetInsightBus(): void {
  buffer.length = 0;
  listeners.clear();
}

/**
 * Tests for the "note_followup" Action Registry handler
 * (actions/noteFollowup.ts) — calls the same createFollowup() the manual
 * follow-up form calls (ADR-0001 requirement 2).
 *
 * Uses the shared, full-shape module mock from testSupport/moduleMocks.ts.
 * Captures its own handler reference once at import time — see
 * logEnquiry.test.ts's header comment for why, given registry.ts's
 * process-wide singleton Map.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { followupsApiMock, resetAllModuleMocks } from "../testSupport/moduleMocks";
import { getVieAction } from "./registry";

await import("./noteFollowup");
const handler = getVieAction("note_followup");
if (!handler) throw new Error("note_followup handler failed to self-register on import");

describe("note_followup action handler", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  test("missing entity_type -> throws without calling createFollowup", async () => {
    await expect(
      handler({ entity_id: "enq-1", scheduled_at: "2026-07-23T00:00:00.000Z" }),
    ).rejects.toThrow(/unresolved entity\/date/);
    expect(followupsApiMock.createFollowup).not.toHaveBeenCalled();
  });

  test("missing entity_id -> throws without calling createFollowup", async () => {
    await expect(
      handler({ entity_type: "enquiry", scheduled_at: "2026-07-23T00:00:00.000Z" }),
    ).rejects.toThrow(/unresolved entity\/date/);
    expect(followupsApiMock.createFollowup).not.toHaveBeenCalled();
  });

  test("missing scheduled_at -> throws without calling createFollowup", async () => {
    await expect(handler({ entity_type: "enquiry", entity_id: "enq-1" })).rejects.toThrow(
      /unresolved entity\/date/,
    );
    expect(followupsApiMock.createFollowup).not.toHaveBeenCalled();
  });

  test("valid params with an explicit channel -> calls createFollowup with the exact expected shape", async () => {
    followupsApiMock.createFollowup.mockImplementation(async () => ({ id: "fu-1" }));

    const result = await handler({
      entity_type: "enquiry",
      entity_id: "enq-1",
      scheduled_at: "2026-07-23T00:00:00.000Z",
      channel: "whatsapp",
      notes: "Call back after site visit",
    });

    expect(followupsApiMock.createFollowup).toHaveBeenCalledWith({
      entity_type: "enquiry",
      entity_id: "enq-1",
      scheduled_at: "2026-07-23T00:00:00.000Z",
      channel: "whatsapp",
      notes: "Call back after site visit",
    });
    expect(result).toEqual({ linkedRecordType: "followup", linkedRecordId: "fu-1" });
  });

  test("channel omitted -> defaults to 'call'", async () => {
    followupsApiMock.createFollowup.mockImplementation(async () => ({ id: "fu-2" }));
    await handler({
      entity_type: "enquiry",
      entity_id: "enq-1",
      scheduled_at: "2026-07-23T00:00:00.000Z",
    });
    expect(followupsApiMock.createFollowup).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "call" }),
    );
  });

  test("channel outside the known enum -> falls back to 'call' rather than passing through a bad value", async () => {
    followupsApiMock.createFollowup.mockImplementation(async () => ({ id: "fu-3" }));
    await handler({
      entity_type: "enquiry",
      entity_id: "enq-1",
      scheduled_at: "2026-07-23T00:00:00.000Z",
      channel: "sms",
    });
    expect(followupsApiMock.createFollowup).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "call" }),
    );
  });

  test("notes omitted -> passed through as undefined", async () => {
    followupsApiMock.createFollowup.mockImplementation(async () => ({ id: "fu-4" }));
    await handler({
      entity_type: "enquiry",
      entity_id: "enq-1",
      scheduled_at: "2026-07-23T00:00:00.000Z",
    });
    expect(followupsApiMock.createFollowup).toHaveBeenCalledWith(
      expect.objectContaining({ notes: undefined }),
    );
  });
});

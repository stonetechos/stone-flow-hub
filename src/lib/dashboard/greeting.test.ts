import { describe, expect, it } from "bun:test";
import { getNocturnalQuip, greetingFor, isNocturnalHour, NOCTURNAL_QUIPS } from "./greeting";

describe("greeting utility", () => {
  it("identifies nocturnal hours (12:00 AM to 3:59 AM)", () => {
    // 12:00 AM midnight
    const midnight = new Date("2026-10-09T00:00:00");
    expect(isNocturnalHour(midnight)).toBe(true);
    expect(greetingFor(midnight)).toBe("Yo, Nocturnal!!");

    // 01:30 AM
    const oneAm = new Date("2026-10-09T01:30:00");
    expect(isNocturnalHour(oneAm)).toBe(true);
    expect(greetingFor(oneAm)).toBe("Yo, Nocturnal!!");

    // 03:59 AM
    const threeFiftyNineAm = new Date("2026-10-09T03:59:59");
    expect(isNocturnalHour(threeFiftyNineAm)).toBe(true);
    expect(greetingFor(threeFiftyNineAm)).toBe("Yo, Nocturnal!!");
  });

  it("switches to morning greeting from 4:00 AM onwards", () => {
    const fourAm = new Date("2026-10-09T04:00:00");
    expect(isNocturnalHour(fourAm)).toBe(false);
    expect(greetingFor(fourAm)).toBe("Good morning");

    const elevenAm = new Date("2026-10-09T11:59:59");
    expect(isNocturnalHour(elevenAm)).toBe(false);
    expect(greetingFor(elevenAm)).toBe("Good morning");
  });

  it("greets with Good afternoon between 12:00 PM and 4:59 PM", () => {
    const noon = new Date("2026-10-09T12:00:00");
    expect(isNocturnalHour(noon)).toBe(false);
    expect(greetingFor(noon)).toBe("Good afternoon");

    const fourThirtyPm = new Date("2026-10-09T16:30:00");
    expect(isNocturnalHour(fourThirtyPm)).toBe(false);
    expect(greetingFor(fourThirtyPm)).toBe("Good afternoon");
  });

  it("greets with Good evening from 5:00 PM to 11:59 PM", () => {
    const fivePm = new Date("2026-10-09T17:00:00");
    expect(isNocturnalHour(fivePm)).toBe(false);
    expect(greetingFor(fivePm)).toBe("Good evening");

    const elevenPm = new Date("2026-10-09T23:59:59");
    expect(isNocturnalHour(elevenPm)).toBe(false);
    expect(greetingFor(elevenPm)).toBe("Good evening");
  });

  it("provides funny quips during nocturnal hours", () => {
    const quip = getNocturnalQuip(new Date("2026-10-09T01:00:00"));
    expect(NOCTURNAL_QUIPS).toContain(quip as (typeof NOCTURNAL_QUIPS)[number]);
  });
});

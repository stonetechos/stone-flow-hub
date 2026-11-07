import { describe, it, expect } from "bun:test";

describe("Website Catalog Position Jumping & Lossless Picture Rotation", () => {
  it("correctly simulates moveToPosition moving item from rank 184 to 34", () => {
    // Generate 284 test products
    const items = Array.from({ length: 284 }, (_, i) => ({
      id: `ST-WC-${String(i + 1).padStart(3, "0")}`,
      name: `Pattern ${i + 1}`,
      index: i + 1,
    }));

    const sourceId = "ST-WC-184";
    const targetPosition = 34;

    const currentList = [...items];
    const sourceIndex = currentList.findIndex((p) => p.id === sourceId);
    expect(sourceIndex).toBe(183); // 0-based index for item 184

    const targetIndex = targetPosition - 1; // 33 for position 34
    const [movedItem] = currentList.splice(sourceIndex, 1);
    currentList.splice(targetIndex, 0, movedItem);

    // Re-number products strictly by 1-based sequential position
    const renumbered = currentList.map((item, idx) => ({
      ...item,
      index: idx + 1,
      code: `ST-WC-${String(idx + 1).padStart(3, "0")}`,
    }));

    // The moved item must now be at position #34
    expect(renumbered[33].id).toBe("ST-WC-184");
    expect(renumbered[33].index).toBe(34);
    expect(renumbered[33].code).toBe("ST-WC-034");

    // The item that was previously at position 34 (ST-WC-034) must now be shifted to #35
    expect(renumbered[34].id).toBe("ST-WC-034");
    expect(renumbered[34].index).toBe(35);
    expect(renumbered[34].code).toBe("ST-WC-035");

    // The total length must remain intact
    expect(renumbered.length).toBe(284);
  });

  it("handles bounds checking when target position is out of range", () => {
    const totalItems = 284;
    const clampTarget = (pos: number) => Math.max(1, Math.min(totalItems, Math.round(pos)));

    expect(clampTarget(-5)).toBe(1);
    expect(clampTarget(0)).toBe(1);
    expect(clampTarget(999)).toBe(284);
    expect(clampTarget(50.4)).toBe(50);
  });

  it("calculates lossless rotation angles normalized to 0, 90, 180, 270 degrees", () => {
    const calcRotation = (current: number, delta: number) => {
      const raw = (current + delta) % 360;
      return (raw + 360) % 360;
    };

    // Starting at 0°:
    expect(calcRotation(0, 90)).toBe(90);
    expect(calcRotation(0, -90)).toBe(270);
    expect(calcRotation(0, 180)).toBe(180);

    // Starting at 90°:
    expect(calcRotation(90, 90)).toBe(180);
    expect(calcRotation(90, -90)).toBe(0);

    // Starting at 180°:
    expect(calcRotation(180, 90)).toBe(270);
    expect(calcRotation(180, 180)).toBe(0);

    // Starting at 270°:
    expect(calcRotation(270, 90)).toBe(0);
    expect(calcRotation(270, -90)).toBe(180);
  });
});

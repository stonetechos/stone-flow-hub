import { describe, expect, test } from "bun:test";
import { findNavItemForPath, isNavItemActive, NAV_ITEMS_BY_ID, NAV_GROUPS } from "./config";

describe("Navigation active item resolution", () => {
  const employeesItem = NAV_ITEMS_BY_ID["wf-employees"];
  const wfTodayItem = NAV_ITEMS_BY_ID["wf-today"];
  const customersItem = NAV_ITEMS_BY_ID["customers"];

  test("defines both wf-employees and wf-today items", () => {
    expect(employeesItem).toBeDefined();
    expect(wfTodayItem).toBeDefined();
    expect(employeesItem.to).toBe("/workforce-intelligence/employees");
    expect(wfTodayItem.to).toBe("/workforce-intelligence");
  });

  test("when on /workforce-intelligence/employees, only Employees tab is active and NOT Workforce Intelligence", () => {
    const currentPath = "/workforce-intelligence/employees";
    expect(isNavItemActive(employeesItem, currentPath)).toBe(true);
    expect(isNavItemActive(wfTodayItem, currentPath)).toBe(false);
  });

  test("when on a sub-route /workforce-intelligence/employees/123, only Employees tab is active", () => {
    const currentPath = "/workforce-intelligence/employees/123";
    expect(isNavItemActive(employeesItem, currentPath)).toBe(true);
    expect(isNavItemActive(wfTodayItem, currentPath)).toBe(false);
  });

  test("when on root /workforce-intelligence, Workforce Intelligence is active and Employees is not", () => {
    const currentPath = "/workforce-intelligence";
    expect(isNavItemActive(wfTodayItem, currentPath)).toBe(true);
    expect(isNavItemActive(employeesItem, currentPath)).toBe(false);
  });

  test("when on /workforce-intelligence/performance (embedded sub-route of wf-today), Workforce Intelligence is active", () => {
    const currentPath = "/workforce-intelligence/performance";
    expect(isNavItemActive(wfTodayItem, currentPath)).toBe(true);
    expect(isNavItemActive(employeesItem, currentPath)).toBe(false);
  });

  test("unrelated path does not activate either item", () => {
    const currentPath = "/customers";
    expect(isNavItemActive(employeesItem, currentPath)).toBe(false);
    expect(isNavItemActive(wfTodayItem, currentPath)).toBe(false);
    expect(isNavItemActive(customersItem, currentPath)).toBe(true);
  });

  test("findNavItemForPath matches query params correctly", () => {
    const match = findNavItemForPath("/payments?tab=customer");
    expect(match?.id).toBe("payments");

    const fallbackMatch = findNavItemForPath("/payments");
    expect(fallbackMatch?.id).toBe("payments");
  });

  test("when on /money-flow?tab=personal-transfers, only Personal Transfers tab is active and NOT Money Flow", () => {
    const personalTransfersItem = NAV_ITEMS_BY_ID["personal-transfers"];
    const moneyFlowItem = NAV_ITEMS_BY_ID["money-flow"];
    expect(personalTransfersItem).toBeDefined();
    expect(moneyFlowItem).toBeDefined();

    const ptPath = "/money-flow?tab=personal-transfers";
    expect(isNavItemActive(personalTransfersItem, ptPath)).toBe(true);
    expect(isNavItemActive(moneyFlowItem, ptPath)).toBe(false);

    const directPtPath = "/personal-transfers";
    expect(isNavItemActive(personalTransfersItem, directPtPath)).toBe(true);
    expect(isNavItemActive(moneyFlowItem, directPtPath)).toBe(false);

    const mfPath = "/money-flow";
    expect(isNavItemActive(moneyFlowItem, mfPath)).toBe(true);
    expect(isNavItemActive(personalTransfersItem, mfPath)).toBe(false);
  });

  test("places Filing & Compliance inside Accountant tab and removes top-level compliance group", () => {
    const gstItem = NAV_ITEMS_BY_ID["gst"];
    expect(gstItem).toBeDefined();
    expect(gstItem.group).toBe("accountant");
    expect(gstItem.to).toBe("/gst");
    expect(gstItem.label).toBe("Filing & Compliance");

    // Compliance must no longer be an independent top-level group
    const hasTopLevelCompliance = (NAV_GROUPS as readonly { id: string }[]).some(
      (g) => g.id === "compliance",
    );
    expect(hasTopLevelCompliance).toBe(false);

    // Accountant group must exist
    const accountantGroup = (NAV_GROUPS as readonly { id: string }[]).find(
      (g) => g.id === "accountant",
    );
    expect(accountantGroup).toBeDefined();
  });
});

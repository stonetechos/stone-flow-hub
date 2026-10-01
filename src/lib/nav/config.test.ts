import { describe, expect, test } from "bun:test";
import { findNavItemForPath, isNavItemActive, NAV_ITEMS_BY_ID } from "./config";

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

  test("findNavItemForPath strips query params correctly", () => {
    const match = findNavItemForPath("/payments?tab=customer");
    expect(match?.id).toBe("payments");
  });
});

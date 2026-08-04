import { describe, expect, it } from "vitest";
import { buildLoginLookup } from "../lib/login.js";

describe("buildLoginLookup", () => {
  it("builds a case-insensitive email lookup", () => {
    expect(buildLoginLookup("  CHEF@Example.COM ")).toEqual({
      email: { equals: "chef@example.com", mode: "insensitive" },
    });
  });

  it("normalizes usernames with or without an at sign", () => {
    expect(buildLoginLookup("Julia.Child")).toEqual({ username: "julia.child" });
    expect(buildLoginLookup(" @Julia.Child ")).toEqual({ username: "julia.child" });
  });

  it("rejects an empty identifier", () => {
    expect(buildLoginLookup("   ")).toBeNull();
  });
});

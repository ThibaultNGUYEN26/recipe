import { describe, expect, it } from "vitest";
import { normalizeUsername, validateUsername } from "../lib/username.js";

describe("username validation", () => {
  it("normalizes handles to a canonical lowercase value", () => {
    expect(normalizeUsername("  @Chef.Jane_7 ")).toBe("chef.jane_7");
  });

  it.each(["ab", "a".repeat(31), "chef jane", "chef-name", "chef/one"])(
    "rejects invalid username %s",
    (value) => expect(validateUsername(value).error).toBeTruthy(),
  );

  it.each(["chef_123", "jane.doe", "007"])("accepts valid username %s", (value) => {
    expect(validateUsername(value)).toEqual({ username: value, error: null });
  });
});

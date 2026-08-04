import { describe, expect, it } from "vitest";
import { normalizeUsername, usernameSuggestionCandidates, validateUsername } from "../lib/username.js";

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

  it("generates valid alternatives for a taken username", () => {
    const suggestions = usernameSuggestionCandidates("chef.jane");
    expect(suggestions).toEqual(["chef.jane.recipes", "chef.jane_recipes", "the.chef.jane", "chef.jane_1", "chef.jane01"]);
    expect(suggestions.every((username) => validateUsername(username).error === null)).toBe(true);
  });

  it("keeps suggested usernames within the maximum length", () => {
    expect(usernameSuggestionCandidates("a".repeat(30)).every((username) => username.length <= 30)).toBe(true);
  });
});

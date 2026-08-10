import { normalizeUsername } from "./username.js";

export function buildLoginLookup(identifier) {
  const value = String(identifier ?? "").trim();

  if (!value) return null;

  if (value.startsWith("@") || !value.includes("@")) {
    return { username: normalizeUsername(value) };
  }

  return {
    email: {
      equals: value.toLowerCase(),
      mode: "insensitive",
    },
  };
}

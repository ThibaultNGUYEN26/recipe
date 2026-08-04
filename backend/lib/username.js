export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const USERNAME_PATTERN = /^[a-z0-9._]+$/;

export function normalizeUsername(value) {
  return typeof value === "string" ? value.trim().replace(/^@+/, "").toLowerCase() : "";
}

export function validateUsername(value) {
  const username = normalizeUsername(value);

  if (!username) return { username, error: "Username is required" };
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return { username, error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters` };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { username, error: "Username can only contain letters, numbers, periods, and underscores" };
  }

  return { username, error: null };
}


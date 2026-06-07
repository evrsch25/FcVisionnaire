import { createHmac } from "crypto";

export const ADMIN_COOKIE_NAME = "fc_admin_session";

function sessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", "fc-visionnaire-admin-v1")
    .update(password)
    .digest("hex");
}

export function isValidAdminSession(cookieValue: string | undefined): boolean {
  const expected = sessionToken();
  if (!expected || !cookieValue) return false;
  return cookieValue === expected;
}

export function createAdminSessionValue(): string | null {
  return sessionToken();
}

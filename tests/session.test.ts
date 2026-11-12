import { beforeAll, describe, expect, it } from "vitest";
import { checkPassword, createSessionToken, verifySessionToken } from "@/lib/auth/session";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret-test-secret-test-secret-123";
  process.env.ADMIN_PASSWORD = "richtiges-passwort";
});

describe("Admin-Sitzung", () => {
  it("akzeptiert gültige und lehnt manipulierte Tokens ab", async () => {
    const t = await createSessionToken();
    expect(await verifySessionToken(t)).toBe(true);
    expect(await verifySessionToken(t.replace(/.$/, (c) => (c === "A" ? "B" : "A")))).toBe(false);
    expect(await verifySessionToken("admin.9999999999.x")).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
  });
  it("lässt abgelaufene Tokens nicht zu", async () => {
    const t = await createSessionToken(Date.now() - 13 * 3600 * 1000);
    expect(await verifySessionToken(t)).toBe(false);
  });
  it("prüft das Passwort", async () => {
    expect(await checkPassword("richtiges-passwort")).toBe(true);
    expect(await checkPassword("falsch")).toBe(false);
  });
});

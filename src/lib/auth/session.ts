/**
 * Minimalistische Admin-Sitzung: HMAC-signiertes Cookie (Web Crypto, läuft in Proxy und Node).
 * Für mehrere Redakteure kann dies später durch Supabase Auth ersetzt werden.
 */
export const SESSION_COOKIE = "rm_admin";
export const SESSION_TTL_S = 60 * 60 * 12;

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET muss gesetzt und mindestens 32 Zeichen lang sein.");
  return s;
}

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_TTL_S;
  const payload = `admin.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < now) return false;
  try {
    return safeEqual(parts[2], await hmac(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;
  // Vergleich über Hashes, damit die Laufzeit nicht von der Länge abhängt
  const [a, b] = await Promise.all([hmac(`pw:${input}`), hmac(`pw:${expected}`)]);
  return safeEqual(a, b);
}

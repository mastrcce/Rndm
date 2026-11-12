import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** In jeder Admin-Seite und Server-Aktion aufrufen (zusätzlich zur Prüfung in proxy.ts). */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

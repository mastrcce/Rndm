import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin-Anmeldung", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-3xl font-medium">Admin-Bereich</h1>
      <p className="mt-2 text-sm text-muted">Bitte mit dem Redaktionspasswort anmelden.</p>
      <LoginForm />
    </div>
  );
}

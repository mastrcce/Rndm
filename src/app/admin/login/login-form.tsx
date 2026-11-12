"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="mt-6 space-y-4 rounded-xl2 border border-line bg-white p-6 shadow-soft">
      <div>
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">Anmelden</Button>
    </form>
  );
}

"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Change the account password (email sign-up) or 6-digit passcode (mobile sign-up). */
export function ChangeSecretCard({ kind }: { kind: "password" | "passcode" }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const isPasscode = kind === "passcode";
  const clean = (v: string) => (isPasscode ? v.replace(/\D/g, "").slice(0, 6) : v);

  const change = useMutation({
    mutationFn: () => api("/api/profile/password", { method: "PUT", json: { currentSecret: form.current, newSecret: form.next } }),
    onSuccess: () => {
      toast.success(`${isPasscode ? "Passcode" : "Password"} changed. Other devices were signed out.`);
      setForm({ current: "", next: "", confirm: "" });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't change it. Try again."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.next !== form.confirm) return setError(`New ${kind}s don't match`);
    change.mutate();
  }

  const field = (id: keyof typeof form, label: string, autoComplete: string) => (
    <div className="space-y-2">
      <Label htmlFor={`cs-${id}`}>{label}</Label>
      <Input id={`cs-${id}`} type="password" autoComplete={autoComplete} inputMode={isPasscode ? "numeric" : undefined} maxLength={isPasscode ? 6 : 128} value={form[id]} onChange={(e) => setForm({ ...form, [id]: clean(e.target.value) })} required />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change {kind}</CardTitle>
        <CardDescription>{isPasscode ? "Your passcode is 6 digits." : "At least 8 characters, with a letter and a number."} Changing it signs out your other devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
          {field("current", `Current ${kind}`, "current-password")}
          {field("next", `New ${kind}`, "new-password")}
          {field("confirm", `Confirm new ${kind}`, "new-password")}
          {error && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-3">{error}</p>}
          <div className="sm:col-span-3">
            <Button type="submit" disabled={change.isPending || !form.current || !form.next || !form.confirm}>
              {change.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound />} Change {kind}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

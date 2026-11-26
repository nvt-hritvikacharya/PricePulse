import { handler, json } from "@/lib/api";
import { requireUser, touchSession } from "@/features/auth/server/session";

/** Called (throttled) by the client on user interaction to slide the idle window. */
export const POST = handler(async () => {
  const user = await requireUser();
  const expiresAt = await touchSession(user);
  return json({ ok: true, expiresAt });
});

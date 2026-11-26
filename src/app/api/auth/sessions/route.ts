import { handler, json } from "@/lib/api";
import { requireUser } from "@/features/auth/server/session";
import { listUserSessions } from "@/server/auth/sessions";

/** The signed-in user's login history (latest 20 sessions). */
export const GET = handler(async () => {
  const user = await requireUser();
  const sessions = await listUserSessions(user.id);
  return json({ currentSessionId: user.sessionId, sessions });
});

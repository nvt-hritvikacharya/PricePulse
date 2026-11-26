import { handler, HttpError, json } from "@/lib/api";
import { getCurrentUser } from "@/features/auth/server/session";

export const GET = handler(async () => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not signed in", "unauthenticated");
  return json({ user });
});

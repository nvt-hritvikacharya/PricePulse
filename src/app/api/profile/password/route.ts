import { z } from "zod";
import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { hashSecret } from "@/lib/passwords";
import { requireUser } from "@/features/auth/server/session";
import { newSecretFor } from "@/features/auth/schemas";
import { assertCurrentSecret, credentialKind } from "@/server/auth/accounts";

/** Changes the password (email accounts) or passcode (mobile accounts); signs out other sessions. */
export const PUT = handler(async (req: Request) => {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { authMethod: true } });
  const body = z.object({ currentSecret: z.string().max(128), newSecret: newSecretFor(credentialKind(user)) }).parse(await req.json());
  await assertCurrentSecret(me.id, body.currentSecret);
  await db.$transaction([
    db.user.update({ where: { id: me.id }, data: { passwordHash: await hashSecret(body.newSecret), failedLoginCount: 0, lockedUntil: null } }),
    db.session.updateMany({ where: { userId: me.id, revokedAt: null, id: { not: me.sessionId } }, data: { revokedAt: new Date() } }),
  ]);
  return json({ ok: true });
});

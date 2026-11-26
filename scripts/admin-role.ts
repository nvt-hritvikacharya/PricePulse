/**
 * Grants or revokes the ADMIN role. Admin rights are never derived from an email or phone number,
 * because sign-up doesn't prove ownership of either.
 *   npm run admin:grant -- someone@example.com
 *   npm run admin:revoke -- +919876543210
 */
import { PrismaClient } from "@prisma/client";

const [action, identifier] = process.argv.slice(2);
if (!["grant", "revoke"].includes(action ?? "") || !identifier) {
  console.error("Usage: tsx scripts/admin-role.ts <grant|revoke> <email|+91phone>");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  const id = identifier.trim().toLowerCase();
  const where = id.includes("@") ? { email: id } : { phone: id.startsWith("+") ? id : `+91${id.replace(/\D/g, "").slice(-10)}` };
  const user = await db.user.findUnique({ where });
  if (!user) {
    console.error(`No account found for ${identifier}`);
    process.exitCode = 1;
    return;
  }
  await db.user.update({ where: { id: user.id }, data: { role: action === "grant" ? "ADMIN" : "USER" } });
  console.log(`${action === "grant" ? "Granted" : "Revoked"} ADMIN for ${user.name ?? identifier}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

import type { Metadata } from "next";
import { getCurrentUser } from "@/features/auth/server/session";
import { HomeView } from "@/features/search/components/home-view";

export const metadata: Metadata = { title: "Search & compare prices" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? null;
  return <HomeView firstName={firstName} />;
}

import type { Metadata } from "next";
import { ProfileView } from "@/features/profile/components/profile-view";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Profile & settings" };

export default function ProfilePage() {
  return <ProfileView idleMinutes={env.SESSION_IDLE_MINUTES} />;
}

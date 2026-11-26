import type { Metadata } from "next";
import { AlertsView } from "@/features/alerts/components/alerts-view";

export const metadata: Metadata = { title: "Price alerts" };

export default function AlertsPage() {
  return <AlertsView />;
}

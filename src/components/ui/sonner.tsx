"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return <Sonner theme={(resolvedTheme as "light" | "dark") ?? "system"} position="bottom-right" mobileOffset={{ bottom: 96 }} richColors closeButton toastOptions={{ className: "!rounded-2xl" }} />;
}

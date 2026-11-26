"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Route-level error boundary. */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="grid min-h-[60dvh] place-items-center p-6 text-center">
      <div className="glass max-w-md rounded-3xl p-10" role="alert">
        <AlertTriangle className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 font-display text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.digest ? `Reference: ${error.digest}` : "An unexpected error occurred while loading this page."}</p>
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </main>
  );
}

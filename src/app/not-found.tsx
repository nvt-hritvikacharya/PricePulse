import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="glass max-w-md rounded-3xl p-10">
        <p className="text-gradient font-display text-6xl font-extrabold">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold">This page went out of stock</h1>
        <p className="mt-2 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Button asChild className="mt-6">
          <Link href="/home">Back to search</Link>
        </Button>
      </div>
    </main>
  );
}

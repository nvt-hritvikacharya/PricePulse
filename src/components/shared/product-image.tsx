"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Product image with consistent framing. Photos come from retailer/brand CDNs (via provider APIs
 * or image search) and load straight from the source; generated artwork covers the rest.
 */
export function ProductImage({ src, alt, className, priority, sizes = "(max-width: 768px) 50vw, 25vw" }: { src: string | null; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const generated = !!src && src.startsWith("/api/img");
  const show = src && failed !== src;
  return (
    <div className={cn("relative overflow-hidden rounded-xl", generated || !show ? "bg-muted" : "bg-white", className)}>
      {show ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
          className={generated ? "object-cover" : "object-contain p-3"}
        />
      ) : (
        <div className="grid size-full place-items-center gap-1 text-xs text-muted-foreground">
          <ImageOff className="size-6" aria-hidden />
          No image
        </div>
      )}
    </div>
  );
}

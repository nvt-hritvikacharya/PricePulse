import Image from "next/image";
import { cn } from "@/lib/utils";

/** Product image with consistent framing. Generated demo SVGs and remote CDNs are both supported. */
export function ProductImage({ src, alt, className, priority, sizes = "(max-width: 768px) 50vw, 25vw" }: { src: string | null; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.startsWith("/api/img") || src.endsWith(".svg")} className="object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-xs text-muted-foreground">No image</div>
      )}
    </div>
  );
}

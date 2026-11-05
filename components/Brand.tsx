import Image from "next/image";
import { cn } from "@/components/ui";

export function OwlMark({ size = 40, className, glow = false }: { size?: number; className?: string; glow?: boolean }) {
  return (
    <Image
      src="/gowl-mark.png"
      alt="Green Owl Labs"
      width={size}
      height={size}
      className={cn("owl-mark", glow && "owl-glow", className)}
      draggable={false}
      priority
    />
  );
}

export function Wordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("wordmark", compact && "wordmark-compact", className)}>
      <span className="wordmark-main">
        Green <em>Owl</em>
      </span>
      {!compact ? <span className="wordmark-sub">Landfill 3D</span> : null}
    </div>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("brand-lockup", compact && "brand-lockup-compact")}>
      <OwlMark size={compact ? 32 : 40} />
      <div className="brand-copy">
        <Wordmark compact={compact} />
        {!compact ? <span className="brand-tagline">Environmental engineering laboratory</span> : null}
      </div>
    </div>
  );
}

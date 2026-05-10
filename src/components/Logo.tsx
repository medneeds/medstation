import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: "h-7 w-7", text: "text-base" },
  md: { img: "h-10 w-10", text: "text-xl" },
  lg: { img: "h-14 w-14", text: "text-2xl" },
  xl: { img: "h-20 w-20", text: "text-4xl" },
};

export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl opacity-60" aria-hidden />
        <img
          src="/favicon.png"
          alt="MedStation AI"
          className={cn("relative rounded-2xl object-contain", s.img)}
        />
      </div>
      {showWordmark && (
        <span className={cn("font-display font-medium tracking-tight text-foreground", s.text)}>
          MedStation<span className="text-primary"> AI</span>
        </span>
      )}
    </div>
  );
}

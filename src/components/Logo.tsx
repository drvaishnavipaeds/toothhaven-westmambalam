import markAsset from "@/assets/tooth-haven-mark.png.asset.json";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** "teal" for light backgrounds, "white" for coloured/dark backgrounds */
  tone?: "teal" | "white";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: "h-9 w-9", name: "text-base", sub: "text-[10px]", tag: "text-[10px]" },
  md: { mark: "h-12 w-12", name: "text-xl", sub: "text-[11px]", tag: "text-[11px]" },
  lg: { mark: "h-24 w-24 md:h-28 md:w-28", name: "text-3xl md:text-4xl", sub: "text-sm md:text-base", tag: "text-xs md:text-sm" },
} as const;

const Logo = ({ tone = "teal", size = "md", showTagline = false, className }: LogoProps) => {
  const s = sizes[size];
  // The asset proxy is not available on localhost; the published origin serves the same immutable asset in every preview.
  const src = `https://toothhaven-in.lovable.app${markAsset.url}`;

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={src}
        alt="Tooth Haven Advanced Dental Care logo"
        className={cn(s.mark, "object-contain shrink-0", tone === "white" && "brightness-0 invert")}
        loading="eager"
        decoding="async"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            s.name,
            "font-heading font-bold tracking-[0.14em]",
            tone === "white" ? "text-primary-foreground" : "text-primary-dark",
          )}
        >
          TOOTH HAVEN
        </span>
        <span
          className={cn(
            s.sub,
            "mt-1 font-medium tracking-[0.22em] uppercase",
            tone === "white" ? "text-primary-foreground/80" : "text-primary",
          )}
        >
          Advanced Dental Care
        </span>
        {showTagline && (
          <span
            className={cn(
              s.tag,
              "mt-1.5 italic tracking-wide",
              tone === "white" ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            One Stop for All Dental Solutions
          </span>
        )}
      </span>
    </span>
  );
};

export default Logo;

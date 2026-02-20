import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RegimeBadgeProps {
  regime: string;
  size?: "sm" | "default";
  className?: string;
}

const regimeConfig: Record<string, { label: string; className: string }> = {
  tva_18: { label: "TVA 18%", className: "bg-blue-600 hover:bg-blue-700" },
  sans_tva: { label: "Sans TVA", className: "bg-green-600 hover:bg-green-700" },
  brs_5: { label: "BRS 5%", className: "bg-purple-600 hover:bg-purple-700" },
};

export function RegimeBadge({ regime, size = "default", className }: RegimeBadgeProps) {
  const config = regimeConfig[regime] || { label: regime, className: "bg-gray-500" };

  return (
    <Badge
      className={cn(
        config.className,
        size === "sm" && "text-xs px-1.5 py-0.5",
        className
      )}
      data-testid={`badge-regime-${regime}`}
    >
      {config.label}
    </Badge>
  );
}

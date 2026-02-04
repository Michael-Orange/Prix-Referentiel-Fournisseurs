import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  actif: boolean;
  className?: string;
}

export function StatusBadge({ actif, className }: StatusBadgeProps) {
  return (
    <Badge 
      variant={actif ? "default" : "secondary"}
      className={cn(
        actif ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600",
        className
      )}
      data-testid={`badge-status-${actif ? "actif" : "inactif"}`}
    >
      {actif ? "Actif" : "Inactif"}
    </Badge>
  );
}

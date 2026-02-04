import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TVABadgeProps {
  tvaApplicable: boolean;
  tauxTVA?: number;
  tvaOverride?: boolean;
  size?: "sm" | "default";
  className?: string;
}

export function TVABadge({ 
  tvaApplicable, 
  tauxTVA, 
  tvaOverride = false,
  size = "default",
  className 
}: TVABadgeProps) {
  const displayTaux = tauxTVA !== undefined ? tauxTVA : (tvaApplicable ? 18 : 0);
  const isTVA = displayTaux > 0;

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Badge 
        variant={isTVA ? "default" : "secondary"}
        className={cn(
          size === "sm" && "text-xs px-1.5 py-0.5"
        )}
        data-testid={`badge-tva-${isTVA ? "18" : "0"}`}
      >
        {isTVA ? `TVA ${displayTaux}%` : "Sans TVA"}
      </Badge>
      {tvaOverride && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle 
              className="h-4 w-4 text-destructive cursor-help" 
              data-testid="icon-tva-override"
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>TVA modifiée manuellement (différent du profil fournisseur)</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  documents_required: "border-destructive/30 bg-destructive/10 text-destructive",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  approved: "border-success/30 bg-success/10 text-success",
  completed: "border-success/30 bg-success/10 text-success",
  verified: "border-success/30 bg-success/10 text-success",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        TONES[status] ?? "border-primary/30 bg-primary/10 text-primary",
        className,
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}

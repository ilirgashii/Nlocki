import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  "data-ocid"?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  "data-ocid": ocid,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-8 text-center ${className}`}
      data-ocid={ocid ?? "empty_state"}
    >
      <div className="mb-4 p-4 rounded-2xl bg-primary/10 text-primary">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="font-display font-semibold text-lg text-foreground mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
          data-ocid="empty_state.primary_button"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

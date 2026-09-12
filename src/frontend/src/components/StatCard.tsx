import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  trendPct?: number;
  accent?: boolean;
  color?: "pink" | "blue" | "green" | "purple" | "orange";
}

const colorMap = {
  pink: {
    bg: "bg-primary/10",
    icon: "text-primary",
    border: "border-primary/25 hover:border-primary/50",
    dot: "oklch(var(--primary))",
  },
  blue: {
    bg: "bg-[oklch(0.65_0.14_255/0.12)]",
    icon: "text-[oklch(0.65_0.14_255)]",
    border:
      "border-[oklch(0.65_0.14_255/0.25)] hover:border-[oklch(0.65_0.14_255/0.5)]",
    dot: "oklch(0.65 0.14 255)",
  },
  green: {
    bg: "bg-[oklch(0.65_0.15_145/0.12)]",
    icon: "text-[oklch(0.65_0.15_145)]",
    border:
      "border-[oklch(0.65_0.15_145/0.25)] hover:border-[oklch(0.65_0.15_145/0.5)]",
    dot: "oklch(0.65 0.15 145)",
  },
  purple: {
    bg: "bg-[oklch(0.62_0.18_300/0.12)]",
    icon: "text-[oklch(0.62_0.18_300)]",
    border:
      "border-[oklch(0.62_0.18_300/0.25)] hover:border-[oklch(0.62_0.18_300/0.5)]",
    dot: "oklch(0.62 0.18 300)",
  },
  orange: {
    bg: "bg-[oklch(0.7_0.18_60/0.12)]",
    icon: "text-[oklch(0.7_0.18_60)]",
    border:
      "border-[oklch(0.7_0.18_60/0.25)] hover:border-[oklch(0.7_0.18_60/0.5)]",
    dot: "oklch(0.7 0.18 60)",
  },
};

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  trendPct,
  accent,
  color = "pink",
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <Card
      className={`p-5 flex flex-col gap-3 transition-smooth cursor-default group
        ${accent ? `${c.border} border` : "border-border hover:border-primary/30"}
        bg-card hover:shadow-elevated`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {label}
        </span>
        <div
          className={`p-2 rounded-lg transition-smooth ${accent ? c.bg : `bg-muted group-hover:${c.bg}`}`}
        >
          <Icon
            className={`w-4 h-4 transition-smooth ${accent ? c.icon : `text-muted-foreground group-hover:${c.icon}`}`}
          />
        </div>
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-display font-bold text-foreground leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground mb-0.5 leading-none">
            {unit}
          </span>
        )}
      </div>

      {(trendValue || trendPct !== undefined) && (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {trend === "up" && (
            <TrendingUp
              className="w-3 h-3"
              style={{ color: "oklch(0.72 0.17 145)" }}
            />
          )}
          {trend === "down" && (
            <TrendingDown
              className="w-3 h-3"
              style={{ color: "oklch(0.65 0.22 25)" }}
            />
          )}
          <span
            style={
              trend === "up"
                ? { color: "oklch(0.72 0.17 145)" }
                : trend === "down"
                  ? { color: "oklch(0.65 0.22 25)" }
                  : undefined
            }
            className={
              trend === "neutral" || !trend ? "text-muted-foreground" : ""
            }
          >
            {trendPct !== undefined && trend
              ? `${trend === "up" ? "+" : "-"}${Math.abs(trendPct)}% `
              : ""}
            {trendValue}
          </span>
        </div>
      )}
    </Card>
  );
}

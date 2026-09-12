interface MiniProgressBarProps {
  value: number; // 0–100
  label?: string;
  currentLabel?: string; // e.g. "1800 kcal"
  targetLabel?: string; // e.g. "2000 kcal"
  showPercent?: boolean;
  color?: "pink" | "blue" | "green" | "purple" | "orange" | "neutral";
  size?: "xs" | "sm" | "md";
}

const colorFills: Record<NonNullable<MiniProgressBarProps["color"]>, string> = {
  pink: "oklch(var(--primary))",
  blue: "oklch(0.65 0.14 255)",
  green: "oklch(0.65 0.15 145)",
  purple: "oklch(0.62 0.18 300)",
  orange: "oklch(0.7 0.18 60)",
  neutral: "oklch(var(--muted-foreground) / 0.4)",
};

export function MiniProgressBar({
  value,
  label,
  currentLabel,
  targetLabel,
  showPercent = true,
  color = "pink",
  size = "md",
}: MiniProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const fillColor = colorFills[color];
  const height = size === "xs" ? "h-1" : size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full flex flex-col gap-1.5">
      {(label || currentLabel || showPercent) && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {label && (
              <span className="text-xs text-muted-foreground truncate">
                {label}
              </span>
            )}
            {currentLabel && (
              <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                {currentLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {targetLabel && (
              <span className="text-xs text-muted-foreground">
                / {targetLabel}
              </span>
            )}
            {showPercent && (
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: fillColor }}
              >
                {Math.round(pct)}%
              </span>
            )}
          </div>
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-muted overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}

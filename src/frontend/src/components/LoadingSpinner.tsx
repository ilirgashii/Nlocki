interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  size = "md",
  className = "",
  label = "Loading",
}: LoadingSpinnerProps) {
  const sizeMap: Record<string, string> = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-[3px]",
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-label={label}
    >
      <div
        className={`${sizeMap[size]} rounded-full border-border border-t-primary animate-spin`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

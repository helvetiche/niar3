import { memo } from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Memoized spinner component to prevent unnecessary re-renders
 */
export const Spinner = memo(function Spinner({
  size = "md",
  className = "",
}: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={`animate-spin rounded-full border-emerald-500 border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
});

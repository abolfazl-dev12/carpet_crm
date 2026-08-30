import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient" | "bordered";
  hoverEffect?: boolean;
}

export function Card({
  className,
  variant = "default",
  hoverEffect = false,
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      "bg-white dark:bg-slate-900 border border-carpet-cream-border dark:border-slate-800 shadow-sm",
    glass:
      "glass-panel shadow-luxury",
    gradient:
      "bg-gradient-to-br from-white via-carpet-cream to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-carpet-cream-border dark:border-slate-800 shadow-sm",
    bordered:
      "bg-white dark:bg-slate-900 border-2 border-carpet-crimson/20 dark:border-carpet-crimson/30 shadow-sm",
  };

  return (
    <div
      className={clsx(
        "rounded-2xl transition-all duration-200",
        variantStyles[variant],
        hoverEffect && "hover:shadow-cardHover hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

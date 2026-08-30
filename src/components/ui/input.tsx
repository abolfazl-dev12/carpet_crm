import React from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, "-")}` : undefined);

    return (
      <div className="w-full space-y-1.5 text-right">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              "w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900/90 text-sm text-slate-900 dark:text-slate-100 transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-carpet-crimson/20 focus:border-carpet-crimson disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50",
              icon ? "pr-10 pl-3.5" : "px-3.5",
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-carpet-cream-border dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

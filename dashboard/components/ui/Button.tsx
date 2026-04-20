"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-on-dark hover:bg-brand-mid shadow-sm hover:shadow-green active:scale-[0.98]",
  secondary:
    "bg-surface text-[--text-primary] border border-[--border] hover:border-[--border-strong] hover:bg-[--bg-elevated] active:scale-[0.98]",
  ghost:
    "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] active:scale-[0.98]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[--radius-sm] gap-1.5",
  md: "px-4 py-2   text-sm rounded-[--radius-sm] gap-2",
  lg: "px-5 py-2.5 text-sm rounded-[--radius-md] gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "secondary", size = "md", loading = false, icon, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium font-sans
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      style={{ fontFamily: "var(--font-dm-sans, system-ui)" }}
      {...props}
    >
      {loading ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon && <span>{icon}</span>}
      {children}
    </button>
  )
);

Button.displayName = "Button";
export default Button;

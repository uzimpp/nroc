type Variant = "success" | "warning" | "info" | "neutral" | "danger";

interface BadgeProps {
  label: string;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}

const STYLES: Record<Variant, string> = {
  success: "bg-green-50  text-green-700  border-green-200",
  warning: "bg-amber-50  text-amber-700  border-amber-200",
  info:    "bg-sky-50    text-sky-700    border-sky-200",
  neutral: "bg-[--bg-elevated] text-[--text-secondary] border-[--border]",
  danger:  "bg-red-50    text-red-700    border-red-200",
};

const DOT: Record<Variant, string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  info:    "bg-sky-500",
  neutral: "bg-[--text-muted]",
  danger:  "bg-red-500",
};

export default function Badge({ label, variant = "neutral", dot = false, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide ${STYLES[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[variant]}`} />}
      {label}
    </span>
  );
}

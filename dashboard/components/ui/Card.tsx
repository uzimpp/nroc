import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift + shadow deepening */
  interactive?: boolean;
  /** Removes default padding */
  noPad?: boolean;
  /** Extra accent bar on left edge */
  accent?: "green" | "amber" | "red" | "blue" | "none";
}

const ACCENT: Record<string, string> = {
  green: "before:bg-brand-mid",
  amber: "before:bg-amber",
  red:   "before:bg-red-400",
  blue:  "before:bg-blue-400",
  none:  "",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", interactive = false, noPad = false, accent = "none", ...props }, ref) => {
    const accentBar = accent !== "none"
      ? `relative before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:rounded-full ${ACCENT[accent]} overflow-hidden`
      : "";

    return (
      <div
        ref={ref}
        className={`
          card
          ${interactive ? "card-interactive" : "card-lift"}
          ${noPad ? "" : "p-6"}
          ${accentBar}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;

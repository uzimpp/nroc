import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        {eyebrow && <p className="label-caps mb-2">{eyebrow}</p>}
        <h1 className="display text-4xl text-[--text-primary] leading-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-[--text-secondary] max-w-lg">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

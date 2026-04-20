import type { ReactNode } from "react";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".page-title-label", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out" });
    gsap.from(".page-title-heading", { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.08 });
    gsap.from(".page-title-actions", { y: 16, opacity: 0, duration: 0.6, ease: "power2.out", delay: 0.25 });
  }, { scope: ref });

  return (
    <div ref={ref} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        {eyebrow && <p className="page-title-label label-caps mb-2">{eyebrow}</p>}
        <h1 className="page-title-heading display-italic text-4xl sm:text-5xl text-[--text-primary] leading-[0.90] tracking-tighter">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-[--text-secondary] max-w-lg">{description}</p>}
      </div>
      {action && <div className="page-title-actions flex-shrink-0">{action}</div>}
    </div>
  );
}

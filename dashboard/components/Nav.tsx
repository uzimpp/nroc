"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Wheat } from "lucide-react";

gsap.registerPlugin(useGSAP);

const LINKS = [
  { href: "/monitor", label: "Field Monitor" },
  { href: "/growth",  label: "Corn Growth"   },
  { href: "/market",  label: "Market"         },
];

export default function Nav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(ref.current, { y: -56, opacity: 0, duration: 0.7, ease: "power3.out" });
  }, { scope: ref });

  return (
    <header
      ref={ref}
      className="sticky top-0 z-50 w-full bg-[--bg-surface]/85 backdrop-blur-xl border-b border-[--border]"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Wheat size={20} className="text-[--brand-mid]" />
          <span
            className="display text-[22px] text-[--brand] tracking-tight group-hover:text-[--brand-mid] transition-colors"
          >
            Nroc
          </span>
        </Link>

        {/* Links */}
        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  relative px-3.5 py-1.5 rounded-[--radius-sm] text-[13px] font-medium transition-all duration-150
                  ${active
                    ? "text-[--brand] bg-[--brand-light]"
                    : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"}
                `}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[--brand]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

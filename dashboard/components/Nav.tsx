"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Wheat } from "lucide-react";

gsap.registerPlugin(useGSAP);

const LINKS = [
  { href: "/overview", label: "Overview"      },
  { href: "/monitor",  label: "Field Monitor" },
  { href: "/growth",   label: "Corn Growth"   },
  { href: "/market",   label: "Market"        },
];

export default function Nav() {
  const pathname   = usePathname();
  const headerRef  = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef   = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(() => {
    gsap.from(headerRef.current, { y: -56, opacity: 0, duration: 0.7, ease: "power3.out" });
  }, { scope: headerRef });

  useGSAP(() => {
    if (!overlayRef.current || !linksRef.current) return;
    const items = linksRef.current.querySelectorAll(".mobile-link");
    if (open) {
      gsap.set(overlayRef.current, { display: "flex" });
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.22, ease: "power2.out" });
      gsap.fromTo(items,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, duration: 0.38, ease: "power3.out", delay: 0.08 },
      );
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0, duration: 0.18, ease: "power2.in",
        onComplete: () => { if (overlayRef.current) gsap.set(overlayRef.current, { display: "none" }); },
      });
    }
  }, { dependencies: [open] });

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full bg-zinc-950/95 backdrop-blur-xl border-b border-white/8"
      >
        <div className="max-w-[1920px] mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Nroc home">
            <Wheat size={19} className="text-[--brand-mid] text-amber" aria-hidden="true" />
            <span className="display text-[21px] text-white tracking-tight group-hover:text-[--brand-mid] transition-colors duration-200">
              Nroc
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-0.5">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200",
                    active
                      ? "text-white bg-white/10"
                      : "text-white/50 hover:text-white hover:bg-white/6",
                  ].join(" ")}
                >
                  {label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full bg-[--brand-mid]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setOpen(v => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="sm:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-md hover:bg-white/8 transition-colors"
          >
            <span
              className="block w-5 h-[2px] rounded-full bg-white origin-center transition-all duration-300"
              style={{ transform: open ? "translateY(7px) rotate(45deg)" : "none" }}
            />
            <span
              className="block w-5 h-[2px] rounded-full bg-white transition-all duration-300"
              style={{ opacity: open ? 0 : 1, transform: open ? "scaleX(0)" : "none" }}
            />
            <span
              className="block w-5 h-[2px] rounded-full bg-white origin-center transition-all duration-300"
              style={{ transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }}
            />
          </button>
        </div>
      </header>

      {/* Mobile fullscreen overlay */}
      <div
        ref={overlayRef}
        style={{ display: "none", opacity: 0 }}
        className="sm:hidden fixed inset-0 z-40 flex flex-col bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="h-[60px] shrink-0 border-b border-white/8" />
        <div ref={linksRef} className="flex flex-col px-8 pt-8 gap-0">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={[
                  "mobile-link w-full py-5 border-b border-white/8",
                  "text-[28px] font-semibold tracking-tight transition-colors duration-150",
                  active ? "text-white" : "text-white/35 hover:text-white",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

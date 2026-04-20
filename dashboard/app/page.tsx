"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  Activity,
  Sprout,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FEATURES = [
  {
    num: "01",
    title: "Sensor\nIntelligence",
    body: "Real-time IoT telemetry from FARM_001 — temperature, humidity, soil moisture and light intensity streamed continuously from the field.",
    tag: "IoT · MQTT · FARM_001",
    img: "https://picsum.photos/seed/soil-farm/900/700",
  },
  {
    num: "02",
    title: "Weather\nForecasting",
    body: "7-day forecasts from the Thai Meteorological Department integrated into GDD calculations for precise harvest window planning.",
    tag: "TMD · 7-day · GDD",
    img: "https://picsum.photos/seed/overcast-sky/900/700",
  },
];

const NAV_CARDS = [
  {
    href: "/overview",
    Icon: LayoutDashboard,
    title: "Overview",
    desc: "All field conditions, GDD curve, market prices and weather in one view.",
  },
  {
    href: "/monitor",
    Icon: Activity,
    title: "Field Monitor",
    desc: "Deep-dive into sensor history, weather and field conditions over time.",
  },
  {
    href: "/growth",
    Icon: Sprout,
    title: "Corn Growth",
    desc: "GDD accumulation, crop milestones, and field observation logs.",
  },
  {
    href: "/market",
    Icon: TrendingUp,
    title: "Market Prices",
    desc: "Price trends across small, medium and large corn grades.",
  },
];

const TICKER_BASE = [
  "IoT Sensors",
  "TMD Weather",
  "Talad Thai Prices",
  "GDD Tracking",
  "Sweet Corn Intelligence",
  "FARM_001",
  "Real-time Telemetry",
  "Harvest Planning",
  "Base-10 GDD Scale",
  "Thai Agriculture",
  "Smart Farming",
  "Field Analytics",
];
const TICKER = [...TICKER_BASE, ...TICKER_BASE];

export default function LandingPage() {
  const page = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Hero entrance
      gsap.from(".hero-eyebrow", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(".hero-line", {
        y: 100,
        opacity: 0,
        stagger: 0.11,
        duration: 1.1,
        ease: "power4.out",
        delay: 0.1,
      });
      gsap.from(".hero-body", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        delay: 0.6,
      });
      gsap.from(".hero-cta", {
        y: 18,
        opacity: 0,
        stagger: 0.1,
        duration: 0.65,
        ease: "power2.out",
        delay: 0.75,
      });
      gsap.from(".hero-img-wrap", {
        scale: 1.07,
        opacity: 0,
        duration: 1.6,
        ease: "power2.out",
        delay: 0.05,
      });

      // Feature image parallax scrub
      gsap.utils.toArray<HTMLElement>(".parallax-img").forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -10 },
          {
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: img,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.8,
            },
          },
        );
      });

      // Feature panel entrance
      ScrollTrigger.batch(".feature-panel", {
        onEnter: (els) =>
          gsap.from(els, {
            y: 70,
            opacity: 0,
            stagger: 0.18,
            duration: 1.0,
            ease: "power3.out",
          }),
        once: true,
        start: "top 84%",
      });

      // Nav cards entrance
      ScrollTrigger.batch(".nav-card", {
        onEnter: (els) =>
          gsap.from(els, {
            y: 55,
            opacity: 0,
            stagger: 0.08,
            duration: 0.8,
            ease: "power3.out",
          }),
        once: true,
        start: "top 86%",
      });
    },
    { scope: page },
  );

  return (
    <div ref={page} className="overflow-x-hidden w-full max-w-full">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background image — right half */}
        <div className="hero-img-wrap absolute inset-y-0 right-0 w-full lg:w-[54%] pointer-events-none overflow-hidden">
          <div
            className="parallax-img absolute inset-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage:
                "url('https://picsum.photos/seed/corn-harvest/1200/900')",
              filter: "contrast(1.08) brightness(0.85) saturate(0.9)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-bg-base/75 to-bg-base/10" />
        </div>

        {/* Text */}
        <div className="relative z-10 max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 w-full py-24 sm:py-32">
          <div className="max-w-[800px]">
            <p className="hero-eyebrow label-caps text-[--text-muted] mb-8 tracking-[0.2em]">
              Agricultural IoT &ensp;&middot;&ensp; Sweet Corn Intelligence
            </p>

            <h1
              className="leading-[0.88] tracking-tighter mb-10"
              style={{ fontSize: "clamp(4rem, 8.5vw, 10rem)" }}
            >
              <span className="hero-line display-italic block">
                Your field,
              </span>
              <span className="hero-line display-italic block text-[--brand-mid]">
                always
              </span>
              <span className="hero-line display block text-[--amber]">
                in sight.
              </span>
            </h1>

            <p className="hero-body text-text-secondary text-secondary sm:text-lg leading-relaxed mb-11 max-w-100">
              IoT sensors, TMD weather forecasts, and Talad Thai market prices —
              unified in one dashboard.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/overview"
                className="hero-cta group inline-flex items-center gap-3 bg-brand text-on-dark px-8 py-4 rounded-full text-sm font-semibold hover:bg-brand-mid transition-all duration-300 shadow-green"
              >
                Open Dashboard
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-1.5 transition-transform duration-200"
                />
              </Link>
              <a
                href="#features"
                className="hero-cta group inline-flex items-center gap-3 text-secondary text-sm font-medium hover:text-primary transition-colors duration-200"
              >
                Explore features
                <span className="block w-6 h-px bg-current group-hover:w-10 transition-all duration-300" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ticker ───────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden border-y border-brand/20 bg-brand py-3.5 select-none"
        aria-hidden="true"
      >
        <div className="marquee-track flex">
          {TICKER.map((item, i) => (
            <span
              key={i}
              className="label-caps text-white/45 whitespace-nowrap flex items-center gap-10 px-10"
            >
              {item}
              <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            </span>
          ))}
        </div>
      </div>

      {/* ── Feature panels (parallax) ────────────────────────────────────────── */}
      <section
        id="features"
        className="py-28 sm:py-44 max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16"
      >
        <div className="mb-20 sm:mb-32">
          <h2
            className="display text-text-primary leading-[0.92] tracking-tighter"
            style={{ fontSize: "clamp(3rem, 6.5vw, 7rem)" }}
          >
            One dashboard.
            <br />
            <span className="display-italic text-[--brand-mid]">
              Everything you need.
            </span>
          </h2>
        </div>

        <div className="flex flex-col gap-28 sm:gap-40">
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              className="feature-panel grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
            >
              {/* Image */}
              <div
                className={`overflow-hidden rounded-radius-xl aspect-[4/3] bg-[--bg-elevated] group ${
                  i % 2 === 1 ? "lg:order-2" : ""
                }`}
              >
                <div
                  className="parallax-img w-full h-[120%] -mt-[10%] bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  style={{
                    backgroundImage: `url('${f.img}')`,
                    filter: "grayscale(0.12) contrast(1.06)",
                  }}
                />
              </div>

              {/* Text */}
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                <span className="data-num text-[--text-muted] text-xs mb-6 block tracking-[0.15em]">
                  {f.num}
                </span>
                <h3
                  className="display text-primary leading-[0.93] tracking-tighter mb-6 whitespace-pre-line"
                  style={{ fontSize: "clamp(2.5rem, 4.5vw, 4.5rem)" }}
                >
                  {f.title}
                </h3>
                <p className="text-secondary leading-relaxed text-base sm:text-lg mb-6 max-w-[360px]">
                  {f.body}
                </p>
                <span className="label-caps text-brand-mid tracking-[0.18em]">
                  {f.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Navigation cards (dark) ──────────────────────────────────────────── */}
      <section className="py-24 sm:py-36 bg-brand-mid">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="mb-14 sm:mb-20 flex items-end justify-between gap-6">
            <h2
              className="display-italic text-text-on-dark leading-[0.90] tracking-tighter"
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 6rem)" }}
            >
              Explore the
              <br />
              <span className="text-base">dashboard</span>
            </h2>
            <Link
              href="/overview"
              className="hidden sm:inline-flex items-center gap-2 text-base/67 hover:text-base text-xs transition-colors duration-200 shrink-0 mb-2 group"
            >
              Open all
              <ArrowRight
                size={13}
                className="group-hover:translate-x-1 transition-transform duration-200"
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 grid-flow-dense border border-base/8 rounded-radius-xl overflow-hidden divide-x divide-y divide-base/8">
            {NAV_CARDS.map(({ href, Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="nav-card group flex flex-col gap-10 p-8 sm:p-10 bg--brand hover:bg--brand-mid transition-colors duration-300"
              >
                <Icon
                  size={22}
                  className="text-base/25 group-hover:text-base/60 transition-colors duration-300"
                />
                <div className="flex flex-col gap-2.5 flex-1">
                  <h3
                    className="display text-[--text-on-dark] leading-tight"
                    style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.4rem)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-base/40 text-sm leading-relaxed group-hover:text-base/60 transition-colors duration-300">
                    {desc}
                  </p>
                </div>
                <ArrowRight
                  size={15}
                  className="text-base/20 group-hover:text-base/60 group-hover:translate-x-2 transition-all duration-300"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

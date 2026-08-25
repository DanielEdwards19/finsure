"use client";

import { useState, type ReactNode } from "react";

import type { Tone } from "@/lib/design/tokens";

/**
 * Canvas building blocks.
 *
 * These exist because the same three shapes — a bordered card, a collapsible
 * section, and a responsive grid of them — make up every canvas view. They carry
 * no logic beyond layout.
 */

export function Card({
  children,
  className = "",
  emphasis = false,
}: {
  children: ReactNode;
  className?: string;
  /** Lifts the card off the page for the one thing that matters most on it. */
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-2.5 rounded-2xl p-6 pr-[25px] ${
        emphasis
          ? "bg-white/5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)]"
          : "bg-surface shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** A labelled value inside a card. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <span className="text-base leading-[19px] font-medium">{label}</span>
      <span className="min-w-0 text-base leading-[19px] font-medium [overflow-wrap:anywhere] text-secondary">
        {children}
      </span>
    </Card>
  );
}

/** A caps label, used above a block of detail. */
export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs leading-none font-medium tracking-[0.04em] text-secondary uppercase">
      {children}
    </span>
  );
}

export function Grid({
  min = 220,
  children,
}: {
  /** Minimum column width in pixels before the grid reflows. */
  min?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="grid items-start gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A collapsible section. Open by default: the canvas is a record, and hiding
 * parts of a record behind a click makes it easy to miss something.
 */
export function Section({
  label,
  meta,
  children,
  defaultOpen = true,
}: {
  label: string;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="flex w-full flex-col items-start gap-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent p-0 text-left"
      >
        <span
          aria-hidden
          className={`block size-0 border-y-[4.5px] border-l-[6px] border-y-transparent border-l-white transition-transform duration-150 ${
            open ? "rotate-90" : ""
          }`}
        />
        <span className="text-base leading-none font-medium">{label}</span>
        {meta && (
          <span className="text-xs leading-none text-secondary">{meta}</span>
        )}
      </button>

      {open && <div className="w-full">{children}</div>}
    </section>
  );
}

const TONE_CLASS: Record<Tone, string> = {
  good: "bg-good-fill text-good-text",
  warn: "bg-warn-fill text-warn-text",
  bad: "bg-bad-fill text-bad-text",
  muted: "bg-muted-fill text-muted-text",
};

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-[11px] py-[7px] text-meta font-medium whitespace-nowrap shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

/** The heading of a canvas view: a title and, usually, one status pill. */
export function CanvasTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <h1 className="m-0 text-2xl leading-none font-medium">{title}</h1>
      {children}
    </div>
  );
}

/**
 * A note that qualifies what is on screen.
 *
 * GUARDRAIL: used for the statement that human assessment is required, and for
 * labelling simulated figures. Both are compliance requirements rather than
 * presentation choices, so they render in a consistent, unmissable style.
 */
export function Caveat({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-xs leading-[18px] text-secondary">{children}</p>
  );
}

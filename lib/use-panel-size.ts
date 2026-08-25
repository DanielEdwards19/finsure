"use client";

import { useEffect, useState } from "react";

import { MOBILE_BREAKPOINT } from "@/lib/design/tokens";

/** Panel width in its compressed state. */
const COMPRESSED = 460;
/** Canvas width always left visible beside the panel. */
const CANVAS_FLOOR = 320;
/** Expanding must gain at least this much, or it is not offered. */
const MIN_GAIN = 120;

export interface PanelSize {
  readonly width: number;
  /** Viewport width, assumed wide until measured on mount. */
  readonly viewport: number;
  readonly expanded: boolean;
  /** True when the viewport has room for the panel to grow meaningfully. */
  readonly canExpand: boolean;
  /**
   * True below the breakpoint, where there is no room for a canvas beside the
   * panel. The panel becomes the whole product and must be self-sufficient.
   */
  readonly isMobile: boolean;
  readonly toggleExpanded: () => void;
}

/**
 * The panel has two discrete widths rather than a drag handle: a fixed
 * compressed width, and an expanded width of half the viewport — bounded so the
 * canvas never disappears behind it.
 *
 * Width is measured after mount. Rendering the compressed width on the server
 * and correcting on the client would flash; instead the first paint uses the
 * compressed width, which is also correct for every viewport wide enough to
 * matter.
 */
export function usePanelSize(): PanelSize {
  const [viewport, setViewport] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const measure = () => setViewport(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Before measurement, assume a desktop viewport: the compressed panel and a
  // visible canvas are right for anything wide, and mobile corrects on mount.
  const width_ = viewport ?? 1440;
  const isMobile = viewport != null && viewport < MOBILE_BREAKPOINT;

  const ceiling = width_ - CANVAS_FLOOR;
  const canExpand = ceiling >= COMPRESSED + MIN_GAIN;
  const expandedWidth = Math.round(
    Math.min(ceiling, Math.max(COMPRESSED + MIN_GAIN, width_ * 0.5)),
  );

  return {
    width: expanded && canExpand ? expandedWidth : COMPRESSED,
    viewport: width_,
    expanded,
    canExpand,
    isMobile,
    toggleExpanded: () => setExpanded((on) => !on),
  };
}

import Image from "next/image";

import { findLender, logoPathFor } from "@/lib/domain/lenders";

/**
 * A lender's supplied mark, or a monogram badge when no logo file exists.
 *
 * The domain module describes lenders and this component renders them, which is
 * why the brand colours arrive as data rather than as classes: a lender the
 * dataset has no logo for still gets a recognisable tile from its initials.
 */
export function LenderMark({
  name,
  size = 28,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const lender = findLender(name);
  const logo = logoPathFor(name);

  if (logo) {
    return (
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        title={name}
        className={`flex-none rounded-md object-contain ${className}`}
      />
    );
  }

  return (
    <span
      title={name}
      aria-hidden
      className={`flex flex-none items-center justify-center rounded-md font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        // Brand colours are per-lender data, so they cannot be Tailwind classes.
        background: lender.background,
        color: lender.foreground,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {lender.initials}
    </span>
  );
}

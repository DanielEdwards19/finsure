import { Pill } from "../canvas/ui";

/**
 * Small presentational parts shared by the commercial canvas and the lender
 * setup section. They live here rather than in `canvas.tsx` so that the two can
 * both use them without importing each other.
 */

export function SectionHeader({
  n,
  title,
  state,
  tone,
}: {
  n: number;
  title: string;
  state: string;
  tone: "good" | "warn" | "bad" | "muted";
}) {
  return (
    <span className="flex flex-wrap items-center gap-3">
      <span className="text-[11px] leading-none text-secondary">{n}</span>
      <h2 className="m-0 text-base leading-none font-medium">{title}</h2>
      <Pill tone={tone}>{state}</Pill>
    </span>
  );
}

export function Check({ met, label }: { met: boolean; label: string }) {
  return (
    <span className="flex items-start gap-2.5">
      <span
        aria-hidden
        className={`mt-[5px] block size-2 flex-none rounded-full ${
          met ? "bg-good" : "bg-warn"
        }`}
      />
      <span
        className={`text-[13px] leading-[19px] ${met ? "" : "text-secondary"}`}
      >
        {label}
      </span>
    </span>
  );
}

export function RowButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-fit cursor-pointer rounded-lg border-0 bg-white/6 px-2.5 py-[7px] text-[11.5px] font-medium text-secondary shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
    >
      {label}
    </button>
  );
}

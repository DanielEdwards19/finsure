"use client";

import { findThread } from "@/lib/data/threads";
import { findDocument } from "@/lib/domain/client-files";
import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
import {
  ASSESSMENT_STATE_LABEL,
  FINDING_SEVERITY_LABEL,
  type AssessmentState,
  type FindingSeverity,
} from "@/lib/domain/types";

/**
 * The label on a breadcrumb. Names come from the scoped record so a crumb
 * cannot name something the current identity is not allowed to see.
 */
export function crumbLabel(view: CanvasView, scope: DataScope): string {
  switch (view.kind) {
    case "map":
      return "Network overview";
    case "compliance":
      return "Compliance review";
    case "networkReport":
      return view.lender ?? "Network snapshot";
    case "findingGroup":
      if (view.group === "severity") {
        const label =
          FINDING_SEVERITY_LABEL[view.value as FindingSeverity] ?? view.value;
        return `${label} severity`;
      }
      if (view.group === "status") {
        return (
          ASSESSMENT_STATE_LABEL[view.value as AssessmentState] ?? view.value
        );
      }
      return view.value || "Findings";
    case "application":
      return (
        scope.applications.find((a) => a.id === view.id)?.customer ??
        "Application"
      );
    case "broker":
      return scope.brokers.find((b) => b.id === view.id)?.name ?? "Broker";
    case "branch": {
      const branch = scope.branches.find((b) => b.id === view.id);
      return branch ? `Finsure ${branch.name}` : "Branch";
    }
    case "thread":
      return findThread(view.threadId)?.subject ?? "Email thread";
    case "document":
      return findDocument(view.id)?.name ?? "Document";
  }
}

/**
 * Canvas trail: Network overview / previous views / current view, plus a
 * "Back to …" control when there is somewhere to return.
 */
export function Breadcrumbs({
  trail,
  current,
  scope,
  onCrumb,
  onBack,
}: {
  trail: readonly CanvasView[];
  current: CanvasView;
  scope: DataScope;
  /** `-1` returns to the map. */
  onCrumb: (index: number) => void;
  onBack: () => void;
}) {
  if (current.kind === "map") return null;

  const previous = trail[trail.length - 1];

  return (
    <nav
      aria-label="Canvas"
      className="mb-5 flex w-full flex-wrap items-center gap-2"
    >
      {previous && (
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-lg border-0 bg-white/6 px-3 py-2 text-xs font-medium hover:bg-white/10"
        >
          Back to {crumbLabel(previous, scope)}
        </button>
      )}

      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        <li className="flex items-center gap-2">
          <Crumb onClick={() => onCrumb(-1)}>Network overview</Crumb>
          <Sep />
        </li>
        {trail.map((view, index) => (
          <li key={`${view.kind}-${index}`} className="flex items-center gap-2">
            <Crumb onClick={() => onCrumb(index)}>
              {crumbLabel(view, scope)}
            </Crumb>
            <Sep />
          </li>
        ))}
        <li>
          <span className="text-xs font-medium">
            {crumbLabel(current, scope)}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function Crumb({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-secondary hover:text-primary"
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-xs text-[rgb(90,92,96)]">
      /
    </span>
  );
}

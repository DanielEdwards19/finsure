/**
 * Residential application pipeline and next-action guidance.
 *
 * Derives the pipeline position from the recorded stage and status, and pairs it
 * with guidance drawn from the compliance findings.
 *
 * GUARDRAIL: guidance describes suggested next steps only. It never states that
 * a file is compliant or non-compliant, and gives no legal or credit advice.
 */

import {
  bySeverityDescending,
  type Application,
  type FindingSeverity,
} from "./types";

export interface PipelineStep {
  readonly key: string;
  readonly label: string;
  readonly note: string;
}

export const PIPELINE: readonly PipelineStep[] = [
  { key: "enquiry", label: "Initial enquiry", note: "Client contact and purpose captured" },
  { key: "factfind", label: "Fact find", note: "Circumstances, needs and objectives recorded" },
  { key: "docs", label: "Document collection", note: "Income, identity and liability evidence gathered" },
  { key: "compare", label: "Product comparison", note: "Alternatives assessed against the client’s objectives" },
  { key: "assess", label: "Serviceability assessment", note: "Servicing and funds to complete calculated" },
  { key: "prepare", label: "Application preparation", note: "Application and supporting records assembled" },
  { key: "submit", label: "Submitted to lender", note: "Application lodged with the lender" },
  { key: "cond", label: "Conditional approval", note: "Lender conditions issued" },
  { key: "formal", label: "Formal approval", note: "All conditions satisfied and approval confirmed" },
  { key: "loandocs", label: "Loan documents", note: "Documents issued, signed and returned" },
  { key: "booked", label: "Settlement booked", note: "Settlement date confirmed with all parties" },
  { key: "settled", label: "Settled", note: "Loan funded and file finalised" },
];

export type StepState = "done" | "current" | "stopped" | "pending";

const STEP_STATE_LABEL: Record<StepState, string> = {
  done: "Completed",
  current: "In progress",
  stopped: "Not progressing",
  pending: "Not started",
};

export interface TimelineStep extends PipelineStep {
  readonly state: StepState;
  readonly index: number;
  readonly stateLabel: string;
}

/** Recorded stage to pipeline position. */
const STAGE_INDEX: Readonly<Record<string, number>> = {
  "Initial enquiry": 0,
  "Fact find": 1,
  "Document collection": 2,
  "Product comparison": 3,
  "Serviceability assessment": 4,
  "Application preparation": 5,
  "Submitted to lender": 6,
  "Conditional approval": 7,
  "Formal approval": 8,
  "Loan documents": 9,
  "Settlement booked": 10,
  Settled: 11,
};

/** Statuses meaning the current step is held rather than progressing. */
const BLOCKED_STATUSES = new Set([
  "Conditions outstanding",
  "Waiting on documents",
  "Requires review",
]);

const ENDED_STATUSES = new Set(["Withdrawn", "Declined"]);

/**
 * A file recorded as `Closed` did not necessarily settle. The workbook stores
 * only the stage, so the step the file actually reached comes from the status: a
 * decline requires the application to have been lodged, so both a decline and a
 * withdrawal terminate at submission and every later step stays outstanding.
 */
const SUBMITTED_INDEX = 6;

const positionOf = (application: Application): number => {
  if (ENDED_STATUSES.has(application.status)) return SUBMITTED_INDEX;
  if (application.stage === "Closed") return SUBMITTED_INDEX;
  return STAGE_INDEX[application.stage] ?? 0;
};

const hasSettled = (application: Application): boolean =>
  application.stage === "Settled" || application.status === "Complete";

export function timelineFor(application: Application): readonly TimelineStep[] {
  const ended = ENDED_STATUSES.has(application.status);
  const settled = hasSettled(application);
  const current = positionOf(application);
  const stopped = ended || application.stage === "Closed";

  return PIPELINE.map((step, index) => {
    let state: StepState;
    if (settled || index < current) state = "done";
    else if (index === current) state = stopped ? "stopped" : "current";
    else state = "pending";

    return { ...step, state, index, stateLabel: STEP_STATE_LABEL[state] };
  });
}

export interface TimelineProgress {
  readonly done: number;
  readonly total: number;
  readonly percent: number;
}

export function timelineProgress(application: Application): TimelineProgress {
  const steps = timelineFor(application);
  const done = steps.filter((s) => s.state === "done").length;
  return {
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100),
  };
}

/**
 * The compliance input this module needs, declared structurally so the pipeline
 * does not depend on the compliance module's full finding shape.
 */
export interface GuidanceFindings {
  readonly findings: readonly {
    readonly status: string;
    readonly severity: FindingSeverity;
    readonly headline: string;
    readonly suggestedAction: string;
  }[];
  readonly evidenceCount: number;
}

export interface SuggestedAction {
  readonly headline: string;
  readonly action: string;
  readonly severity: FindingSeverity;
}

export interface NextAction {
  /** Where the file sits and what is holding it, in plain terms. */
  readonly progress: string;
  readonly nextStep: string | null;
  readonly nextStepNote: string | null;
  /** What the review identified. Never a determination of compliance. */
  readonly compliance: string | null;
  readonly actions: readonly SuggestedAction[];
  readonly hasActions: boolean;
}

export function nextActionFor(
  application: Application,
  compliance?: GuidanceFindings,
): NextAction {
  const steps = timelineFor(application);
  const currentStep =
    steps.find((s) => s.state === "current") ??
    steps.find((s) => s.state === "stopped");

  const ended = ENDED_STATUSES.has(application.status);
  const blocked = BLOCKED_STATUSES.has(application.status);
  const settled = hasSettled(application);
  const closedWithoutOutcome = application.stage === "Closed" && !ended;

  const stage = application.stage.toLowerCase();
  const status = application.status.toLowerCase();

  let progress: string;
  if (settled) {
    progress =
      "This application has settled. No further progression steps are outstanding.";
  } else if (ended) {
    progress =
      `This application is recorded as ${status} and did not proceed to settlement. ` +
      `It stopped at ${currentStep ? currentStep.label.toLowerCase() : "submission"}. ` +
      "Confirm with the client whether it should be reopened or closed on file.";
  } else if (closedWithoutOutcome) {
    progress =
      "This application is recorded as closed without a settlement outcome. " +
      "Confirm the outcome and record it on file.";
  } else if (application.status === "Conditions outstanding") {
    progress =
      "The lender has issued conditional approval. Satisfying the outstanding " +
      "conditions is the next step before formal approval can be sought.";
  } else if (application.status === "Waiting on documents") {
    progress =
      `Outstanding client documents are holding the file at ${stage}. ` +
      "Request the remaining evidence to move to the next step.";
  } else if (blocked) {
    progress = `The file is held at ${stage} with a status of ${status}. Resolve that item to progress.`;
  } else {
    const note = currentStep ? ` ${currentStep.note} is the current step.` : "";
    progress = `The file is at ${stage} (${status}).${note}`;
  }

  // A stopped file has no next step to progress towards.
  const next =
    ended || closedWithoutOutcome
      ? undefined
      : steps.find((s) => s.state === "pending");

  let complianceNote: string | null = null;
  let actions: readonly SuggestedAction[] = [];

  if (compliance) {
    const open = [...compliance.findings]
      .filter((f) => f.status === "REQUIRES_REVIEW")
      .sort((a, b) => bySeverityDescending(a.severity, b.severity));

    if (open.length > 0) {
      complianceNote =
        open.length === 1
          ? "The compliance review has identified one item requiring review on this file."
          : `The compliance review has identified ${open.length} items requiring review on this file.`;
      actions = open.slice(0, 3).map((f) => ({
        headline: f.headline,
        action: f.suggestedAction,
        severity: f.severity,
      }));
    } else if (compliance.findings.length > 0) {
      complianceNote =
        "No material concern was identified in the analysed record. " +
        `${compliance.evidenceCount} supporting evidence items are on file.`;
    }
  }

  return {
    progress,
    nextStep: next?.label ?? null,
    nextStepNote: next?.note ?? null,
    compliance: complianceNote,
    actions,
    hasActions: actions.length > 0,
  };
}

"use client";

import { useState } from "react";

import {
  networkCompliance,
  reviewedApplications,
  REVIEW_BANNER,
  SOURCE_SCOPE,
} from "@/lib/domain/compliance";
import {
  ASSESSMENT_STATE_LABEL,
  CONFIDENCE_LABEL,
  FINDING_SEVERITY_LABEL,
  REVIEWER_STATE_LABEL,
  REVIEWER_STATES,
} from "@/lib/domain/types";
import type { CanvasView } from "@/lib/domain/answers";
import type { Finding } from "@/lib/domain/compliance";
import type { DataScope } from "@/lib/domain/identity";
import type { AssessmentState, ReviewerState } from "@/lib/domain/types";
import type { Tone } from "@/lib/design/tokens";
import { Card, CanvasTitle, Caveat, Grid, Pill, Section } from "./ui";

/**
 * GUARDRAIL: `EVIDENCE_FOUND` is neutral rather than a pass. It means the record
 * contains something relevant to the rule, not that the rule is satisfied.
 */
const TONE_OF: Record<AssessmentState, Tone> = {
  EVIDENCE_FOUND: "good",
  POTENTIAL_GAP: "warn",
  REQUIRES_REVIEW: "bad",
};

/**
 * The compliance review across everything in scope.
 *
 * Reviewer decisions are held here, in the UI, and start as `UNREVIEWED`. That
 * is deliberate: nothing in this product may mark a finding as resolved on a
 * person's behalf, so the state only ever changes because someone clicked it.
 */
export function ComplianceView({
  scope,
  onOpen,
}: {
  scope: DataScope;
  onOpen: (view: CanvasView) => void;
}) {
  const network = networkCompliance(scope);
  const applications = reviewedApplications(scope);
  const [reviewStates, setReviewStates] = useState<
    Readonly<Record<string, ReviewerState>>
  >({});

  const setState = (id: string, state: ReviewerState) =>
    setReviewStates((current) => ({ ...current, [id]: state }));

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title="Evidence review">
        <Pill tone="warn">{REVIEW_BANNER}</Pill>
      </CanvasTitle>

      <Section label="Across the records available to you">
        <Grid min={170}>
          <Stat
            label="Applications analysed"
            value={String(network.applications)}
          />
          <Stat label="Evidence found" value={String(network.evidenceFound)} />
          <Stat label="Potential gaps" value={String(network.potentialGaps)} />
          <Stat
            label="Requiring review"
            value={String(network.requiresReview)}
          />
          <Stat
            label="Email coverage"
            value={network.coverage == null ? "—" : `${network.coverage}%`}
            sub="indicative"
          />
        </Grid>
      </Section>

      <Section
        label="By category"
        meta={`${network.byCategory.length} categories`}
        defaultOpen={false}
      >
        <Grid min={260}>
          {network.byCategory.map((category) => (
            <Card key={category.category}>
              <span className="text-base leading-[19px] font-medium [overflow-wrap:anywhere]">
                {category.category}
              </span>
              <span className="text-secondary-sm text-secondary">
                Identified across {category.applications}{" "}
                {category.applications === 1 ? "application" : "applications"}
              </span>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section
        label="Applications"
        meta={`${applications.length} with analysed correspondence`}
      >
        <div className="flex flex-col gap-4">
          {applications.map((application) => (
            <Card key={application.applicationId}>
              <span className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "application",
                      id: application.applicationId,
                    })
                  }
                  className="cursor-pointer border-0 bg-transparent p-0 text-base leading-[19px] font-medium text-link underline-offset-2 hover:underline"
                >
                  {application.customer}
                </button>
                <Pill>
                  {FINDING_SEVERITY_LABEL[application.highestSeverity]}
                </Pill>
                <Pill>{application.reference}</Pill>
              </span>

              <span className="text-sm leading-5 text-secondary [overflow-wrap:anywhere]">
                {application.headline}
              </span>

              <span className="text-secondary-sm text-secondary">
                {application.broker} · Finsure {application.branch} ·{" "}
                {application.applicationType}
              </span>

              <span className="text-secondary-sm text-secondary">
                {application.evidenceCount} evidence found ·{" "}
                {application.gapCount} potential gaps · {application.reviewCount}{" "}
                requiring review
              </span>

              <div className="mt-1.5 flex flex-col gap-2.5">
                {application.findings.map((finding) => (
                  <FindingRow
                    key={finding.id}
                    finding={finding}
                    reviewState={reviewStates[finding.id] ?? "UNREVIEWED"}
                    onSetState={(state) => setState(finding.id, state)}
                    onOpenThread={() =>
                      onOpen({
                        kind: "thread",
                        applicationId: finding.applicationId,
                        threadId: finding.threadId,
                      })
                    }
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Caveat>
        {REVIEW_BANNER} {SOURCE_SCOPE}
      </Caveat>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <span className="text-xs leading-[1.3] font-medium text-secondary">
        {label}
      </span>
      <span className="text-[26px] leading-none font-medium">{value}</span>
      {sub && <span className="text-xs font-medium text-secondary">{sub}</span>}
    </Card>
  );
}

/** One finding, collapsed by default so a long list stays readable. */
function FindingRow({
  finding,
  reviewState,
  onSetState,
  onOpenThread,
}: {
  finding: Finding;
  reviewState: ReviewerState;
  onSetState: (state: ReviewerState) => void;
  onOpenThread: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card bg-white/4 p-3.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer flex-col gap-2 border-0 bg-transparent p-0 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={TONE_OF[finding.status]}>
            {ASSESSMENT_STATE_LABEL[finding.status]}
          </Pill>
          <Pill>{FINDING_SEVERITY_LABEL[finding.severity]}</Pill>
          <Pill tone={reviewState === "UNREVIEWED" ? "muted" : "good"}>
            {REVIEWER_STATE_LABEL[reviewState]}
          </Pill>
        </span>
        <span className="text-sm leading-5 font-medium [overflow-wrap:anywhere]">
          {finding.headline}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          <span className="text-meta text-secondary">
            {finding.primaryRuleName} · {finding.category} ·{" "}
            {CONFIDENCE_LABEL[finding.confidence]}
            {finding.rgRefs.length > 0 && ` · ${finding.rgRefs.join(", ")}`}
          </span>

          <span className="text-sm leading-5 text-secondary [overflow-wrap:anywhere]">
            {finding.explanation}
          </span>

          {finding.suggestedAction && (
            <span className="rounded-[10px] bg-white/5 px-3 py-2.5 text-sm leading-5">
              Suggested action: {finding.suggestedAction}
            </span>
          )}

          {finding.evidence.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-meta font-medium text-secondary">
                Supporting email evidence
              </span>
              {finding.evidence.map((evidence) => (
                <button
                  key={evidence.id}
                  type="button"
                  onClick={onOpenThread}
                  className="cursor-pointer rounded-[10px] bg-white/6 px-3 py-2.5 text-left text-[13px] leading-5 shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/10"
                >
                  “{evidence.anchor}”
                  <span className="mt-1.5 block text-meta text-secondary">
                    {evidence.message.from} · {evidence.message.short} — open the
                    thread
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {REVIEWER_STATES.map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => onSetState(state)}
                aria-pressed={state === reviewState}
                className={`cursor-pointer rounded-pill px-3 py-1.5 text-meta font-medium ${
                  state === reviewState
                    ? "bg-white text-inset"
                    : "bg-white/6 text-primary shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
                }`}
              >
                {REVIEWER_STATE_LABEL[state]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

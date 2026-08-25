"use client";

import { useState } from "react";

import { findDocumentByFile } from "@/lib/domain/client-files";
import {
  findingGroup,
  networkCompliance,
  reviewedApplications,
  REVIEW_BANNER,
  SOURCE_SCOPE,
  type Finding,
  type GroupKind,
  type NetworkCompliance,
} from "@/lib/domain/compliance";
import {
  ASSESSMENT_STATE_LABEL,
  CONFIDENCE_LABEL,
  FINDING_SEVERITY_LABEL,
  FINDING_SEVERITY_ORDER,
  REVIEWER_STATE_LABEL,
  REVIEWER_STATES,
  type AssessmentState,
  type FindingSeverity,
  type ReviewerState,
} from "@/lib/domain/types";
import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
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

      <Grid min={320}>
        <SeverityCard
          network={network}
          onOpen={(severity) =>
            onOpen({ kind: "findingGroup", group: "severity", value: severity })
          }
        />
      </Grid>

      <Section
        label="By category"
        meta={`${network.byCategory.length} categories`}
        defaultOpen={false}
      >
        <Grid min={260}>
          {network.byCategory.map((category) => (
            <button
              key={category.category}
              type="button"
              onClick={() =>
                onOpen({
                  kind: "findingGroup",
                  group: "category",
                  value: category.category,
                })
              }
              className="flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl border-0 bg-surface p-6 pr-[25px] text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/6"
            >
              <span className="flex items-start gap-2.5">
                <span className="min-w-0 flex-1 text-base leading-[19px] font-medium [overflow-wrap:anywhere]">
                  {category.category}
                </span>
                <span aria-hidden className="text-[15px] text-secondary">
                  ›
                </span>
              </span>
              <span className="text-secondary-sm text-secondary">
                Identified across {category.applications}{" "}
                {category.applications === 1 ? "application" : "applications"}
              </span>
              <span className="text-secondary-sm [overflow-wrap:anywhere] text-secondary">
                {category.references.join(", ")}
              </span>
            </button>
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

              <span className="text-sm leading-5 [overflow-wrap:anywhere] text-secondary">
                {application.headline}
              </span>

              <span className="text-secondary-sm text-secondary">
                {application.broker} · Finsure {application.branch} ·{" "}
                {application.applicationType}
              </span>

              <span className="text-secondary-sm text-secondary">
                {application.evidenceCount} evidence found ·{" "}
                {application.gapCount} potential gaps ·{" "}
                {application.reviewCount} requiring review
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
                    onOpenDocument={(id) =>
                      onOpen({
                        kind: "document",
                        id,
                        applicationId: finding.applicationId,
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

/**
 * Badge and bar colours from the prototype. Critical and High carry a coloured
 * outline; the rest use the hairline so a quieter severity is not shouted.
 */
const SEVERITY_INK: Record<FindingSeverity, string> = {
  CRITICAL: "rgb(255, 0, 0)",
  HIGH: "rgb(255, 153, 0)",
  MEDIUM: "rgb(255, 196, 0)",
  LOW: "rgb(160, 162, 166)",
  INFORMATIONAL: "rgb(160, 162, 166)",
};

const SEVERITY_BAR: Record<FindingSeverity, string> = {
  CRITICAL: "rgb(255, 0, 0)",
  HIGH: "rgb(255, 153, 0)",
  MEDIUM: "rgb(255, 196, 0)",
  LOW: "rgb(0, 107, 140)",
  INFORMATIONAL: "rgb(0, 107, 140)",
};

function SeverityCard({
  network,
  onOpen,
}: {
  network: NetworkCompliance;
  onOpen: (severity: FindingSeverity) => void;
}) {
  const scale = Math.max(1, network.requiresReview + network.evidenceFound);

  return (
    <Card>
      <span className="text-base leading-none font-medium">
        Findings by severity
      </span>
      <div className="flex flex-col gap-4">
        {[...FINDING_SEVERITY_ORDER].reverse().map((severity) => {
          const count = network.bySeverity[severity];
          const hasAny = count > 0;
          const width = hasAny ? Math.max(6, (count / scale) * 100) : 0;

          return (
            <button
              key={severity}
              type="button"
              disabled={!hasAny}
              onClick={() => hasAny && onOpen(severity)}
              className={`flex w-full flex-col gap-2 border-0 bg-transparent p-0 text-left ${
                hasAny ? "cursor-pointer" : "cursor-default opacity-55"
              }`}
            >
              <span className="flex w-full items-center gap-3">
                <span
                  className="inline-flex items-center rounded-lg bg-white/4 px-2 py-1 text-xs leading-none"
                  style={{
                    color: SEVERITY_INK[severity],
                    boxShadow:
                      severity === "CRITICAL" || severity === "HIGH"
                        ? `inset 0 0 0 1px ${SEVERITY_INK[severity]}`
                        : "inset 0 0 0 1px var(--color-hairline)",
                  }}
                >
                  {FINDING_SEVERITY_LABEL[severity]}
                </span>
                <span className="ml-auto text-base leading-none font-medium">
                  {count}
                </span>
                {hasAny && (
                  <span aria-hidden className="text-[15px] text-secondary">
                    ›
                  </span>
                )}
              </span>
              <span
                className="block h-1.5 rounded-[3px]"
                style={{
                  width: `${width}%`,
                  background: SEVERITY_BAR[severity],
                }}
              />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function groupCopy(
  kind: GroupKind,
  value: string,
): { title: string; subtitle: string } {
  if (kind === "severity") {
    const label = FINDING_SEVERITY_LABEL[value as FindingSeverity] ?? value;
    return {
      title: `${label} severity`,
      subtitle: `Every finding assessed at ${label.toLowerCase()} severity.`,
    };
  }
  if (kind === "status") {
    const label = ASSESSMENT_STATE_LABEL[value as AssessmentState] ?? value;
    return {
      title: label,
      subtitle: "Every finding with this assessment state.",
    };
  }
  if (kind === "rule") {
    return {
      title: value,
      subtitle: "Every finding citing this review rule.",
    };
  }
  return {
    title: value,
    subtitle: "Every finding in this review category.",
  };
}

/** Findings that share a severity, category, rule or assessment state. */
export function FindingGroupView({
  scope,
  group: kind,
  value,
  onOpen,
}: {
  scope: DataScope;
  group: GroupKind;
  value: string;
  onOpen: (view: CanvasView) => void;
}) {
  const group = findingGroup(scope, kind, value);
  const copy = groupCopy(kind, value);
  const [reviewStates, setReviewStates] = useState<
    Readonly<Record<string, ReviewerState>>
  >({});

  const setState = (id: string, state: ReviewerState) =>
    setReviewStates((current) => ({ ...current, [id]: state }));

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] leading-none font-semibold tracking-[0.1em] text-secondary uppercase">
          Compliance review
        </span>
        <h1 className="m-0 text-2xl leading-[1.2] font-medium">{copy.title}</h1>
        <p className="m-0 text-sm leading-5 text-secondary">{copy.subtitle}</p>
        <span className="mt-0.5 flex flex-wrap gap-2">
          {group.review > 0 && (
            <Pill tone="bad">{group.review} requiring review</Pill>
          )}
          {group.gaps > 0 && (
            <Pill tone="warn">{group.gaps} potential gaps</Pill>
          )}
          {group.evidence > 0 && (
            <Pill tone="good">{group.evidence} evidence found</Pill>
          )}
        </span>
      </div>

      <Grid min={150}>
        <Stat label="Findings" value={String(group.total)} />
        <Stat label="Applications" value={String(group.applications.length)} />
        <Stat label="Brokers" value={String(group.brokerCount)} />
        <Stat label="Email citations" value={String(group.evidenceItems)} />
      </Grid>

      {group.applications.length === 0 ? (
        <Card>
          <span className="text-sm leading-[21px] text-secondary">
            No findings in this group across the analysed emails. Assessment
            states reflect evidence located in the correspondence and require
            human review.
          </span>
        </Card>
      ) : (
        <Section label="Examples by application">
          <div className="flex flex-col gap-4">
            {group.applications.map((application) => (
              <Card key={application.reference}>
                <button
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "application",
                      id: application.applicationId,
                    })
                  }
                  className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1.5 border-0 bg-transparent p-0 text-left"
                >
                  <span className="text-base leading-none font-medium">
                    {application.customer}
                  </span>
                  <span className="text-[13px] text-secondary">
                    {application.reference} · {application.broker} · Finsure{" "}
                    {application.branch}
                  </span>
                  <span className="ml-auto flex items-center gap-2.5 text-[13px] text-secondary">
                    {application.findings.length}{" "}
                    {application.findings.length === 1 ? "finding" : "findings"}
                    <span aria-hidden>›</span>
                  </span>
                </button>
                <div className="flex flex-col gap-2">
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
                      onOpenDocument={(id) =>
                        onOpen({
                          kind: "document",
                          id,
                          applicationId: finding.applicationId,
                        })
                      }
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Caveat>
        {REVIEW_BANNER} {SOURCE_SCOPE}
      </Caveat>
    </div>
  );
}

/** One finding, collapsed by default so a long list stays readable. */
export function FindingRow({
  finding,
  reviewState,
  onSetState,
  onOpenThread,
  onOpenDocument,
}: {
  finding: Finding;
  reviewState: ReviewerState;
  onSetState: (state: ReviewerState) => void;
  onOpenThread: () => void;
  onOpenDocument: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cited = finding.documents.map((file) => ({
    file,
    document: findDocumentByFile(file),
  }));
  const framework =
    finding.framework === "PRIVACY_OR_INTERNAL_POLICY"
      ? "Privacy and data handling"
      : "RG 273";

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 pr-[25px] shadow-[inset_0_0_0_1px_var(--color-hairline)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer flex-wrap items-center gap-2 border-0 bg-transparent p-0 text-left"
      >
        <Pill tone={TONE_OF[finding.status]}>
          {ASSESSMENT_STATE_LABEL[finding.status]}
        </Pill>
        <Pill>Severity: {FINDING_SEVERITY_LABEL[finding.severity]}</Pill>
        <Pill>{CONFIDENCE_LABEL[finding.confidence]}</Pill>
        <Pill>{framework}</Pill>
        <span className="ml-auto">
          <Pill tone={reviewState === "UNREVIEWED" ? "muted" : "good"}>
            Review: {REVIEWER_STATE_LABEL[reviewState]}
          </Pill>
        </span>
      </button>

      <span className="text-base leading-[22px] font-medium [overflow-wrap:anywhere]">
        {finding.headline}
      </span>

      {open && (
        <div className="flex flex-col gap-4">
          <span className="text-sm leading-5 [overflow-wrap:anywhere] text-secondary">
            {finding.explanation}
          </span>

          {finding.evidence.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-secondary">
                Supporting email evidence
              </span>
              {finding.evidence.map((evidence) => (
                <button
                  key={evidence.id}
                  type="button"
                  onClick={onOpenThread}
                  className="cursor-pointer rounded-xl bg-accent/7 px-4 py-3.5 text-left text-sm leading-5 shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.28)] hover:bg-accent/12"
                >
                  “{evidence.anchor}”
                  <span className="mt-2 block text-xs text-secondary">
                    {evidence.message.from} · {evidence.message.short} ·{" "}
                    {evidence.message.subject} — open source email
                  </span>
                </button>
              ))}
            </div>
          )}

          {cited.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-secondary">
                Supporting documents
              </span>
              {cited.map(({ file, document }) => {
                const name = document?.name ?? file;
                const meta = document
                  ? `${document.source} · ${document.date}`
                  : "Client file";
                const restricted = document?.restricted ?? false;

                if (!document || restricted) {
                  return (
                    <span
                      key={file}
                      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-white/5 px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)]"
                    >
                      <span className="text-sm leading-5 font-medium">
                        {name}
                      </span>
                      <span className="text-xs text-secondary">
                        {meta}
                        {restricted ? " — preview restricted" : ""}
                      </span>
                    </span>
                  );
                }

                return (
                  <button
                    key={file}
                    type="button"
                    onClick={() => onOpenDocument(document.id)}
                    className="flex w-full cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl border-0 bg-white/5 px-4 py-3.5 text-left shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)] hover:bg-white/8"
                  >
                    <span className="text-sm leading-5 font-medium">
                      {name}
                    </span>
                    <span className="text-xs text-secondary">
                      {meta} — open in client file
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {finding.suggestedAction && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-secondary">
                Suggested action
              </span>
              <span className="text-sm leading-5">
                {finding.suggestedAction}
              </span>
            </div>
          )}

          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/4 px-2.5 py-1.5 text-xs leading-4 [overflow-wrap:anywhere] text-secondary shadow-[inset_0_0_0_1px_var(--color-hairline)]">
              {finding.rules.join(", ")} · {finding.primaryRuleName}
            </span>
            {finding.rgRefs.length > 0 && (
              <span className="rounded-lg bg-white/4 px-2.5 py-1.5 text-xs leading-4 [overflow-wrap:anywhere] text-secondary shadow-[inset_0_0_0_1px_var(--color-hairline)]">
                {finding.rgRefs.join(" · ")}
              </span>
            )}
          </span>

          <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] px-4 py-3.5">
            <span className="text-xs font-medium text-secondary">
              Human review decision — automated findings are not decisions
            </span>
            <div className="flex flex-wrap gap-2">
              {REVIEWER_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => onSetState(state)}
                  aria-pressed={state === reviewState}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-medium ${
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
        </div>
      )}
    </div>
  );
}

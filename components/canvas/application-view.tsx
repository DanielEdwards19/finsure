"use client";

import { useState } from "react";

import { severityOfStatus } from "@/lib/data/network";
import { threadsForApplication } from "@/lib/data/threads";
import {
  recordDocumentsFor,
  type ClientDocument,
} from "@/lib/domain/client-files";
import {
  ANALYSIS_DATE,
  REVIEW_BANNER,
  SOURCE_SCOPE,
  reviewForApplication,
} from "@/lib/domain/compliance";
import {
  nextActionFor,
  timelineFor,
  timelineProgress,
} from "@/lib/domain/pipeline";
import { money } from "@/lib/format";
import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
import type { StepState } from "@/lib/domain/pipeline";
import type {
  Application,
  AssessmentState,
  Severity,
} from "@/lib/domain/types";
import {
  ASSESSMENT_STATE_LABEL,
  FINDING_SEVERITY_LABEL,
  type ReviewerState,
} from "@/lib/domain/types";
import {
  Card,
  CanvasTitle,
  Caveat,
  Field,
  Grid,
  Label,
  Pill,
  Section,
} from "./ui";
import type { Tone } from "@/lib/design/tokens";
import { LenderMark } from "../lender-mark";
import { FindingRow } from "./compliance-view";

const TONE_OF: Record<Severity, Tone> = {
  attention: "bad",
  watch: "warn",
  ok: "good",
};

const STATUS_TONE: Record<AssessmentState, Tone> = {
  EVIDENCE_FOUND: "good",
  POTENTIAL_GAP: "warn",
  REQUIRES_REVIEW: "bad",
};

const STEP_DOT: Record<StepState, { fill: string; ring: string }> = {
  done: { fill: "rgb(55, 209, 58)", ring: "rgb(55, 209, 58)" },
  current: { fill: "rgb(255, 153, 0)", ring: "rgb(255, 153, 0)" },
  stopped: { fill: "rgb(255, 0, 0)", ring: "rgb(255, 0, 0)" },
  pending: { fill: "transparent", ring: "rgba(255, 255, 255, 0.22)" },
};

const STEP_STATE: Record<StepState, string> = {
  done: "text-[rgb(74,211,77)]",
  current: "text-[rgb(255,176,58)]",
  stopped: "text-[rgb(255,128,120)]",
  pending: "text-[rgb(120,122,126)]",
};

/**
 * One application: where it sits in the pipeline, what the review found, and the
 * records behind both.
 *
 * Sections follow the prototype order — progress, details, compliance review,
 * files, emails — so a file opened here reads the same way as in the design.
 *
 * GUARDRAIL: the suggested next action describes what is outstanding. It never
 * states that the application will be approved, or that the file is compliant.
 */
export function ApplicationView({
  scope,
  application,
  onOpen,
}: {
  scope: DataScope;
  application: Application;
  onOpen: (view: CanvasView) => void;
}) {
  const steps = timelineFor(application);
  const progress = timelineProgress(application);
  const review = reviewForApplication(scope, application.id);
  const guidance = nextActionFor(
    application,
    review
      ? { findings: review.findings, evidenceCount: review.evidenceCount }
      : undefined,
  );
  const threads = threadsForApplication(application.id);
  const documents = review ? recordDocumentsFor(review.reference) : [];
  const emails = threads.flatMap((thread) =>
    thread.messages.map((message, index) => ({
      thread,
      message,
      index,
      flag: flagFor(review?.findings ?? [], thread.id, index),
    })),
  );
  const [reviewStates, setReviewStates] = useState<
    Readonly<Record<string, ReviewerState>>
  >({});

  const setState = (id: string, state: ReviewerState) =>
    setReviewStates((current) => ({ ...current, [id]: state }));

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title={application.customer}>
        <Pill tone={TONE_OF[severityOfStatus(application.status)]}>
          {application.status}
        </Pill>
      </CanvasTitle>

      <Section
        label="Application progress"
        meta={`${progress.done} of ${progress.total} steps completed`}
      >
        <Grid min={300}>
          <Card>
            <span className="block h-1.5 w-full rounded-[3px] bg-white/10">
              <span
                className="block h-1.5 rounded-[3px] transition-[width] duration-300"
                style={{
                  width: `${progress.percent}%`,
                  background: "rgb(55, 209, 58)",
                }}
              />
            </span>

            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {steps.map((step) => (
                <li key={step.key} className="flex min-w-0 gap-3">
                  <span
                    className="mt-[3px] size-3 flex-none rounded-full"
                    style={{
                      background: STEP_DOT[step.state].fill,
                      boxShadow: `inset 0 0 0 2px ${STEP_DOT[step.state].ring}`,
                    }}
                  />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span
                      className={`text-base leading-none [overflow-wrap:anywhere] ${
                        step.state === "pending"
                          ? "font-medium text-secondary"
                          : "font-medium"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span
                      className={`text-xs leading-none ${STEP_STATE[step.state]}`}
                    >
                      {step.stateLabel}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <div className="flex min-w-0 flex-col gap-4">
            <Card emphasis>
              <Label>Mortgage Intelligence — suggested next action</Label>
              <span className="text-base leading-6 [overflow-wrap:anywhere]">
                {guidance.progress}
              </span>

              {guidance.nextStep && (
                <span className="flex min-w-0 flex-col gap-1.5">
                  <Label>Next step to progress</Label>
                  <span className="text-base leading-[22px] font-medium [overflow-wrap:anywhere]">
                    {guidance.nextStep}
                  </span>
                  <span className="text-sm leading-5 [overflow-wrap:anywhere] text-secondary">
                    {guidance.nextStepNote}
                  </span>
                </span>
              )}
            </Card>

            {guidance.compliance && (
              <Card>
                <Label>Compliance concerns to address</Label>
                <span className="text-base leading-6 [overflow-wrap:anywhere]">
                  {guidance.compliance}
                </span>

                {guidance.actions.map((action) => (
                  <span
                    key={action.headline}
                    className="flex min-w-0 flex-col gap-1.5 rounded-card bg-accent/7 px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.28)]"
                  >
                    <span className="text-sm leading-5 font-medium [overflow-wrap:anywhere]">
                      {action.headline}
                    </span>
                    <span className="text-sm leading-5 [overflow-wrap:anywhere] text-secondary">
                      {action.action}
                    </span>
                  </span>
                ))}

                <Caveat>
                  Automated evidence review. Human assessment required. No
                  compliance determination is made.
                </Caveat>
              </Card>
            )}
          </div>
        </Grid>
      </Section>

      <Section label="Application details">
        <Grid>
          <Field label="Application">{application.type}</Field>
          <Field label="Amount">{money(application.amount)}</Field>
          <Field label="Lender">
            <span className="flex items-center gap-2">
              <LenderMark name={application.lender} size={22} />
              {application.lender}
            </span>
          </Field>
          <Field label="Stage">{application.stage}</Field>
          <Field label="Broker">{application.brokerName}</Field>
          <Field label="Branch">Finsure {application.branchName}</Field>
        </Grid>
      </Section>

      {review && (
        <Section label="Compliance review">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/4 px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
              <span className="text-sm font-medium">{REVIEW_BANNER}</span>
              <span className="text-xs text-secondary">
                Analysed {ANALYSIS_DATE} · email archive only
              </span>
            </div>

            <Card className="gap-4">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base leading-none font-medium">
                  {review.headline}
                </span>
                <Pill>
                  Highest severity:{" "}
                  {FINDING_SEVERITY_LABEL[review.highestSeverity]}
                </Pill>
              </span>

              <Grid min={150}>
                <Count
                  value={String(review.evidenceCount)}
                  label="Evidence found"
                  tone="good"
                />
                <Count
                  value={String(review.gapCount)}
                  label="Potential gaps"
                  tone="warn"
                />
                <Count
                  value={String(review.reviewCount)}
                  label="Requires review"
                  tone="bad"
                />
                <Count
                  value={review.coverage == null ? "—" : `${review.coverage}%`}
                  label="Email evidence coverage"
                />
              </Grid>

              {(review.reviewCategories.length > 0 ||
                review.categories.length > 0) && (
                <span className="text-sm leading-5 text-secondary">
                  {(review.reviewCategories.length
                    ? review.reviewCategories
                    : review.categories
                  ).join(" • ")}
                </span>
              )}

              <Caveat>
                {SOURCE_SCOPE} No compliance determination is made.
              </Caveat>
            </Card>

            <div className="flex flex-col gap-2">
              {review.findings.map((finding) => (
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
                      applicationId: application.id,
                    })
                  }
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {documents.length > 0 && (
        <Section label="Files" meta={`${documents.length} records`}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {documents.map((document) => (
              <FileCard
                key={document.id}
                document={document}
                onOpen={() =>
                  onOpen({
                    kind: "document",
                    id: document.id,
                    applicationId: application.id,
                  })
                }
              />
            ))}
          </div>
        </Section>
      )}

      <Section
        label="Emails"
        meta={`${emails.length} message${emails.length === 1 ? "" : "s"}`}
      >
        {emails.length === 0 ? (
          <Card>
            <span className="text-base font-medium text-secondary">
              No email correspondence is on file for this client.
            </span>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {emails.map(({ thread, message, index, flag }) => (
              <button
                key={`${thread.id}-${index}`}
                type="button"
                onClick={() =>
                  onOpen({
                    kind: "thread",
                    applicationId: application.id,
                    threadId: thread.id,
                  })
                }
                className="flex w-full cursor-pointer flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border-0 bg-surface/70 p-6 pr-[25px] text-left shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.2)] hover:bg-white/5"
              >
                <span className="min-w-0 basis-[200px] truncate text-base font-medium">
                  {message.from}
                </span>
                <span className="min-w-0 flex-1 truncate text-base font-medium">
                  {message.subject}
                </span>
                <span className="ml-auto flex items-center gap-6">
                  {flag && (
                    <Pill tone={STATUS_TONE[flag]}>
                      {ASSESSMENT_STATE_LABEL[flag]}
                    </Pill>
                  )}
                  <span className="text-base font-medium whitespace-nowrap text-secondary">
                    {message.short}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function flagFor(
  findings: readonly {
    readonly threadId: string;
    readonly status: AssessmentState;
    readonly evidence: readonly { readonly messageIndex: number }[];
  }[],
  threadId: string,
  messageIndex: number,
): AssessmentState | null {
  const hits = findings.filter(
    (finding) =>
      finding.threadId === threadId &&
      finding.evidence.some((e) => e.messageIndex === messageIndex),
  );
  if (hits.some((h) => h.status === "REQUIRES_REVIEW"))
    return "REQUIRES_REVIEW";
  if (hits.some((h) => h.status === "POTENTIAL_GAP")) return "POTENTIAL_GAP";
  if (hits.length) return "EVIDENCE_FOUND";
  return null;
}

function Count({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-[rgb(74,211,77)]"
      : tone === "warn"
        ? "text-[rgb(255,176,58)]"
        : tone === "bad"
          ? "text-[rgb(255,128,120)]"
          : "";

  return (
    <span className="flex flex-col gap-1.5">
      <span className={`text-xl leading-none font-medium ${color}`}>
        {value}
      </span>
      <span className="text-xs text-secondary">{label}</span>
    </span>
  );
}

function FileCard({
  document,
  onOpen,
}: {
  document: ClientDocument;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[138px] min-w-0 cursor-pointer flex-col items-start gap-2.5 rounded-2xl border-0 bg-surface/70 p-6 pr-[25px] text-left text-primary shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.2)] hover:bg-white/5"
    >
      <FileGlyph name={document.file} />
      <span className="w-full text-base leading-none font-medium [overflow-wrap:anywhere]">
        {document.name}
      </span>
      <span
        className={`w-full text-base leading-none font-medium ${
          document.restricted ? "text-warn-text" : "text-secondary"
        }`}
      >
        {document.restricted
          ? `Restricted · ${document.source}`
          : document.source}
      </span>
    </button>
  );
}

function FileGlyph({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mark =
    ext === "pdf" || ext === "txt"
      ? "PDF"
      : ext === "csv" || ext === "json"
        ? "XLS"
        : "DOC";

  return (
    <span
      aria-hidden
      className="flex h-8 w-[26px] flex-none items-center justify-center rounded-[3px] bg-white/10 text-[8px] font-semibold tracking-wide text-secondary"
    >
      {mark}
    </span>
  );
}

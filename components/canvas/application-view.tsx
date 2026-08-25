"use client";

import { severityOfStatus } from "@/lib/data/network";
import { threadsForApplication } from "@/lib/data/threads";
import { documentsForReference } from "@/lib/domain/client-files";
import { reviewForApplication } from "@/lib/domain/compliance";
import {
  nextActionFor,
  timelineFor,
  timelineProgress,
} from "@/lib/domain/pipeline";
import { money } from "@/lib/format";
import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
import type { StepState } from "@/lib/domain/pipeline";
import type { Application, Severity } from "@/lib/domain/types";
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

const TONE_OF: Record<Severity, Tone> = {
  attention: "bad",
  watch: "warn",
  ok: "good",
};

const STEP_DOT: Record<StepState, string> = {
  done: "bg-good-text",
  current: "bg-accent",
  stopped: "bg-bad-text",
  pending: "bg-white/20",
};

/**
 * One application: where it sits in the pipeline, what the review found, and the
 * records behind both.
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
  const documents = review ? documentsForReference(review.reference) : [];

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title={application.customer}>
        <Pill tone={TONE_OF[severityOfStatus(application.status)]}>
          {application.status}
        </Pill>
      </CanvasTitle>

      <Section
        label="Application progress"
        meta={`${progress.done} of ${progress.total} steps recorded`}
      >
        <Grid min={300}>
          <Card>
            <span className="block h-1.5 w-full rounded-[3px] bg-white/10">
              <span
                className="block h-1.5 rounded-[3px] bg-white transition-[width] duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </span>

            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {steps.map((step) => (
                <li key={step.key} className="flex min-w-0 gap-3">
                  <span
                    className={`mt-[3px] block size-2 flex-none rounded-full ${STEP_DOT[step.state]}`}
                  />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span
                      className={`text-sm leading-5 [overflow-wrap:anywhere] ${
                        step.state === "pending"
                          ? "text-tertiary"
                          : "font-medium"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-meta text-secondary">
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
          <Field label="Lender">{application.lender}</Field>
          <Field label="Stage">{application.stage}</Field>
          <Field label="Broker">
            {application.brokerName} · Finsure {application.branchName}
          </Field>
          <Field label="Security address">
            {application.residentialAddress}
          </Field>
          <Field label="Application ID">{application.slug.toUpperCase()}</Field>
          {application.fileReference && (
            <Field label="File reference">{application.fileReference}</Field>
          )}
        </Grid>
      </Section>

      {threads.length > 0 && (
        <Section
          label="Correspondence"
          meta={`${threads.length} thread${threads.length === 1 ? "" : "s"} on file`}
        >
          <Grid min={320}>
            {threads.map((thread) => {
              const last = thread.messages[thread.messages.length - 1];
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() =>
                    onOpen({
                      kind: "thread",
                      applicationId: application.id,
                      threadId: thread.id,
                    })
                  }
                  className="flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl bg-surface p-6 pr-[25px] text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/5"
                >
                  <span className="text-base leading-[19px] font-medium [overflow-wrap:anywhere]">
                    {thread.subject}
                  </span>
                  <span className="text-secondary-sm text-secondary">
                    {thread.messages.length} messages · last from {last.from} on{" "}
                    {last.short}
                  </span>
                </button>
              );
            })}
          </Grid>
        </Section>
      )}

      {review && (
        <Section
          label="Evidence review"
          meta={`${review.findings.length} findings · human assessment required`}
        >
          <Card>
            <span className="text-base leading-6 font-medium">
              {review.headline}
            </span>
            <span className="text-sm leading-5 text-secondary">
              {review.evidenceCount} evidence found · {review.gapCount}{" "}
              potential gaps · {review.reviewCount} requiring review ·{" "}
              {review.coverage == null ? "—" : `${review.coverage}%`} email
              evidence coverage
            </span>
            <button
              type="button"
              onClick={() => onOpen({ kind: "compliance" })}
              className="mt-1.5 w-fit cursor-pointer rounded-card border border-hairline bg-white/6 px-3.5 py-2 text-[13px] font-medium hover:bg-white/10"
            >
              Open the full review →
            </button>
            <Caveat>
              Automated evidence review. Human assessment required. No
              compliance determination is made.
            </Caveat>
          </Card>
        </Section>
      )}

      {documents.length > 0 && (
        <Section
          label="Documents on file"
          meta={`${documents.length} records`}
          defaultOpen={false}
        >
          <Grid min={280}>
            {documents.map((document) => (
              <Card key={document.id}>
                <span className="text-base leading-[19px] font-medium [overflow-wrap:anywhere]">
                  {document.name}
                </span>
                <span className="text-secondary-sm text-secondary">
                  {document.source} · {document.date}
                </span>
                {document.restricted && (
                  <Pill tone="warn">
                    Preview restricted — request access under policy
                  </Pill>
                )}
              </Card>
            ))}
          </Grid>
        </Section>
      )}
    </div>
  );
}

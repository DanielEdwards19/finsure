"use client";

import { ANZ_LENDER_CHECKLIST } from "@/lib/domain/commercial/flow";
import { canvasSections } from "@/lib/domain/commercial/sections";
import { findProduct } from "@/lib/domain/commercial/products";
import type { Commercial } from "@/lib/use-commercial";
import { Card, Caveat, Pill } from "../canvas/ui";
import { LenderMark } from "../lender-mark";
import { RowButton, SectionHeader } from "./ui";

const STEPS = [
  "Review application data",
  "Confirm lender-specific requirements",
  "Add supporting documents",
] as const;

/**
 * The simulated lender application setup.
 *
 * This is the last stage of the commercial flow: it shows how a completed
 * application could be handed to the chosen lender's own process.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - Nothing here submits anything. The panel says so before any content, in the
 *    strongest terms the copy voice allows, because a screen that looks like a
 *    lender hand-off is exactly where a reader might assume otherwise.
 *  - Every checklist line remains subject to lender confirmation. Confirming one
 *    records that the broker holds the evidence, never that the lender accepted
 *    it.
 *  - It appears only once the application is finalised, so it cannot suggest an
 *    incomplete file is ready to go anywhere.
 */
export function LenderSetupSection({ commercial }: { commercial: Commercial }) {
  const { state, dispatch, documents, documentSummary } = commercial;

  // Only reachable once the record is complete.
  if (!state.finalised) return null;

  const lender = state.choice
    ? findProduct(state.choice.productId)?.lender
    : state.recommendation
      ? findProduct(state.recommendation.productId)?.lender
      : null;

  const stage = state.lenderStage;
  const confirmedCount = Object.keys(state.lenderConfirmed).length;
  const allConfirmed = confirmedCount === ANZ_LENDER_CHECKLIST.length;

  return (
    <Card className="gap-4 px-[26px] py-[22px]">
      <SectionHeader
        n={12}
        title="Simulated lender application setup"
        state={`Step ${Math.min(stage + 1, STEPS.length)} of ${STEPS.length}`}
        tone="muted"
      />

      <span className="flex flex-col gap-1.5 rounded-card bg-warn-fill px-[15px] py-[13px] shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.35)]">
        <span className="text-secondary-sm font-semibold">
          Prototype simulation — no information has been sent to{" "}
          {lender ?? "the lender"}.
        </span>
        <span className="text-xs leading-[18px]">
          This stage shows how the structured application could be passed into
          the selected lender&rsquo;s own process. It is not a live integration
          and does not imitate a lender portal.
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-2">
        {lender && <LenderMark name={lender} size={24} />}
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`rounded-pill px-2.5 py-1.5 text-[11.5px] font-medium ${
              index === stage
                ? "bg-white/12 shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.5)]"
                : index < stage
                  ? "bg-white/6 text-secondary"
                  : "bg-white/4 text-tertiary"
            }`}
          >
            {index + 1}. {label}
          </span>
        ))}
      </span>

      {stage === 0 && <ReviewStep commercial={commercial} />}

      {stage === 1 && (
        <span className="flex flex-col gap-3">
          <span className="text-sm font-medium">
            Step 2 — Confirm lender-specific requirements
          </span>
          <span className="text-xs leading-[18px] text-secondary">
            Illustrative checklist for the {lender ?? "lender"} application
            simulation. Every item remains subject to lender confirmation.
          </span>

          {ANZ_LENDER_CHECKLIST.map((item) => {
            const confirmed = Boolean(state.lenderConfirmed[item.id]);
            return (
              <span
                key={item.id}
                className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[10px] bg-white/4 px-[13px] py-[11px]"
              >
                <span className="min-w-0 flex-[1_1_200px] text-secondary-sm font-medium">
                  {item.label}
                </span>
                <span className="min-w-0 flex-[1_1_220px] text-xs text-secondary">
                  {item.status}
                </span>
                {confirmed ? (
                  <Pill tone="good">Broker holds evidence</Pill>
                ) : (
                  <RowButton
                    label="Confirm held"
                    onClick={() =>
                      dispatch({ type: "confirmLenderItem", id: item.id })
                    }
                  />
                )}
                <span className="flex-[1_1_100%] text-[11.5px] leading-[17px] text-tertiary">
                  {item.note}
                </span>
              </span>
            );
          })}

          <span className="text-xs text-secondary">
            {confirmedCount} of {ANZ_LENDER_CHECKLIST.length} confirmed as held.
          </span>
        </span>
      )}

      {stage === 2 && (
        <span className="flex flex-col gap-3">
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              Step 3 — Add supporting documents
            </span>
            <Pill tone="warn">Ready for document collection</Pill>
          </span>

          <span className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <Tally value={documentSummary.total} label="Documents identified" />
            <Tally value={documentSummary.obtained} label="Obtained" />
            <Tally value={documentSummary.outstanding} label="Outstanding" />
            <Tally
              value={documentSummary.clarification}
              label="Requiring clarification"
            />
          </span>

          {documents.map((document) => (
            <span
              key={document.id}
              className="flex flex-col gap-1.5 rounded-[10px] bg-white/4 px-3.5 py-3"
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 flex-[1_1_200px] text-secondary-sm font-medium">
                  {document.name}
                </span>
                <Pill
                  tone={
                    document.status === "Obtained"
                      ? "good"
                      : document.status === "Requires clarification"
                        ? "bad"
                        : "warn"
                  }
                >
                  {document.status}
                </Pill>
              </span>
              <span className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[11.5px] leading-4 text-tertiary">
                <span>Responsible: {document.party}</span>
                <span>Period: {document.period}</span>
                <span>Review: {document.review}</span>
              </span>
              {document.note && (
                <span className="text-[11.5px] leading-[17px] text-secondary">
                  {document.note}
                </span>
              )}
            </span>
          ))}
        </span>
      )}

      {stage < STEPS.length - 1 && (
        <button
          type="button"
          onClick={() => dispatch({ type: "advanceLenderStage" })}
          disabled={stage === 1 && !allConfirmed}
          className="w-fit cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          {stage === 0
            ? "Confirm the application data"
            : "Continue to document collection"}
        </button>
      )}

      <Caveat>
        Nothing on this screen has been submitted, and no lender has assessed
        this application. Every item remains subject to the lender&rsquo;s own
        confirmation.
      </Caveat>
    </Card>
  );
}

/** Step 1 replays the recorded application, grouped as the lender would read it. */
function ReviewStep({ commercial }: { commercial: Commercial }) {
  const sections = canvasSections(commercial.state).filter(
    (section) => section.rows.length > 0,
  );

  return (
    <span className="flex flex-col gap-3.5">
      <span className="text-sm font-medium">
        Step 1 — Review application data
      </span>

      {sections.map((section) => (
        <span
          key={section.id}
          className="flex flex-col gap-2.5 rounded-card bg-white/4 px-4 py-3.5"
        >
          <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
            {section.title.toUpperCase()}
          </span>
          {section.rows.map((row) => (
            <span
              key={row.label}
              className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5"
            >
              <span className="min-w-0 flex-[0_1_220px] text-xs text-secondary">
                {row.label}
              </span>
              <span className="min-w-0 flex-[1_1_180px] text-secondary-sm leading-[19px] font-medium whitespace-pre-line">
                {row.value}
              </span>
              <span className="min-w-0 flex-[0_1_190px] text-[11px] text-tertiary">
                {row.source}
              </span>
            </span>
          ))}
        </span>
      ))}

      <span className="text-xs leading-[18px] text-secondary">
        Values may be edited on the application record above. Every edit is
        recorded in the audit trail.
      </span>
    </span>
  );
}

function Tally({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex flex-col gap-1.5 rounded-card bg-white/4 px-4 py-3.5">
      <span className="text-[22px] font-medium">{value}</span>
      <span className="text-[11.5px] leading-4 text-secondary">{label}</span>
    </span>
  );
}

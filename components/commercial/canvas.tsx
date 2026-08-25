"use client";

import { useState } from "react";

import { canvasSections } from "@/lib/domain/commercial/sections";
import { SECTIONS } from "@/lib/domain/commercial/flow";
import { money } from "@/lib/format";
import type {
  CanvasSection,
  SectionRow,
} from "@/lib/domain/commercial/sections";
import type { Commercial } from "@/lib/use-commercial";
import { Card, Caveat, Pill } from "../canvas/ui";
import { Check, RowButton, SectionHeader } from "./ui";
import { ComparisonSection } from "./comparison";
import { LenderSetupSection } from "./lender-setup";

/**
 * The commercial application record.
 *
 * Everything here is derived from the answers recorded in the panel beside it,
 * so changing an earlier answer visibly withdraws whatever it had produced. The
 * broker can correct any field in place; a correction is the most deliberate
 * record of a value and wins over both the answer and the document it came from.
 */
export function CommercialCanvas({
  commercial,
  onAsk,
}: {
  commercial: Commercial;
  onAsk?: (question: string) => void;
}) {
  const {
    state,
    dispatch,
    fields,
    progress,
    findings,
    documents,
    documentSummary,
    finalisation,
    checks,
  } = commercial;

  const sections = canvasSections(state);
  const client = String(
    fields.tradingName ?? fields.legalName ?? "Not yet recorded",
  );

  return (
    <div className="animate-in flex w-full flex-col gap-4">
      <Card className="gap-[18px] px-[26px] py-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[22px] leading-[1.15] font-medium">
            {client}
          </span>
          <Pill tone={progress.tone}>{progress.label}</Pill>
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={commercial.reset}
              className="cursor-pointer rounded-[9px] border-0 bg-white/6 px-[13px] py-[9px] text-xs font-medium shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
            >
              Reset demo
            </button>
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-6 gap-y-4">
          <Fact label="APPLICATION" value={state.id} />
          <Fact label="BROKER" value={state.broker} />
          <Fact label="BRANCH" value={state.branch} />
          <Fact
            label="REQUESTED"
            value={
              fields.loanAmount
                ? money(Number(fields.loanAmount))
                : "Not yet recorded"
            }
          />
          <Fact
            label="PURPOSE"
            value={
              Array.isArray(fields.purposes) && fields.purposes.length > 0
                ? fields.purposes.join(", ")
                : "Not yet recorded"
            }
          />
          <Fact
            label="DOCUMENTS"
            value={`${documentSummary.obtained} of ${documentSummary.total} obtained`}
          />
        </div>
      </Card>

      <Card className="gap-3.5 px-[26px] py-[22px]">
        <span className="flex flex-wrap items-center gap-3">
          <Pill tone={progress.tone}>{progress.label}</Pill>
          <span className="text-[13px] leading-[19px] text-secondary">
            {progress.canCompare
              ? "A full comparison may be prepared from the information recorded."
              : "A comparison is held until the outstanding information is recorded. This is not an assessment of the application."}
          </span>
        </span>

        {progress.reasons.length > 0 && (
          <span className="flex flex-col gap-1.5">
            {progress.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-[10px] bg-white/5 px-3 py-2.5 text-[13px] leading-[19px]"
              >
                {reason}
              </span>
            ))}
          </span>
        )}

        <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
          MINIMUM INFORMATION GATE
        </span>
        <span className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-x-5 gap-y-2">
          {progress.gate.map((item) => (
            <Check key={item.id} met={item.met} label={item.label} />
          ))}
        </span>
      </Card>

      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          commercial={commercial}
        />
      ))}

      <Card className="gap-4 px-[26px] py-[22px]">
        <SectionHeader
          n={7}
          title="Required documents and evidence"
          state={`${documentSummary.outstanding} outstanding`}
          tone={documentSummary.outstanding > 0 ? "warn" : "good"}
        />
        {documents.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-1.5 rounded-card bg-white/4 px-3.5 py-3"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium">
                    {document.name}
                  </span>
                  <Pill tone={statusTone(document.status)}>
                    {document.status}
                  </Pill>
                </span>
                <span className="text-xs leading-[18px] text-secondary">
                  {document.why}
                </span>
                <span className="text-meta text-tertiary">
                  {[document.party, document.period, document.review]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {document.status !== "Obtained" && (
                  <span className="flex flex-wrap gap-1.5 pt-0.5">
                    <RowButton
                      label="Mark requested"
                      onClick={() =>
                        dispatch({
                          type: "setDocState",
                          id: document.id,
                          patch: { status: "Requested" },
                        })
                      }
                    />
                    <RowButton
                      label="Mark obtained"
                      onClick={() =>
                        dispatch({
                          type: "setDocState",
                          id: document.id,
                          patch: { status: "Obtained" },
                        })
                      }
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <Caveat>
          A document not held is recorded as outstanding. It is never read as
          evidence that the underlying fact is absent.
        </Caveat>
      </Card>

      <Card className="gap-4 px-[26px] py-[22px]">
        <SectionHeader
          n={8}
          title="Risks, gaps and items requiring review"
          state={`${findings.filter((f) => !f.resolved).length} open`}
          tone={findings.some((f) => !f.resolved) ? "warn" : "good"}
        />
        {findings.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-2">
            {findings.map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
                commercial={commercial}
              />
            ))}
          </div>
        )}
        <Caveat>
          Each item describes what requires review. None is a determination
          about the application.
        </Caveat>
      </Card>

      <ComparisonSection commercial={commercial} onAsk={onAsk} />

      <Card className="gap-4 px-[26px] py-[22px]">
        <SectionHeader
          n={11}
          title="Final application review"
          state={finalisation.ready ? "Ready to finalise" : "Outstanding items"}
          tone={finalisation.ready ? "good" : "warn"}
        />
        <span className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-x-5 gap-y-2">
          {checks.map((check) => (
            <Check key={check.id} met={check.met} label={check.label} />
          ))}
        </span>

        {finalisation.outstanding.length > 0 && (
          <span className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
              STILL OUTSTANDING
            </span>
            {finalisation.outstanding.map((item) => (
              <span
                key={item}
                className="rounded-[10px] bg-white/5 px-3 py-2.5 text-[13px] leading-[19px]"
              >
                {item}
              </span>
            ))}
          </span>
        )}

        <button
          type="button"
          onClick={() => dispatch({ type: "finalise" })}
          disabled={!finalisation.ready}
          className="w-fit cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.finalised
            ? "Finalised — recorded on the file"
            : "Finalise the application record"}
        </button>

        <Caveat>
          Finalising records that the file is complete for submission. It is not
          an approval, a credit decision or a statement of suitability.
        </Caveat>
      </Card>

      <LenderSetupSection commercial={commercial} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function SectionCard({
  section,
  commercial,
}: {
  section: CanvasSection;
  commercial: Commercial;
}) {
  return (
    <Card className="gap-4 px-[26px] py-[22px]">
      <SectionHeader
        n={section.n}
        title={section.title}
        state={section.state}
        tone={section.tone}
      />

      {section.rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col">
          {section.rows.map((row) => (
            <Row key={row.label} row={row} commercial={commercial} />
          ))}
        </div>
      )}

      {section.formulas.length > 0 && (
        <span className="flex flex-col gap-1.5 rounded-card bg-white/4 px-3.5 py-3">
          <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
            INDICATIVE — FORMULA USED
          </span>
          {section.formulas.map((formula) => (
            <span
              key={formula}
              className="text-xs leading-[18px] text-secondary"
            >
              {formula}
            </span>
          ))}
        </span>
      )}

      {section.adjustments.length > 0 && (
        <span className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
            NORMALISATION ADJUSTMENTS
          </span>
          {section.adjustments.map((adjustment) => (
            <span
              key={adjustment.id}
              className="flex flex-col gap-1 rounded-card bg-white/4 px-3.5 py-3"
            >
              <span className="text-[13.5px] font-medium">
                {adjustment.label} — {money(adjustment.amount)}
              </span>
              <span className="text-xs leading-[18px] text-secondary">
                {adjustment.accepted
                  ? "Evidence reviewed. Included in the normalised figure."
                  : "Proposed. Excluded from the normalised figure until evidence is reviewed."}
              </span>
            </span>
          ))}
        </span>
      )}

      {section.findings.length > 0 && (
        <span className="flex flex-col gap-2">
          {section.findings.map((finding) => (
            <span
              key={finding.id}
              className="flex flex-col gap-1 rounded-card bg-warn-fill px-3.5 py-3"
            >
              <span className="text-[13px] font-medium">
                {finding.headline}
              </span>
              <span className="text-xs leading-[18px] text-secondary">
                {finding.explanation}
              </span>
            </span>
          ))}
        </span>
      )}

      {section.hidden > 0 && (
        <span className="text-meta text-tertiary">
          {section.hidden} further field
          {section.hidden === 1 ? "" : "s"} appear once the questions behind
          them are answered.
        </span>
      )}
    </Card>
  );
}

/** One field. Editable in place, with its provenance always on screen. */
function Row({ row, commercial }: { row: SectionRow; commercial: Commercial }) {
  const { dispatch } = commercial;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.value);

  return (
    <span className="flex flex-wrap items-start gap-x-4 gap-y-1.5 pb-3 shadow-[inset_0_-1px_0_rgb(43_45_49_/_0.7)]">
      <span className="flex-[0_0_260px] text-[13px] leading-[19px] text-secondary">
        {row.label}
      </span>
      <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
        {editing ? (
          <span className="flex flex-wrap items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-[180px] flex-1 rounded-[10px] border-0 bg-white/8 px-3 py-[9px] text-sm shadow-[inset_0_0_0_1px_var(--color-hairline)]"
            />
            <button
              type="button"
              onClick={() => {
                if (row.fieldKey) {
                  dispatch({
                    type: "editField",
                    key: row.fieldKey,
                    value: draft,
                    label: row.label,
                  });
                }
                setEditing(false);
              }}
              className="cursor-pointer rounded-lg border-0 bg-white px-[13px] py-[9px] text-xs font-semibold text-surface"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(row.value);
                setEditing(false);
              }}
              className="cursor-pointer rounded-lg border-0 bg-white/6 px-[13px] py-[9px] text-xs font-medium text-secondary"
            >
              Cancel
            </button>
          </span>
        ) : (
          <span className="text-sm leading-5 font-medium [overflow-wrap:anywhere] whitespace-pre-line">
            {row.value}
          </span>
        )}

        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] leading-none text-tertiary">
            {row.source}
          </span>

          {row.extractionKey && (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "openSource", key: row.extractionKey! })
              }
              className="cursor-pointer rounded-md border-0 bg-white/7 px-[9px] py-[5px] text-left text-[11px] font-medium shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
            >
              View source
            </button>
          )}

          {row.reviewLabel && row.reviewTone && (
            <Pill tone={row.reviewTone}>{row.reviewLabel}</Pill>
          )}

          {row.awaitingConfirmation && row.extractionKey && (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "confirmExtracted", key: row.extractionKey! })
              }
              className="cursor-pointer rounded-md border-0 bg-white px-[9px] py-[5px] text-[11px] font-semibold text-surface"
            >
              Confirm
            </button>
          )}

          {row.fieldKey && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(row.value);
                setEditing(true);
              }}
              className="cursor-pointer rounded-md border-0 bg-white/5 px-2 py-1 text-[11px] font-medium text-secondary hover:bg-white/12"
            >
              Edit
            </button>
          )}
        </span>

        {row.basis && (
          <span className="text-meta leading-[17px] text-secondary">
            {row.basis}
          </span>
        )}
      </span>
    </span>
  );
}

function FindingRow({
  finding,
  commercial,
}: {
  finding: Commercial["findings"][number];
  commercial: Commercial;
}) {
  const { dispatch } = commercial;
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-card px-3.5 py-3 ${
        finding.resolved
          ? "bg-white/4"
          : finding.effect === "BLOCK"
            ? "bg-bad-fill"
            : "bg-warn-fill"
      }`}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[13.5px] font-medium">
          {finding.headline}
        </span>
        <Pill tone={finding.resolved ? "good" : effectTone(finding.effect)}>
          {finding.resolved ? "Addressed" : EFFECT_LABEL[finding.effect]}
        </Pill>
      </span>
      <span className="text-xs leading-[18px] text-secondary">
        {finding.explanation}
      </span>
      <span className="text-xs leading-[18px]">{finding.action}</span>
      <span className="text-meta text-tertiary">
        Raised by {finding.origin}
      </span>

      {finding.resolved ? (
        <span className="text-meta text-secondary">
          Resolution recorded: {finding.resolutionNote}
        </span>
      ) : open ? (
        <span className="flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How this was addressed — recorded on the file"
            className="min-w-[180px] flex-1 rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!note.trim()) return;
              dispatch({
                type: "resolveFinding",
                id: finding.id,
                note: note.trim(),
              });
              setOpen(false);
            }}
            className="cursor-pointer rounded-lg border-0 bg-white px-[13px] py-2 text-xs font-semibold text-surface"
          >
            Record
          </button>
        </span>
      ) : (
        <RowButton
          label="Record how this was addressed"
          onClick={() => setOpen(true)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const EFFECT_LABEL: Readonly<Record<string, string>> = {
  BLOCK: "Information required",
  PAUSE: "Requires review",
  COND: "Condition",
  INFO: "For your information",
};

const effectTone = (effect: string) =>
  effect === "BLOCK" ? "bad" : effect === "INFO" ? "muted" : "warn";

const statusTone = (status: string) =>
  status === "Obtained"
    ? "good"
    : status === "Requires clarification"
      ? "bad"
      : status === "Not applicable"
        ? "muted"
        : "warn";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
        {label}
      </span>
      <span className="text-sm leading-[19px] font-medium [overflow-wrap:anywhere]">
        {value}
      </span>
    </span>
  );
}

function Empty() {
  return (
    <span className="text-[13px] leading-[19px] text-secondary">
      Not started. The guided questions in the panel will build this section.
    </span>
  );
}

export { SECTIONS };

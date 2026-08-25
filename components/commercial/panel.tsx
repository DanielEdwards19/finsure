"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ANALYSIS_NOTICE,
  ANALYSIS_STEPS,
  DOC_PACK,
  NOT_IN_DOCUMENTS,
  PROTOTYPE_LABEL,
  SUPPRESSION_RULE,
  findPackDocument,
} from "@/lib/domain/commercial/document-pack";
import { extractionRows } from "@/lib/domain/commercial/derive";
import { CLIENT_BOOK } from "@/lib/domain/commercial/state";
import type { ExtractionRow } from "@/lib/domain/commercial/derive";
import type { Commercial } from "@/lib/use-commercial";
import type { FieldInput } from "@/lib/domain/commercial/state";
import type { Question } from "@/lib/domain/commercial/flow";
import { BackGlyph } from "../glyph";
import { Pill } from "../canvas/ui";

/**
 * The guided setup panel.
 *
 * One question at a time, each recorded as an answer on the application. The
 * canvas beside it rebuilds from those answers, so the broker can see what each
 * choice did to the file.
 *
 * GUARDRAIL: no question or reply here approves anything or states that the
 * application is compliant. The opening message says so explicitly.
 */
export function CommercialPanel({
  commercial,
  onExit,
}: {
  commercial: Commercial;
  onExit: () => void;
}) {
  const { state, dispatch, progress, stage, question, upload } = commercial;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.chat.length, question?.id, upload]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-none flex-col gap-3 px-[22px] pt-[22px] pb-3">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onExit}
            title="Back"
            className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-white/5 p-0"
          >
            <BackGlyph />
          </button>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[15px] leading-none font-medium">
              Commercial loan application
            </span>
            <span className="text-meta text-secondary">
              {state.id} · {state.broker} · {state.branch}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={progress.tone}>{progress.label}</Pill>
          <span className="text-meta text-secondary">{stage}</span>
        </div>
      </header>

      <div
        ref={scroller}
        className="flex min-h-[110px] scrollbar-thin flex-1 flex-col gap-[18px] overflow-auto px-[22px] pt-1.5 pb-2"
      >
        {state.chat.map((message, index) =>
          message.role === "user" ? (
            <div
              key={index}
              className="max-w-[92%] self-end rounded-2xl bg-white/10 px-[15px] py-[13px] text-sm leading-5 font-medium"
            >
              {message.text}
            </div>
          ) : (
            <div
              key={index}
              className="w-full self-start text-sm leading-[21px] whitespace-pre-line"
            >
              {message.text}
            </div>
          ),
        )}

        {state.halted && (
          <div className="flex flex-col gap-2.5 rounded-[14px] bg-bad-fill px-4 py-[15px] shadow-[inset_0_0_0_1px_rgb(255_120_110_/_0.35)]">
            <span className="text-sm font-medium">{state.halted}</span>
            <button
              type="button"
              onClick={() => dispatch({ type: "revisit", qid: null })}
              className="w-fit cursor-pointer rounded-lg border-0 bg-white px-3 py-2 text-xs font-semibold text-surface"
            >
              Go back and change an answer
            </button>
          </div>
        )}

        {question && (
          <QuestionForm
            key={question.id}
            question={question}
            commercial={commercial}
          />
        )}

        {upload && <DocumentIntake commercial={commercial} />}

        {!question && !upload && !state.halted && (
          <div className="flex flex-col gap-2.5">
            <span className="text-sm leading-[21px]">
              Every question in the guided flow has been answered. The
              application record on the canvas is complete as far as the
              information provided allows. The assessment and the recommendation
              remain yours.
            </span>
          </div>
        )}
      </div>

      <footer className="flex flex-none flex-wrap gap-[7px] border-t border-white/6 px-5 pt-2 pb-4">
        <FooterButton
          label="Go back"
          onClick={() => dispatch({ type: "revisit", qid: null })}
        />
        <FooterButton label="Save and exit" onClick={onExit} />
        <FooterButton label="Reset demo" onClick={commercial.reset} />
      </footer>
    </div>
  );
}

function FooterButton({
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
      className="cursor-pointer rounded-lg border-0 bg-white/6 px-3 py-2 text-xs font-medium shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
    >
      {label}
    </button>
  );
}

/**
 * One question. Selection is held locally until the broker continues, so a
 * multi-select can be assembled without each tap writing to the application.
 */
function QuestionForm({
  question,
  commercial,
}: {
  question: Question;
  commercial: Commercial;
}) {
  const { dispatch } = commercial;
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [other, setOther] = useState("");
  const [fields, setFields] = useState<Record<string, FieldInput>>({});
  const [search, setSearch] = useState("");

  const multi = question.control === "multi" || question.control === "rank3";
  const chosen = question.options.filter((o) => selected.includes(o.v));

  // An exclusive option cannot be combined with any other — "none of these"
  // means none of these.
  const toggle = (value: string) => {
    const option = question.options.find((o) => o.v === value);
    if (!multi || option?.exclusive) {
      setSelected([value]);
      return;
    }
    setSelected((current) => {
      if (current.includes(value)) return current.filter((v) => v !== value);
      const exclusives = question.options
        .filter((o) => o.exclusive)
        .map((o) => o.v);
      return [...current.filter((v) => !exclusives.includes(v)), value];
    });
  };

  const needsOther = chosen.some((o) => o.other);
  const promptedFields = useMemo(
    () => [
      ...(question.fields ?? []),
      ...chosen.flatMap((o) =>
        o.fieldsRequired ? (question.fields ?? []) : [],
      ),
    ],
    [question.fields, chosen],
  );

  const ready =
    selected.length > 0 &&
    (!needsOther || other.trim().length > 0) &&
    promptedFields.every((f) => String(fields[f.k] ?? "").trim().length > 0);

  const submit = () => {
    if (!ready) return;
    dispatch({
      type: "answer",
      qid: question.id,
      payload: {
        values: selected,
        other: needsOther ? other.trim() : undefined,
        fields: Object.keys(fields).length ? fields : undefined,
      },
    });
  };

  // The client picker searches the broker's own book rather than the network.
  const clients = CLIENT_BOOK.filter((c) =>
    `${c.tradingName} ${c.legalName} ${c.industry}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[15px] leading-[22px] font-medium">
        {question.text}
      </span>

      {question.why && (
        <span className="text-secondary-sm leading-[19px] text-secondary">
          {question.why}
        </span>
      )}

      {multi && (
        <span className="text-meta font-medium tracking-[0.04em] text-tertiary">
          {question.control === "rank3"
            ? "SELECT UP TO THREE, IN ORDER OF PRIORITY"
            : "SELECT ALL THAT APPLY"}
        </span>
      )}

      {chosen.some((o) => o.picker === "client") && (
        <span className="flex flex-col gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients"
            className="rounded-card border-0 bg-white/6 px-[13px] py-[11px] text-[13.5px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          />
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() =>
                dispatch({
                  type: "answer",
                  qid: question.id,
                  payload: { values: selected, clientId: client.id },
                })
              }
              className="flex cursor-pointer flex-col gap-1 rounded-card border-0 bg-white/6 px-3.5 py-3 text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
            >
              <span className="text-[13.5px] font-medium">
                {client.tradingName}
              </span>
              <span className="text-meta text-secondary">{client.meta}</span>
            </button>
          ))}
        </span>
      )}

      <span className="flex flex-col gap-2">
        {question.options.map((option) => {
          const on = selected.includes(option.v);
          return (
            <button
              key={option.v}
              type="button"
              onClick={() => toggle(option.v)}
              aria-pressed={on}
              className={`flex cursor-pointer items-center gap-2.5 rounded-card border-0 px-3.5 py-3 text-left text-sm ${
                on
                  ? "bg-white/12 font-medium shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.5)]"
                  : "bg-white/6 shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/10"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-[18px] flex-none items-center justify-center text-[11px] ${
                  multi ? "rounded-[5px]" : "rounded-full"
                } ${on ? "bg-accent text-inset" : "bg-white/15"}`}
              >
                {on
                  ? multi
                    ? String(selected.indexOf(option.v) + 1)
                    : "✓"
                  : ""}
              </span>
              <span className="min-w-0 flex-1 text-left">{option.label}</span>
            </button>
          );
        })}
      </span>

      {promptedFields.length > 0 && (
        <span className="flex flex-col gap-[9px]">
          {promptedFields.map((field) => (
            <span key={field.k} className="flex flex-col gap-1.5">
              <span className="text-meta text-secondary">{field.label}</span>
              <input
                value={String(fields[field.k] ?? "")}
                onChange={(e) =>
                  setFields((current) => ({
                    ...current,
                    [field.k]:
                      field.type === "text" ? e.target.value : e.target.value,
                  }))
                }
                inputMode={field.type === "text" ? "text" : "numeric"}
                placeholder={field.type === "money" ? "$" : ""}
                className="rounded-[11px] border-0 bg-white/6 px-[13px] py-[11px] text-[13.5px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
              />
            </span>
          ))}
        </span>
      )}

      {needsOther && (
        <span className="flex flex-col gap-1.5">
          <span className="text-meta text-secondary">
            Please describe — this is stored as broker-provided text
          </span>
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Add the detail the options do not cover"
            className="rounded-[11px] border-0 bg-white/6 px-[13px] py-[11px] text-[13.5px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          />
        </span>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!ready}
        className="w-fit cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

/**
 * The document intake: offer, attach, analyse, then review what was read.
 *
 * GUARDRAIL: the extracted values are never treated as confirmed. Every one is
 * presented with its citation for the broker to confirm or correct, and a value
 * already recorded on the application is kept rather than overwritten.
 */
function DocumentIntake({ commercial }: { commercial: Commercial }) {
  const { state, dispatch, upload } = commercial;

  if (upload === "offer" || upload === "attached") {
    return (
      <div className="flex flex-col gap-2.5 border-t border-white/6 pt-3">
        <span className="text-sm leading-[21px]">
          I can read the supporting documents and fill in what they cover, so
          you are not asked for it twice. Nothing read from a document is
          treated as confirmed until you check it.
        </span>

        {state.attachments.length > 0 && (
          <div className="flex max-h-64 scrollbar-thin flex-col gap-1.5 overflow-auto">
            {state.attachments.map((id) => {
              const document = findPackDocument(id);
              if (!document) return null;
              return (
                <span
                  key={id}
                  className="flex flex-wrap items-center gap-2 rounded-[11px] bg-white/6 px-[11px] py-[9px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs leading-4 font-medium [overflow-wrap:anywhere]">
                      {document.displayName}
                    </span>
                    <span className="text-[10.5px] text-tertiary">
                      {document.typeLabel} · {document.sizeLabel} ·{" "}
                      {document.period}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "removeAttachment", id })}
                    className="cursor-pointer rounded-[7px] border-0 bg-white/5 px-[9px] py-1.5 text-[11px] font-medium text-secondary hover:bg-white/12"
                  >
                    Remove
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {state.attachments.length === 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "attachAll" })}
              className="cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface"
            >
              Attach the {DOC_PACK.length} documents on file
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: "startAnalysis" })}
              className="cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface"
            >
              Analyse {state.attachments.length} documents
            </button>
          )}
        </div>

        <span className="text-[11px] leading-4 text-tertiary">
          Documents stay on the file. Extraction is indicative and requires your
          confirmation.
        </span>
        <span className="text-[11px] leading-4 text-tertiary">
          {PROTOTYPE_LABEL}.
        </span>
      </div>
    );
  }

  if (upload === "analysing") {
    return (
      <div className="flex flex-col gap-[9px] rounded-[14px] bg-white/5 px-4 py-3.5">
        <span className="text-secondary-sm font-medium">
          Analysing {state.attachments.length} documents
        </span>
        {ANALYSIS_STEPS.map((step) => (
          <span key={step} className="flex items-center gap-[9px]">
            <span className="block size-1.5 flex-none animate-shimmer rounded-full bg-accent" />
            <span className="text-xs text-secondary">{step}</span>
          </span>
        ))}
        <button
          type="button"
          onClick={() => dispatch({ type: "completeAnalysis" })}
          className="mt-1 w-fit cursor-pointer rounded-lg border-0 bg-white px-3.5 py-2 text-xs font-semibold text-surface"
        >
          Show me what was read
        </button>
        <span className="text-[11px] leading-4 text-tertiary">
          {ANALYSIS_NOTICE}
        </span>
      </div>
    );
  }

  // upload === "review"
  return <ExtractionReview commercial={commercial} />;
}

function ExtractionReview({ commercial }: { commercial: Commercial }) {
  const { state, dispatch } = commercial;
  const rows = extractionRows(state);
  const unconfirmed = rows.filter((r) => !r.confirmed).length;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[15px] leading-[22px] font-medium">
        Review what I read from the documents
      </span>
      <span className="text-secondary-sm leading-[19px] text-secondary">
        {rows.length} values were read from {state.attachments.length}{" "}
        documents. {unconfirmed} still need your confirmation. Each shows the
        document and page it came from.
      </span>

      {rows.map((row) => (
        <ExtractedRow key={row.key} row={row} commercial={commercial} />
      ))}

      {/*
        GUARDRAIL: what the documents did not cover has to be stated as plainly
        as what they did. Listing only the extracted values would let a reader
        infer that a topic absent from the documents is a topic that needs no
        answer — the absence of a document is never proof of absence of a fact.
      */}
      <div className="flex flex-col gap-2 rounded-card bg-white/4 px-3.5 py-3">
        <span className="text-secondary-sm font-medium">
          What the documents did not cover
        </span>
        <span className="text-xs leading-[18px] text-secondary">
          These remain outstanding regardless of what was read. The questions
          ahead collect them.
        </span>
        {NOT_IN_DOCUMENTS.map((item) => (
          <span
            key={item}
            className="flex items-start gap-2 text-xs leading-[18px] text-secondary"
          >
            <span
              aria-hidden
              className="bg-warn mt-[6px] block size-1.5 flex-none rounded-full"
            />
            {item}
          </span>
        ))}
      </div>

      <span className="text-[11.5px] leading-[17px] text-tertiary">
        {SUPPRESSION_RULE}
      </span>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "confirmAllExtracted" })}
          className="cursor-pointer rounded-lg border-0 bg-white px-3.5 py-2.5 text-xs font-semibold text-surface"
        >
          Confirm all {unconfirmed} remaining
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "finishExtractionReview" })}
          disabled={unconfirmed > 0}
          className="cursor-pointer rounded-lg border-0 bg-white/6 px-3.5 py-2.5 text-xs font-medium shadow-[inset_0_0_0_1px_var(--color-hairline)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue with the questions
        </button>
      </div>
    </div>
  );
}

function ExtractedRow({
  row,
  commercial,
}: {
  row: ExtractionRow;
  commercial: Commercial;
}) {
  const { dispatch } = commercial;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.value);

  return (
    <span className="flex flex-col gap-2 rounded-card bg-white/5 px-[15px] py-[13px]">
      <span className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-xs text-secondary">
          {row.label}
        </span>
        <Pill tone={row.tone}>{row.statusLabel}</Pill>
      </span>

      <span className="text-[15px] leading-[21px] font-medium [overflow-wrap:anywhere]">
        {row.value}
      </span>

      {row.prior && (
        <span className="text-xs leading-[18px] text-bad-text">
          Already recorded on the application: {row.prior}. The recorded value
          has been kept.
        </span>
      )}

      {row.editedFrom && (
        <span className="text-xs leading-[18px] text-secondary">
          You corrected this from {row.editedFrom}.
        </span>
      )}

      {row.note && (
        <span className="text-xs leading-[18px] text-secondary">
          {row.note}
        </span>
      )}

      <button
        type="button"
        onClick={() => dispatch({ type: "openSource", key: row.key })}
        className="w-fit cursor-pointer rounded-lg border-0 bg-white/7 px-2.5 py-[7px] text-left text-meta font-medium shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/12"
      >
        {row.citation}
      </button>

      {editing ? (
        <span className="flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-[10px] border-0 bg-white/8 px-3 py-2.5 text-[13.5px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          />
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "editExtracted", key: row.key, value: draft });
              setEditing(false);
            }}
            className="cursor-pointer rounded-lg border-0 bg-white px-[13px] py-[9px] text-xs font-semibold text-surface"
          >
            Save and confirm
          </button>
        </span>
      ) : (
        !row.confirmed && (
          <span className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "confirmExtracted", key: row.key })
              }
              className="cursor-pointer rounded-lg border-0 bg-white px-2.5 py-[7px] text-meta font-semibold text-surface"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="cursor-pointer rounded-lg border-0 bg-white/6 px-2.5 py-[7px] text-meta font-medium text-secondary hover:bg-white/12"
            >
              Correct this
            </button>
          </span>
        )
      )}
    </span>
  );
}

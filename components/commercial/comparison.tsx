"use client";

import { useState } from "react";

import {
  COMPARISON_NOTICE,
  DEFAULT_CALC_INPUTS,
  PANEL_DISCLOSURES,
  PRODUCTS,
  PRODUCT_REVIEW_DATE,
  findProduct,
  type CalculatorInputs,
  type CalculatorRow,
} from "@/lib/domain/commercial/products";
import { CONFIRMATIONS } from "@/lib/domain/commercial/flow";
import { money } from "@/lib/format";
import type { LenderResult } from "@/lib/domain/types";
import type { Commercial } from "@/lib/use-commercial";
import { LenderMark } from "../lender-mark";
import { Card, Caveat, Pill } from "../canvas/ui";
import { Check, RowButton, SectionHeader } from "./ui";

/**
 * Sections 9 and 10 — the lender comparison and the broker's recommendation.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - A product's standing is one of the five `LenderResult` values. There is no
 *    "best", "cheapest" or "recommended lender" anywhere here.
 *  - Every rate, repayment and DSCR figure is a prototype simulation and is
 *    labelled as one.
 *  - The recommendation is the broker's. Nothing on this screen produces one, and
 *    the rationale is required text the broker writes.
 */
export function ComparisonSection({
  commercial,
  onAsk,
}: {
  commercial: Commercial;
  onAsk?: (question: string) => void;
}) {
  const { state, dispatch, progress } = commercial;
  const run = state.calcRuns.at(-1) ?? null;
  const inputs = state.calcInputs ?? DEFAULT_CALC_INPUTS;

  return (
    <>
      <Card className="gap-4 px-[26px] py-[22px]">
        <SectionHeader
          n={9}
          title="Lender and product comparison"
          state={progress.label}
          tone={progress.tone}
        />

        {!progress.canCompare && !progress.canExplore ? (
          <>
            <span className="text-[13px] leading-[19px] text-secondary">
              A comparison is held until the outstanding information below is
              recorded. This says nothing about the application itself.
            </span>
            <span className="flex flex-col gap-1.5">
              {progress.outstanding.map((item) => (
                <span
                  key={item}
                  className="rounded-[10px] bg-white/5 px-3 py-2.5 text-[13px] leading-[19px]"
                >
                  {item}
                </span>
              ))}
            </span>
          </>
        ) : !state.comparisonOpened ? (
          <>
            <span className="text-[13px] leading-[19px] text-secondary">
              {PANEL_DISCLOSURES.considered} Opening the comparison records that
              the options were reviewed against the information on file.
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "openComparison" })}
              className="w-fit cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface"
            >
              Open the comparison
            </button>
          </>
        ) : (
          <>
            <Calculator commercial={commercial} inputs={inputs} />

            <div className="flex flex-col gap-2">
              {(run?.rows ?? baselineRows()).map((row) => (
                <ProductRow
                  key={row.productId}
                  row={row}
                  commercial={commercial}
                />
              ))}
            </div>

            {state.manualOptions.length > 0 && (
              <span className="flex flex-col gap-2">
                <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
                  ADDED OUTSIDE THE PANEL
                </span>
                {state.manualOptions.map((option) => (
                  <span
                    key={option.id}
                    className="flex flex-col gap-1 rounded-card bg-white/4 px-3.5 py-3"
                  >
                    <span className="text-[13.5px] font-medium">
                      {option.lender} — {option.product}
                    </span>
                    <span className="text-xs leading-[18px] text-secondary">
                      {option.note}
                    </span>
                  </span>
                ))}
              </span>
            )}

            <AddOption commercial={commercial} />

            {run && (
              <span className="flex flex-col gap-1.5 rounded-card bg-white/4 px-3.5 py-3">
                <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
                  {run.status.toUpperCase()} — {run.id}
                </span>
                <span className="text-xs leading-[18px] text-secondary">
                  Calculated {run.calculatedAt}. {run.productsReviewed}.
                </span>
                {run.assumptions.map((assumption) => (
                  <span
                    key={assumption}
                    className="text-xs leading-[18px] text-secondary"
                  >
                    {assumption}
                  </span>
                ))}
                {run.confirmations.map((confirmation) => (
                  <span
                    key={confirmation}
                    className="text-xs leading-[18px] text-bad-text"
                  >
                    {confirmation}
                  </span>
                ))}
              </span>
            )}

            <Disclosures />

            {onAsk && (
              <RowButton
                label="Ask about these results"
                onClick={() =>
                  onAsk(
                    "Explain how the product comparison figures were arrived at",
                  )
                }
              />
            )}
          </>
        )}

        <Caveat>
          {COMPARISON_NOTICE.body} Products were reviewed on{" "}
          {PRODUCT_REVIEW_DATE}.
        </Caveat>
      </Card>

      <RecommendationSection commercial={commercial} />
    </>
  );
}

/** The published baseline, shown before the broker runs the calculator. */
function baselineRows(): readonly CalculatorRow[] {
  return PRODUCTS.map((product) => ({
    productId: product.id,
    lender: product.lender,
    product: product.product,
    logo: product.logo,
    rate: product.pricing.rate,
    pricingLabel: product.pricing.label,
    sourceType: product.pricing.sourceType,
    monthly: product.sim.monthly,
    annual: product.sim.annual,
    interest: product.sim.interest,
    firstYear: product.sim.firstYear,
    dscr: product.sim.dscr,
    result: product.result,
    resultNote: product.resultNote,
    flexibility: product.flexibility,
    issue: product.issue,
    simulated: false,
  }));
}

function Calculator({
  commercial,
  inputs,
}: {
  commercial: Commercial;
  inputs: CalculatorInputs;
}) {
  const { dispatch } = commercial;
  const [draft, setDraft] = useState(inputs);

  const set = <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="flex flex-col gap-3 rounded-card bg-white/4 px-3.5 py-3.5">
      <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
        INDICATIVE SIMULATION — ADJUST THE ASSUMPTIONS
      </span>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <NumberInput
          label="Loan amount"
          value={draft.amount}
          onChange={(v) => set("amount", v)}
        />
        <NumberInput
          label="Term (years)"
          value={draft.years}
          onChange={(v) => set("years", v)}
        />
        <NumberInput
          label="Normalised EBITDA"
          value={draft.ebitda}
          onChange={(v) => set("ebitda", v)}
        />
        <NumberInput
          label="Existing debt commitments"
          value={draft.existingDebt}
          onChange={(v) => set("existingDebt", v)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-meta text-secondary">Repayment type</span>
          <select
            value={draft.repaymentType}
            onChange={(e) =>
              set(
                "repaymentType",
                e.target.value as CalculatorInputs["repaymentType"],
              )
            }
            className="rounded-[10px] border-0 bg-white/6 px-3 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          >
            <option value="PI">Principal and interest</option>
            <option value="IO">Interest only</option>
          </select>
        </label>
        <NumberInput
          label="Rate override (%)"
          value={draft.rateOverride ?? 0}
          onChange={(v) => set("rateOverride", v === 0 ? null : v)}
        />
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "runCalculator", inputs: draft })}
        className="w-fit cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface"
      >
        Run the simulation
      </button>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-meta text-secondary">{label}</span>
      <input
        value={String(value)}
        inputMode="numeric"
        onChange={(e) =>
          onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)
        }
        className="rounded-[10px] border-0 bg-white/6 px-3 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      />
    </label>
  );
}

const RESULT_TONE: Readonly<
  Record<LenderResult, "good" | "warn" | "bad" | "muted">
> = {
  "Proposed option": "good",
  "Suitable alternative for consideration": "muted",
  "Policy confirmation required": "bad",
  "Insufficient information to assess": "warn",
  "Not presently preferred": "muted",
};

function ProductRow({
  row,
  commercial,
}: {
  row: CalculatorRow;
  commercial: Commercial;
}) {
  const { state, dispatch } = commercial;
  const product = findProduct(row.productId);
  const exclusion = state.excluded[row.productId];
  const [open, setOpen] = useState(false);
  const [excluding, setExcluding] = useState(false);
  const [reason, setReason] = useState("");
  const [rationale, setRationale] = useState("");
  const [proposing, setProposing] = useState(false);

  return (
    <div
      className={`flex flex-col gap-2 rounded-card px-3.5 py-3 ${
        exclusion ? "bg-white/3 opacity-70" : "bg-white/5"
      }`}
    >
      <span className="flex flex-wrap items-center gap-2">
        <LenderMark name={row.lender} size={26} />
        <span className="min-w-0 flex-1 flex-col">
          <span className="block text-[13.5px] font-medium">{row.lender}</span>
          <span className="block text-meta text-secondary">{row.product}</span>
        </span>
        <Pill tone={RESULT_TONE[row.result]}>{row.result}</Pill>
      </span>

      <span className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-x-4 gap-y-2">
        <Figure label="Rate (simulated)" value={`${row.rate.toFixed(2)}%`} />
        <Figure label="Monthly (simulated)" value={money(row.monthly)} />
        <Figure label="First year (simulated)" value={money(row.firstYear)} />
        <Figure label="DSCR (simulated)" value={row.dscr} />
      </span>

      <span className="text-meta text-tertiary">
        {row.pricingLabel} · {row.sourceType} · Indicative prototype simulation
      </span>

      <span className="text-xs leading-[18px] text-secondary">
        {row.resultNote}
      </span>

      {exclusion ? (
        <span className="text-xs leading-[18px] text-secondary">
          Excluded by the broker: {exclusion.reason}
        </span>
      ) : (
        <span className="flex flex-wrap gap-1.5">
          <RowButton
            label={open ? "Hide the detail" : "Show the detail"}
            onClick={() => setOpen(!open)}
          />
          <RowButton
            label="Record as the proposed option"
            onClick={() => setProposing(true)}
          />
          <RowButton
            label="Exclude with a reason"
            onClick={() => setExcluding(true)}
          />
        </span>
      )}

      {proposing && (
        <span className="flex flex-wrap items-center gap-2">
          <input
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Your rationale — recorded on the file in your words"
            className="min-w-[200px] flex-1 rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!rationale.trim()) return;
              dispatch({
                type: "recommend",
                productId: row.productId,
                rationale: rationale.trim(),
              });
              setProposing(false);
            }}
            className="cursor-pointer rounded-lg border-0 bg-white px-[13px] py-2 text-xs font-semibold text-surface"
          >
            Record
          </button>
        </span>
      )}

      {excluding && (
        <span className="flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this option was excluded"
            className="min-w-[200px] flex-1 rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!reason.trim()) return;
              dispatch({
                type: "excludeProduct",
                productId: row.productId,
                reason: reason.trim(),
              });
              setExcluding(false);
            }}
            className="cursor-pointer rounded-lg border-0 bg-white px-[13px] py-2 text-xs font-semibold text-surface"
          >
            Exclude
          </button>
        </span>
      )}

      {open && product && (
        <span className="flex flex-col gap-2 rounded-card bg-white/4 px-3 py-2.5">
          <Detail label="Security" value={product.features.security} />
          <Detail label="Rate types" value={product.features.rateTypes} />
          <Detail label="Repayment" value={product.features.repayment} />
          <Detail
            label="Extra repayments"
            value={product.features.extraRepayments}
          />
          <Detail label="Maximum term" value={product.features.maxTerm} />
          <Detail label="LVR" value={product.features.lvr} />
          <Detail
            label="Trading history"
            value={product.features.tradingHistory}
          />
          <Detail label="Guarantees" value={product.guarantees} />
          <Detail label="Covenants" value={product.covenants} />
          <Detail label="Flexibility" value={product.flexibility} />
          <Detail label="Alignment with the request" value={product.fit} />
          <Detail label="Requires confirmation" value={product.issue} />
          <Detail label="Feature source" value={product.source} />
          {product.policyPoints.length > 0 && (
            <span className="flex flex-col gap-1">
              <span className="text-meta text-secondary">Policy points</span>
              {product.policyPoints.map((point) => (
                <span key={point} className="text-xs leading-[18px]">
                  {point}
                </span>
              ))}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function AddOption({ commercial }: { commercial: Commercial }) {
  const { dispatch } = commercial;
  const [open, setOpen] = useState(false);
  const [lender, setLender] = useState("");
  const [product, setProduct] = useState("");
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <RowButton
        label="Add a lender or product outside the panel"
        onClick={() => setOpen(true)}
      />
    );
  }

  return (
    <span className="flex flex-col gap-2 rounded-card bg-white/4 px-3.5 py-3">
      <span className="text-meta text-secondary">
        Recorded as a broker-added option. It carries no simulated figures.
      </span>
      <input
        value={lender}
        onChange={(e) => setLender(e.target.value)}
        placeholder="Lender"
        className="rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      />
      <input
        value={product}
        onChange={(e) => setProduct(e.target.value)}
        placeholder="Product"
        className="rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why it was considered"
        className="rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      />
      <button
        type="button"
        onClick={() => {
          if (!lender.trim() || !product.trim()) return;
          dispatch({
            type: "addManualOption",
            lender: lender.trim(),
            product: product.trim(),
            note: note.trim(),
          });
          setOpen(false);
          setLender("");
          setProduct("");
          setNote("");
        }}
        className="w-fit cursor-pointer rounded-lg border-0 bg-white px-[13px] py-2 text-xs font-semibold text-surface"
      >
        Add the option
      </button>
    </span>
  );
}

function Disclosures() {
  return (
    <span className="flex flex-col gap-2 rounded-card bg-white/4 px-3.5 py-3">
      <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
        PANEL, FEES AND CONFLICTS
      </span>
      <span className="text-xs leading-[18px] text-secondary">
        {PANEL_DISCLOSURES.panelLimit}
      </span>
      <span className="text-xs leading-[18px] text-secondary">
        {PANEL_DISCLOSURES.conflicts}
      </span>
      {PANEL_DISCLOSURES.fees.map((fee) => (
        <span
          key={fee.label}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <span className="flex-[1_1_160px] text-xs text-secondary">
            {fee.label}
          </span>
          <span className="text-xs font-medium">{fee.value}</span>
        </span>
      ))}
      <span className="text-xs leading-[18px] text-secondary">
        {PANEL_DISCLOSURES.commission}
      </span>
      <span className="text-xs leading-[18px] text-secondary">
        {PANEL_DISCLOSURES.notRemuneration}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------

function RecommendationSection({ commercial }: { commercial: Commercial }) {
  const { state, dispatch } = commercial;
  const recommendation = state.recommendation;
  const product = recommendation ? findProduct(recommendation.productId) : null;
  const [choiceNote, setChoiceNote] = useState("");
  const [via, setVia] = useState("Telephone discussion");

  return (
    <Card className="gap-4 px-[26px] py-[22px]">
      <SectionHeader
        n={10}
        title="Proposed recommendation and rationale"
        state={
          !recommendation
            ? "Not recorded"
            : recommendation.needsReconfirmation
              ? "Requires reconfirmation"
              : recommendation.confirmed
                ? "Broker confirmed"
                : "Awaiting broker confirmation"
        }
        tone={
          !recommendation
            ? "muted"
            : recommendation.needsReconfirmation
              ? "warn"
              : recommendation.confirmed
                ? "good"
                : "warn"
        }
      />

      {!recommendation ? (
        <span className="text-[13px] leading-[19px] text-secondary">
          No recommendation has been recorded. The recommendation is yours to
          make and to write; nothing in this prototype produces one.
        </span>
      ) : (
        <>
          <span className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {product?.lender} — {product?.product}
            </span>
            <span className="text-meta text-secondary">
              Recorded {recommendation.at}
            </span>
          </span>

          <span className="flex flex-col gap-1.5 rounded-card bg-white/4 px-3.5 py-3">
            <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
              BROKER RATIONALE
            </span>
            <span className="text-[13px] leading-[19px]">
              {recommendation.rationale}
            </span>
          </span>

          {recommendation.needsReconfirmation && (
            <span className="rounded-card bg-warn-fill px-3.5 py-3 text-[13px] leading-[19px]">
              A material figure changed after this recommendation was confirmed.
              It has been kept on the file and needs reconfirming against the
              information now recorded.
            </span>
          )}

          {!recommendation.confirmed && (
            <button
              type="button"
              onClick={() => dispatch({ type: "confirmRecommendation" })}
              className="w-fit cursor-pointer rounded-[10px] border-0 bg-white px-4 py-2.5 text-[13px] font-semibold text-surface"
            >
              Confirm this rationale is mine
            </button>
          )}

          {state.superseded.length > 0 && (
            <span className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
                SUPERSEDED RECOMMENDATIONS
              </span>
              {state.superseded.map((previous, index) => (
                <span
                  key={`${previous.productId}-${index}`}
                  className="rounded-card bg-white/4 px-3.5 py-2.5 text-xs leading-[18px] text-secondary"
                >
                  {findProduct(previous.productId)?.lender} —{" "}
                  {previous.rationale}
                </span>
              ))}
            </span>
          )}

          <span className="flex flex-col gap-2">
            <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
              CLIENT CHOICE
            </span>
            {state.choice ? (
              <span className="flex flex-col gap-1 rounded-card bg-white/4 px-3.5 py-3">
                <span className="text-[13px] font-medium">
                  {findProduct(state.choice.productId)?.lender} — recorded{" "}
                  {state.choice.recordedAt}
                </span>
                <span className="text-xs leading-[18px] text-secondary">
                  Discussed via {state.choice.discussedVia}. {state.choice.note}
                </span>
              </span>
            ) : (
              <span className="flex flex-col gap-2">
                <span className="text-[13px] leading-[19px] text-secondary">
                  The client&rsquo;s decision is recorded only when they have
                  made one. It is never inferred from the recommendation.
                </span>
                <select
                  value={via}
                  onChange={(e) => setVia(e.target.value)}
                  className="w-fit rounded-[10px] border-0 bg-white/6 px-3 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
                >
                  <option>Telephone discussion</option>
                  <option>Video meeting</option>
                  <option>In person</option>
                  <option>Email exchange</option>
                </select>
                <input
                  value={choiceNote}
                  onChange={(e) => setChoiceNote(e.target.value)}
                  placeholder="What the client decided and why"
                  className="rounded-[10px] border-0 bg-white/8 px-3 py-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-hairline)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!choiceNote.trim()) return;
                    dispatch({
                      type: "recordChoice",
                      productId: recommendation.productId,
                      discussedVia: via,
                      note: choiceNote.trim(),
                    });
                  }}
                  className="w-fit cursor-pointer rounded-lg border-0 bg-white px-[13px] py-2 text-xs font-semibold text-surface"
                >
                  Record the client&rsquo;s choice
                </button>
              </span>
            )}
          </span>
        </>
      )}

      <span className="flex flex-col gap-2">
        <span className="text-[11px] font-medium tracking-[0.06em] text-secondary">
          BROKER CONFIRMATIONS
        </span>
        {CONFIRMATIONS.map((confirmation) => {
          const given = Boolean(state.confirmations[confirmation.id]);
          return (
            <button
              key={confirmation.id}
              type="button"
              onClick={() =>
                dispatch({
                  type: "setConfirmation",
                  id: confirmation.id,
                  given: !given,
                })
              }
              className="flex cursor-pointer items-start gap-2.5 rounded-card border-0 bg-white/4 px-3.5 py-2.5 text-left hover:bg-white/8"
            >
              <span
                aria-hidden
                className={`mt-px flex size-[18px] flex-none items-center justify-center rounded-[5px] text-[11px] ${
                  given ? "bg-accent text-inset" : "bg-white/15"
                }`}
              >
                {given ? "✓" : ""}
              </span>
              <span className="text-[13px] leading-[19px]">
                {confirmation.label}
              </span>
            </button>
          );
        })}
      </span>

      <Caveat>
        A confirmation is withdrawn automatically when a figure it was given
        against changes, so it always refers to the information now on file.
      </Caveat>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-[10.5px] text-tertiary">{label}</span>
      <span className="text-[13.5px] font-medium">{value}</span>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="flex-[1_1_140px] text-xs text-secondary">{label}</span>
      <span className="flex-[2_1_200px] text-xs leading-[18px]">{value}</span>
    </span>
  );
}

export { Check };

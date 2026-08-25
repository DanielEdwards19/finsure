/**
 * Commercial application — the structured record shown on the canvas.
 *
 * Sections 1 to 6 are built here from the derived fields. A row exists only when
 * it has a value, so the canvas grows as the guided questions are answered
 * rather than opening as a wall of empty labels.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - Every row carries a `ValueSource`. There is no way to add one without.
 *  - Calculated rows carry the formula that produced them and are labelled
 *    indicative.
 *  - The strongest state a section reaches is "Broker confirmed". No section
 *    ever reads as compliant, verified or approved.
 */

import { money } from "@/lib/format";
import type { Tone } from "@/lib/design/tokens";
import type { ValueSource } from "@/lib/domain/types";
import {
  calcs,
  deriveFields,
  sourceOfField,
  activeFindings,
  type ActiveFinding,
  type Calculations,
  type DerivedFields,
} from "./derive";
import { plan } from "./derive";
import { FIELD_META, REVIEW_STATE } from "./document-pack";
import {
  EFFECT_ORDER,
  QUESTIONS,
  SECTIONS,
  SOURCE_BROKER,
  SOURCE_CALC,
  type Effect,
  type FieldValue,
} from "./flow";
import type { Adjustment, CommercialState } from "./state";

/** A label:value pair on the canvas, with where the value came from. */
export interface SectionRow {
  readonly label: string;
  readonly value: string;
  readonly source: ValueSource;
  /** Field key, when the broker may edit the value directly on the canvas. */
  readonly fieldKey: string | null;
  /** The formula or the nuance behind the figure. */
  readonly basis: string | null;
  /** Extraction key, when the value came from a document. */
  readonly extractionKey: string | null;
  readonly reviewLabel: string | null;
  readonly reviewTone: Tone | null;
  readonly awaitingConfirmation: boolean;
}

export interface CanvasSection {
  readonly id: string;
  readonly n: number;
  readonly title: string;
  readonly state: string;
  readonly tone: Tone;
  readonly rows: readonly SectionRow[];
  /** Rows not shown because the question behind them is unanswered. */
  readonly hidden: number;
  readonly findings: readonly ActiveFinding[];
  readonly formulas: readonly string[];
  readonly adjustments: readonly Adjustment[];
}

// ---------------------------------------------------------------------------
// Row construction
// ---------------------------------------------------------------------------

/** A row before empty values are dropped. */
interface Draft {
  readonly label: string;
  readonly value: FieldValue | null | undefined;
  readonly source: ValueSource;
  readonly fieldKey?: string;
  readonly basis?: string | null;
}

const blank = (value: FieldValue | null | undefined): boolean =>
  value == null || value === "" || (Array.isArray(value) && value.length === 0);

const display = (value: FieldValue): string =>
  Array.isArray(value) ? value.join("\n") : String(value);

const row = (
  label: string,
  value: FieldValue | null | undefined,
  source: ValueSource,
  fieldKey?: string,
  basis?: string | null,
): Draft => ({ label, value, source, fieldKey, basis });

const cash = (
  label: string,
  value: FieldValue | null | undefined,
  source: ValueSource,
  fieldKey?: string,
): Draft => ({
  label,
  value: blank(value) ? null : money(Number(value)),
  source,
  fieldKey,
});

/**
 * A figure the client supplied rather than the broker. It is still recorded
 * under the broker's guided setup — that is the permitted provenance — with the
 * distinction kept in the basis line.
 */
const CLIENT_FIGURE = "Provided by the client during guided setup";
const BROKER_ADJUSTMENT = "Broker adjustment";
const ADJUSTMENT_REVIEWED = "Broker adjustment — evidence reviewed";

function resolve(state: CommercialState, draft: Draft): SectionRow | null {
  if (blank(draft.value)) return null;

  const key = draft.fieldKey ?? null;

  // An extraction is linked to its row so the citation and the confirm control
  // travel with the value the broker is looking at.
  const extractionKey = key
    ? (Object.keys(state.extracted).find(
        (k) => FIELD_META[k]?.appKey === key,
      ) ?? null)
    : null;
  const extracted = extractionKey ? state.extracted[extractionKey] : null;
  const review = extracted ? REVIEW_STATE[extracted.status] : null;
  const brokerDecided =
    extracted?.status === "broker_confirmed" ||
    extracted?.status === "broker_edited";

  return {
    label: draft.label,
    value: display(draft.value!),
    source: key ? sourceOfField(state, key) : draft.source,
    fieldKey: key,
    basis: draft.basis ?? null,
    extractionKey,
    reviewLabel: review?.label ?? null,
    reviewTone: review?.tone ?? null,
    awaitingConfirmation: extracted != null && !brokerDecided,
  };
}

// ---------------------------------------------------------------------------
// Sections 1 to 6
// ---------------------------------------------------------------------------

function drafts(
  f: DerivedFields,
  c: Calculations,
): Readonly<Record<string, readonly Draft[]>> {
  const pct = (n: number | null): string | null =>
    n == null ? null : `${n.toFixed(2)}%`;

  return {
    entities: [
      row("Client record", f.clientStatus, SOURCE_BROKER),
      row("Legal name", f.legalName, SOURCE_BROKER, "legalName"),
      row("Trading name", f.tradingName, SOURCE_BROKER, "tradingName"),
      row("ABN", f.abn, SOURCE_BROKER, "abn"),
      row("Entity type", f.entityType, SOURCE_BROKER),
      row("Trustee", f.trusteeType, SOURCE_BROKER),
      row(
        "Directors and beneficial owners",
        f.directors,
        SOURCE_BROKER,
        "directors",
      ),
      row(
        "Identity evidence held",
        f.identityEvidence,
        SOURCE_BROKER,
        "identityEvidence",
      ),
      row("Proposed guarantors", f.guarantors, SOURCE_BROKER, "guarantors"),
      row("Authorised contact", f.contacts, SOURCE_BROKER, "contacts"),
      row(
        "Authority to collect, use and share information",
        f.authorityStatus,
        SOURCE_BROKER,
      ),
      row("Person acting for another", f.actingFor, SOURCE_BROKER),
      row(
        "Acting person and capacity",
        f.actingName
          ? `${String(f.actingName)} — ${String(f.actingCapacity ?? "")}`
          : null,
        SOURCE_BROKER,
      ),
    ],

    request: [
      row("Finance purposes", f.purposes, SOURCE_BROKER),
      row("Refinance reasons", f.refiReasons, SOURCE_BROKER),
      /*
       * The regulatory treatment follows from the purpose, so the row appears
       * only once a purpose is recorded. Until then there is nothing for the
       * broker to review, and an unprompted "Requires broker review" would read
       * as a finding against a file that has not been started.
       */
      row(
        "Regulatory treatment",
        blank(f.purposes) ? null : (f.regTreatment ?? "Requires broker review"),
        SOURCE_BROKER,
      ),
      row("Current indication", f.purposeIndication, SOURCE_BROKER),
      row(
        "Purpose split",
        f.splitCommercial
          ? `${String(f.splitCommercial)}% business or commercial / ${String(f.splitOther ?? 0)}% other`
          : null,
        SOURCE_BROKER,
      ),
      row("Direct benefit of funds", f.benefit, SOURCE_BROKER),
      row("Transaction stage", f.txStage, SOURCE_BROKER),
      cash(
        "Purchase price or project cost",
        f.purchasePrice,
        SOURCE_BROKER,
        "purchasePrice",
      ),
      cash("Requested loan amount", f.loanAmount, SOURCE_BROKER, "loanAmount"),
      cash(
        "Client contribution before costs",
        f.contribution,
        SOURCE_BROKER,
        "contribution",
      ),
      row(
        "Source of contribution",
        f.contributionSource,
        SOURCE_BROKER,
        "contributionSource",
      ),
      cash(
        "Estimated acquisition and settlement costs",
        f.acqCosts,
        SOURCE_BROKER,
        "acqCosts",
      ),
      cash(
        "Total cash available before settlement",
        f.cashAvailable,
        SOURCE_BROKER,
        "cashAvailable",
      ),
      row(
        "Requested LVR (indicative)",
        pct(c.lvr),
        SOURCE_CALC,
        undefined,
        c.lvrFormula,
      ),
      row(
        "Estimated total funds required (indicative)",
        c.totalFunds ? money(c.totalFunds) : null,
        SOURCE_CALC,
        undefined,
        c.totalFundsFormula,
      ),
      row(
        "Indicative funding position",
        f.loanAmount && f.purchasePrice
          ? c.position >= 0
            ? `Surplus of ${money(c.position)}`
            : `Shortfall of ${money(Math.abs(c.position))}`
          : null,
        SOURCE_CALC,
        undefined,
        c.positionFormula,
      ),
      row(
        "Working capital retained after settlement (indicative)",
        f.cashAvailable ? money(c.workingCapital) : null,
        SOURCE_CALC,
        undefined,
        c.workingCapitalFormula,
      ),
      row(
        "Loan term requested",
        f.term ? `${String(f.term)} years` : null,
        SOURCE_BROKER,
        "term",
      ),
      row("Repayment structure", f.repaymentType, SOURCE_BROKER),
      row("Interest preference", f.interestPref, SOURCE_BROKER),
      row(
        "Required settlement date",
        f.settlementDate,
        SOURCE_BROKER,
        "settlementDate",
      ),
      row("Deposit", f.deposit, SOURCE_BROKER),
      row("Transaction conditions", f.conditions, SOURCE_BROKER),
      row("Vendor finance", f.vendorFinance, SOURCE_BROKER),
      row("Acquisition components funded", f.acqComponents, SOURCE_BROKER),
      row("Development cost evidence", f.devCosts, SOURCE_BROKER),
      row("Working-capital need", f.wcNeed, SOURCE_BROKER),
      row("Facility pattern", f.wcFacility, SOURCE_BROKER),
      row("Asset economic life vs term", f.assetLife, SOURCE_BROKER),
    ],

    business: [
      row("Industry and activities", f.industry, SOURCE_BROKER, "industry"),
      row("Trading history", f.tradingHistory, SOURCE_BROKER),
      row("Locations", f.locations, SOURCE_BROKER, "locations"),
      row("Employees", f.employees, SOURCE_BROKER, "employees"),
      row("Franchise", f.franchise, SOURCE_BROKER),
      row(
        "Largest customer or referral concentration",
        f.concentration,
        SOURCE_BROKER,
      ),
      row("Material recent or expected changes", f.changes, SOURCE_BROKER),
      row("Management experience", f.acqExperience, SOURCE_BROKER),
      row("Project type", f.devType, SOURCE_BROKER),
    ],

    financials: [
      row(
        "Financial information available",
        f.evidenceAvailable,
        SOURCE_BROKER,
      ),
      cash(
        "Revenue — most recent completed year",
        f.rev1,
        SOURCE_BROKER,
        "rev1",
      ),
      cash("Revenue — prior year", f.rev2, SOURCE_BROKER, "rev2"),
      cash(
        "Taxable income — prior year",
        f.taxableIncomePrior,
        SOURCE_BROKER,
        "taxableIncomePrior",
      ),
      cash("Current year-to-date revenue", f.ytd, SOURCE_BROKER, "ytd"),
      cash("Year-to-date EBITDA", f.ytdEbitda, SOURCE_BROKER, "ytdEbitda"),
      row(
        "Primary operating account",
        f.operatingAccount,
        SOURCE_BROKER,
        "operatingAccount",
      ),
      cash(
        "Net operating cash movement — six months",
        f.sixMonthCashFlow,
        SOURCE_BROKER,
        "sixMonthCashFlow",
      ),
      cash(
        "Cash at bank — most recent statement",
        f.currentCash,
        SOURCE_BROKER,
        "currentCash",
      ),
      cash(
        "Cash at bank — last balance date",
        f.cashAtBank,
        SOURCE_BROKER,
        "cashAtBank",
      ),
      {
        ...cash(
          "Reported EBITDA",
          c.reportedEbitda || null,
          SOURCE_BROKER,
          "ebitdaReported",
        ),
        basis: CLIENT_FIGURE,
      },
      row("Normalisation basis", f.adjustmentBasis, SOURCE_BROKER),
      cash(
        "Normalisation add-back proposed",
        f.addBackProposed,
        SOURCE_BROKER,
        "addBackProposed",
      ),
      {
        ...cash(
          "Proposed adjustments",
          c.proposedAdjustments || null,
          SOURCE_BROKER,
        ),
        basis: BROKER_ADJUSTMENT,
      },
      {
        ...cash(
          "Adjustments accepted for simulation",
          c.acceptedAdjustments || null,
          SOURCE_BROKER,
        ),
        basis: ADJUSTMENT_REVIEWED,
      },
      cash("Normalised EBITDA", c.normalisedEbitda || null, SOURCE_CALC),
      cash(
        "Existing annual business debt commitments",
        f.existingDebt,
        SOURCE_BROKER,
        "existingDebt",
      ),
      cash(
        "Existing debt balance",
        f.existingDebtBalance,
        SOURCE_BROKER,
        "existingDebtBalance",
      ),
      row("Tax position", f.taxPosition, SOURCE_BROKER),
      cash("Tax balance recorded", f.taxBalance, SOURCE_BROKER),
      row("Primary repayment source", f.repaymentSource, SOURCE_BROKER),
      row(
        "Secondary repayment or exit strategy",
        f.exitStrategy,
        SOURCE_BROKER,
      ),
      row(
        "Indicative DSCR",
        c.dscr ? `${c.dscr.toFixed(2)}x` : null,
        SOURCE_CALC,
        undefined,
        c.dscrFormula,
      ),
      row("Debtor ledger", f.ifLedger, SOURCE_BROKER),
      row("Contingency allowance", f.devContingency, SOURCE_BROKER),
    ],

    security: [
      row("Proposed security", f.security, SOURCE_BROKER),
      row(
        "Purpose remains commercial despite residential security",
        f.resiCommercial,
        SOURCE_BROKER,
      ),
      row(
        "Property address",
        f.propertyAddress,
        SOURCE_BROKER,
        "propertyAddress",
      ),
      row("Occupancy", f.occupancy, SOURCE_BROKER),
      row(
        "Proposed third-party tenant",
        f.tenantName,
        SOURCE_BROKER,
        "tenantName",
      ),
      row(
        "Proposed tenant area",
        f.tenantArea
          ? `Approximately ${String(f.tenantArea)}% of net lettable area`
          : null,
        SOURCE_BROKER,
        "tenantArea",
      ),
      row("Proposed lease term", f.tenantTerm, SOURCE_BROKER, "tenantTerm"),
      row("Lease status", f.tenantStatus, SOURCE_BROKER),
      row("Rental income treatment", f.rentTreatment, SOURCE_BROKER),
      row("Value basis", f.valueBasis, SOURCE_BROKER),
      row("Existing mortgages or encumbrances", f.encumbrances, SOURCE_BROKER),
      row(
        "Environmental, zoning or planning matters",
        f.propertyMatters,
        SOURCE_BROKER,
      ),
      row("Asset type", f.assetType, SOURCE_BROKER),
      row("Asset condition", f.assetCondition, SOURCE_BROKER),
      row("Planning status", f.devPlanning, SOURCE_BROKER),
      row("Builder", f.devBuilder, SOURCE_BROKER),
      row("Pre-sales or pre-leases", f.devPresales, SOURCE_BROKER),
    ],

    needs: [
      row("Client’s three highest priorities", f.priorities, SOURCE_BROKER),
      row("Trade-offs the client may accept", f.tradeoffs, SOURCE_BROKER),
      row(
        "Primary objective",
        f.objectivePrimary,
        SOURCE_BROKER,
        "objectivePrimary",
      ),
      row(
        "Secondary objective",
        f.objectiveSecondary,
        SOURCE_BROKER,
        "objectiveSecondary",
      ),
      row(
        "Refinance benefit statement",
        f.refiBenefit,
        SOURCE_BROKER,
        "refiBenefit",
      ),
    ],
  };
}

// ---------------------------------------------------------------------------
// Section state
// ---------------------------------------------------------------------------

const STRUCTURED = SECTIONS.filter((s) => s.n <= 6);

const TONE: Readonly<Record<string, Tone>> = {
  "Not started": "muted",
  "In progress": "muted",
  "Information required": "bad",
  "Requires review": "warn",
  "Ready for broker confirmation": "good",
  "Broker confirmed": "good",
};

/** True when every planned question in the section has an answer. */
function sectionAnswered(state: CommercialState, id: string): boolean {
  const questions = plan(state).filter((qid) => QUESTIONS[qid].section === id);
  return (
    questions.length > 0 &&
    questions.every((qid) => Boolean(state.answers[qid]))
  );
}

/**
 * The state of a section, from its rows and the findings against it.
 *
 * GUARDRAIL: an outstanding finding always outranks progress. A section with
 * every row filled still reads "Information required" while a BLOCK finding
 * stands against it.
 */
function sectionState(
  state: CommercialState,
  id: string,
  filled: number,
  findings: readonly ActiveFinding[],
): string {
  if (filled === 0) return "Not started";

  const worst = findings.reduce<Effect | null>(
    (current, finding) =>
      current == null ||
      EFFECT_ORDER.indexOf(finding.effect) < EFFECT_ORDER.indexOf(current)
        ? finding.effect
        : current,
    null,
  );

  if (worst === "BLOCK") return "Information required";
  if (worst === "PAUSE") return "Requires review";
  if (state.finalised) return "Broker confirmed";
  if (sectionAnswered(state, id)) return "Ready for broker confirmation";
  return "In progress";
}

export function canvasSections(
  state: CommercialState,
): readonly CanvasSection[] {
  const fields = deriveFields(state);
  const calculations = calcs(state, fields);
  const findings = activeFindings(state);
  const bySection = drafts(fields, calculations);

  return STRUCTURED.map((section) => {
    const all = bySection[section.id] ?? [];
    const rows = all
      .map((draft) => resolve(state, draft))
      .filter((r): r is SectionRow => r != null);

    const sectionFindings = findings.filter((f) => f.section === section.id);
    const label = sectionState(state, section.id, rows.length, sectionFindings);

    return {
      id: section.id,
      n: section.n,
      title: section.title,
      state: label,
      tone: TONE[label] ?? "muted",
      rows,
      hidden: all.length - rows.length,
      findings: sectionFindings,
      formulas: rows
        .filter((r) => r.source === SOURCE_CALC && r.basis)
        .map((r) => r.basis!),
      adjustments: section.id === "financials" ? state.adjustments : [],
    };
  });
}

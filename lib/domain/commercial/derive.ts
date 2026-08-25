/**
 * Commercial application — derived state.
 *
 * Every function here is pure: same state in, same result out. Nothing is
 * cached and nothing is stored back, so a changed answer cannot leave a stale
 * document requirement, finding or figure behind. That property is what lets the
 * chat and the canvas read from one source without drifting apart.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - A finding describes what needs review. None of these functions concludes
 *    that an application is compliant, suitable or approvable.
 *  - `calcs` exposes the formula behind every figure it returns, and each is
 *    labelled indicative.
 *  - A document requirement that no longer applies is removed rather than left
 *    outstanding, so the register reflects the current answer set.
 */

import { money } from "@/lib/format";
import {
  CHECKS,
  DOC_STATUS,
  EFFECT_ORDER,
  GATE,
  MATERIAL_QUESTIONS,
  PROGRESSION,
  QUESTIONS,
  findFlowDocument,
  findFlowFinding,
  type CheckContext,
  type DocStatus,
  type Effect,
  type FieldValue,
  type FlowFinding,
  type ProgressionKey,
  type ReviewStatus,
} from "./flow";
import {
  FIELD_META,
  FIELD_NOTES,
  REVIEW_STATE,
  SOURCE_MAP,
  UNMAPPED_LABELS,
  findPackDocument,
} from "./document-pack";
import { findProduct } from "./products";
import { findClient, valueOf, valuesOf, type CommercialState } from "./state";
import type { Tone } from "@/lib/design/tokens";

// ---------------------------------------------------------------------------
// Active modules
// ---------------------------------------------------------------------------

export interface ActiveModules {
  readonly purchase: boolean;
  readonly refinance: boolean;
  readonly acquisition: boolean;
  readonly equipment: boolean;
  readonly workingcap: boolean;
  readonly development: boolean;
  readonly invoice: boolean;
  readonly propertySecurity: boolean;
  readonly residentialSecurity: boolean;
}

/** Which specialist question sets apply, from the purpose and security answers. */
export function modulesActive(state: CommercialState): ActiveModules {
  const purposes = valuesOf(state, "P01");
  const security = valuesOf(state, "P04");

  return {
    purchase: purposes.includes("purchase"),
    refinance: purposes.includes("refinance"),
    acquisition:
      purposes.includes("acquire") || valueOf(state, "B01") === "newentity",
    equipment: purposes.includes("equipment") || security.includes("equipment"),
    workingcap: purposes.includes("workingcap"),
    development: purposes.includes("development"),
    invoice: purposes.includes("invoice"),
    propertySecurity:
      security.includes("commercial") || security.includes("residential"),
    residentialSecurity: security.includes("residential"),
  };
}

// ---------------------------------------------------------------------------
// Question plan
// ---------------------------------------------------------------------------

/**
 * The ordered question plan for the current answer set.
 *
 * A conditional question appears only while its condition holds, so changing an
 * answer withdraws the questions it created — and, because the register and the
 * findings are both derived from this plan, withdraws their effects too.
 *
 * An early return means the flow stops there: nothing beyond that point is
 * asked, and nothing beyond it contributes documents or findings.
 */
export function plan(state: CommercialState): readonly string[] {
  const m = modulesActive(state);

  // Documents first: if the broker holds a pack, authority is recorded and the
  // documents are read before any identity or transaction question is asked.
  const p: string[] = ["I01", "C03"];

  const authority = valueOf(state, "C03");
  if (authority === "notyet" || authority === "declined") return p;

  p.push("C01", "C02");
  if (valueOf(state, "C02") === "trust") p.push("C02A");
  p.push("C04", "P01");
  if (m.refinance) p.push("P01A");

  p.push("P02");
  const p02 = valueOf(state, "P02");
  if (p02 && p02 !== "no") p.push("P02A");
  // A regulated classification stops the commercial flow entirely.
  if (valueOf(state, "P02A") === "regulated") return p;

  p.push("P03", "P04");
  if (m.residentialSecurity) p.push("P04A");
  if (valueOf(state, "P04A") === "no") return p;

  if (m.purchase || m.development) p.push("T01");
  const t01 = valueOf(state, "T01");
  if (t01 === "signed" || t01 === "unconditional") p.push("T02");

  p.push("T03", "T04", "T05", "B01", "B02", "B03", "B04", "B05", "B06");
  if (valueOf(state, "B06") === "insolvency") return p;

  p.push("F01", "F02");
  const f02 = valueOf(state, "F02");
  if (f02 === "obtained" || f02 === "requested" || f02 === "noevidence") {
    p.push("F02A");
  }
  p.push("F03", "F04");

  if (m.propertySecurity || m.purchase) {
    p.push("S01");
    const s01 = valueOf(state, "S01");
    if (s01 === "mainlyowner" || s01 === "investment") p.push("S01A");
    p.push("S02", "S03", "S04");
  }

  if (m.acquisition) p.push("A01", "A02", "A03", "A04", "A05");
  if (m.development) p.push("D01", "D02", "D03", "D04", "D05", "D06");
  if (m.equipment) p.push("E01", "E02", "E03");
  if (m.workingcap) p.push("WC01", "WC02", "WC03");
  if (m.invoice) p.push("IF01", "IF02", "IF03");

  p.push("N01", "N02", "N03", "L01", "L02", "L03", "L04", "L05", "L06");
  return p;
}

/**
 * Which document-intake step is in progress, if any.
 *
 *  offer     — the broker holds documents but has attached none yet
 *  attached  — documents attached, analysis not started
 *  analysing — the simulated analysis is running
 *  review    — extracted values awaiting the broker
 */
export type UploadStage = "offer" | "attached" | "analysing" | "review" | null;

const WANTS_DOCUMENTS = new Set(["most", "some"]);
const AUTHORISED = new Set(["recorded", "pending"]);

export function uploadStage(state: CommercialState): UploadStage {
  const intake = valueOf(state, "I01");
  if (!intake || !WANTS_DOCUMENTS.has(intake)) return null;

  // Documents are not read before authority to collect them is recorded.
  const authority = valueOf(state, "C03");
  if (!authority || !AUTHORISED.has(authority)) return null;

  if (state.analysis) return state.extractionReviewed ? null : "review";
  if (state.analysing) return "analysing";
  return state.attachments.length > 0 ? "attached" : "offer";
}

/**
 * One row of the extraction review — a value read from a document, presented
 * for the broker to confirm or correct.
 *
 * GUARDRAIL: `confirmed` is only ever true because the broker said so. Nothing
 * read from a document confirms itself, and where an extraction disagreed with a
 * value already on the application, `prior` carries what was kept.
 */
export interface ExtractionRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly statusLabel: string;
  readonly tone: Tone;
  readonly citation: string;
  readonly confirmed: boolean;
  readonly prior: string | null;
  readonly note: string | null;
  readonly editedFrom: string | null;
}

const CONFIRMED_STATUSES = new Set(["broker_confirmed", "broker_edited"]);

const labelForExtraction = (key: string): string =>
  FIELD_META[key]?.label ?? UNMAPPED_LABELS[key] ?? key;

const displayExtraction = (key: string, value: string | number): string => {
  if (typeof value !== "number") return value;
  return FIELD_META[key]?.format === "money" ? money(value) : String(value);
};

const citationFor = (key: string): string => {
  const source = SOURCE_MAP[key];
  if (!source) return "Source not recorded";
  const document = findPackDocument(source.source);
  const name = document?.displayName ?? source.source;
  return `${name} — page ${source.page}, ${source.section}`;
};

export function extractionRows(
  state: CommercialState,
): readonly ExtractionRow[] {
  return Object.entries(state.extracted).map(([key, entry]) => {
    const review = REVIEW_STATE[entry.status];
    return {
      key,
      label: labelForExtraction(key),
      value: displayExtraction(key, entry.value),
      statusLabel: review.label,
      tone: review.tone,
      citation: citationFor(key),
      confirmed: CONFIRMED_STATUSES.has(entry.status),
      prior:
        entry.priorValue == null
          ? null
          : displayExtraction(key, entry.priorValue),
      note: FIELD_NOTES[key] ?? null,
      editedFrom:
        entry.editedFrom == null
          ? null
          : displayExtraction(key, entry.editedFrom),
    };
  });
}

/** The question awaiting an answer, or null when the plan is complete. */
export function currentQuestionId(state: CommercialState): string | null {
  if (state.halted) return null;
  if (uploadStage(state)) return null;
  if (state.cursor) return state.cursor;
  return plan(state).find((qid) => !state.answers[qid]) ?? null;
}

export function stageOf(state: CommercialState): string {
  const stage = uploadStage(state);
  if (stage) {
    return stage === "review" ? "Extraction review" : "Supporting documents";
  }
  if (state.finalised) return "Lender application setup";

  const qid = currentQuestionId(state);
  if (!qid) return "Final application review";
  return QUESTIONS[qid].stage;
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/** Fields held as numbers, so arithmetic never runs on a formatted string. */
const MONEY_KEYS = new Set([
  "purchasePrice",
  "loanAmount",
  "contribution",
  "cashAvailable",
  "acqCosts",
  "wcTarget",
  "rev1",
  "rev2",
  "ytd",
  "ebitdaReported",
  "existingDebt",
  "depositAmount",
  "tenantRent",
  "adjAmount",
  "taxBalance",
  "ytdEbitda",
  "addBackProposed",
  "sixMonthCashFlow",
  "currentCash",
  "cashAtBank",
  "existingDebtBalance",
  "taxableIncomePrior",
]);

/** Field values carry no provenance themselves; `sourceOfField` supplies it. */
export type DerivedFields = Record<string, FieldValue>;

const toNumber = (value: FieldValue): number =>
  Number(String(value).replace(/[^0-9.\-]/g, "")) || 0;

/**
 * Every field on the canvas, resolved in precedence order:
 * existing client record, then answers, then extracted values, then the
 * broker's own canvas edits — which win, because they are the most deliberate.
 */
export function deriveFields(state: CommercialState): DerivedFields {
  const f: DerivedFields = {};

  const client = state.clientId ? findClient(state.clientId) : null;
  if (client) {
    f.legalName = client.legalName;
    f.tradingName = client.tradingName;
    f.abn = client.abn;
    f.industry = client.industry;
    f.directors = client.directors;
    f.contacts = `${client.contactName} (${client.contactRole})`;
  }

  const active = plan(state);

  for (const qid of active) {
    const answer = state.answers[qid];
    if (!answer) continue;

    for (const option of QUESTIONS[qid].options) {
      if (!answer.values.includes(option.v)) continue;
      if (option.f) Object.assign(f, option.f);
    }

    for (const [key, value] of Object.entries(answer.fields)) {
      if (value !== "" && value != null) f[key] = value;
    }
    if (answer.other) f[`${qid}Other`] = answer.other;
  }

  // Multi-select answers also surface as label collections, because the canvas
  // shows what the broker chose rather than the option codes.
  const labelsFor = (qid: string): readonly string[] | undefined =>
    state.answers[qid]?.labels;

  const collections: Record<string, string> = {
    purposes: "P01",
    security: "P04",
    conditions: "T03",
    changes: "B04",
    evidenceAvailable: "F01",
    tradeoffs: "N02",
    refiReasons: "P01A",
    acqComponents: "A02",
    discussionMode: "L05",
  };
  for (const [field, qid] of Object.entries(collections)) {
    const labels = labelsFor(qid);
    if (labels) f[field] = [...labels];
  }

  const priorities = state.answers.N01;
  if (priorities) {
    f.priorities = priorities.values.map(
      (_, index) => `${index + 1}. ${priorities.labels[index]}`,
    );
  }

  // Guarantors follow from the directors once guarantees are offered as security.
  if (f.directors && valuesOf(state, "P04").includes("guarantees")) {
    f.guarantors = f.directors;
  }

  /*
   * Extracted values fill fields the broker has not already recorded
   * differently. A value the broker has confirmed or edited always wins over
   * whatever an answer set, because it is the more deliberate record.
   */
  for (const [key, record] of Object.entries(state.extracted)) {
    const meta = FIELD_META[key];
    if (!meta) continue;

    const current = f[meta.appKey];
    const brokerDecided =
      record.status === "broker_confirmed" || record.status === "broker_edited";

    if (current == null || current === "" || brokerDecided) {
      f[meta.appKey] = record.value;
    }
  }

  Object.assign(f, state.fieldEdits);

  for (const key of MONEY_KEYS) {
    if (f[key] != null && f[key] !== "") f[key] = toNumber(f[key]);
  }

  return f;
}

const EXISTING_RECORD_FIELDS = new Set([
  "legalName",
  "tradingName",
  "abn",
  "industry",
  "directors",
  "contacts",
]);

/** Where a field's value came from. Every rendered value needs one. */
export function sourceOfField(
  state: CommercialState,
  key: string,
):
  | "Read from the supporting documents"
  | "Broker-provided during guided setup"
  | "Existing client record" {
  const extractedKey = Object.keys(state.extracted).find(
    (k) => FIELD_META[k]?.appKey === key,
  );
  // A broker edit on the canvas is the broker's own input, whatever filled it first.
  if (extractedKey && !(key in state.fieldEdits)) {
    return "Read from the supporting documents";
  }
  if (state.clientId && EXISTING_RECORD_FIELDS.has(key)) {
    return "Existing client record";
  }
  return "Broker-provided during guided setup";
}

// ---------------------------------------------------------------------------
// Indicative calculations
// ---------------------------------------------------------------------------

/**
 * Every calculation carries the formula that produced it. A figure without its
 * formula is not renderable — see `docs/DESIGN.md` §2.
 */
export interface Calculations {
  readonly lvr: number | null;
  readonly lvrFormula: string | null;
  readonly totalFunds: number;
  readonly totalFundsFormula: string;
  /** Surplus or shortfall against the funds required. Negative is a shortfall. */
  readonly position: number;
  readonly positionFormula: string;
  readonly workingCapital: number;
  readonly workingCapitalFormula: string;
  readonly reportedEbitda: number;
  readonly acceptedAdjustments: number;
  readonly proposedAdjustments: number;
  readonly normalisedEbitda: number;
  readonly dscr: number | null;
  readonly dscrFormula: string | null;
}

const num = (fields: DerivedFields, key: string): number => {
  const value = fields[key];
  return typeof value === "number" ? value : 0;
};

export function calcs(
  state: CommercialState,
  fields: DerivedFields = deriveFields(state),
): Calculations {
  const price = num(fields, "purchasePrice");
  const loan = num(fields, "loanAmount");
  const contribution = num(fields, "contribution");
  const costs = num(fields, "acqCosts");
  const cash = num(fields, "cashAvailable");
  const existingDebt = num(fields, "existingDebt");

  // Only accepted adjustments reach the normalised figure: a proposed add-back
  // with no evidence must not raise the earnings the assessment relies on.
  const accepted = state.adjustments
    .filter((a) => a.accepted)
    .reduce((total, a) => total + a.amount, 0);
  const proposed = state.adjustments.reduce((total, a) => total + a.amount, 0);

  const reportedEbitda = num(fields, "ebitdaReported");
  const normalisedEbitda = reportedEbitda + accepted;

  const recommended = state.recommendation
    ? findProduct(state.recommendation.productId)
    : null;
  const lastRun = state.calcRuns.at(-1);
  const annual = recommended
    ? recommended.sim.annual
    : (lastRun?.rows[0]?.annual ?? 0);

  return {
    lvr: price && loan ? (loan / price) * 100 : null,
    lvrFormula:
      price && loan
        ? `Requested loan ÷ purchase price = ${money(loan)} ÷ ${money(price)}`
        : null,
    totalFunds: price + costs,
    totalFundsFormula: `Purchase price + estimated acquisition and settlement costs = ${money(price)} + ${money(costs)}`,
    position: loan + contribution - (price + costs),
    positionFormula:
      "(Requested loan + client contribution) − total funds required",
    workingCapital: cash - contribution - costs,
    workingCapitalFormula: `Total cash available − contribution − acquisition costs = ${money(cash)} − ${money(contribution)} − ${money(costs)}`,
    reportedEbitda,
    acceptedAdjustments: accepted,
    proposedAdjustments: proposed,
    normalisedEbitda,
    dscr: annual ? (normalisedEbitda - existingDebt) / annual : null,
    dscrFormula: annual
      ? `(Normalised EBITDA − existing annual debt commitments) ÷ indicative annual repayment = (${money(normalisedEbitda)} − ${money(existingDebt)}) ÷ ${money(annual)}`
      : null,
  };
}

// ---------------------------------------------------------------------------
// Document register
// ---------------------------------------------------------------------------

export interface RegisterRow {
  readonly id: string;
  readonly name: string;
  readonly why: string;
  readonly party: string;
  readonly period: string;
  readonly section: string;
  readonly status: DocStatus;
  readonly review: ReviewStatus;
  readonly requested: string;
  readonly obtained: string;
  readonly note: string;
  /** Questions that made this document required. */
  readonly origins: readonly string[];
  readonly broker: boolean;
}

/** Outstanding items first, so the register opens on what is still needed. */
const STATUS_ORDER: Record<DocStatus, number> = {
  "Requires clarification": 0,
  Required: 1,
  Requested: 2,
  Obtained: 3,
  "Not applicable": 4,
};

const reviewDefault = (status: DocStatus): ReviewStatus =>
  status === "Requires clarification"
    ? "Further information required"
    : "Not reviewed";

export function docRegister(state: CommercialState): readonly RegisterRow[] {
  const required = new Map<
    string,
    { origins: string[]; status: DocStatus | null }
  >();

  const addDoc = (id: string, qid: string, hint?: DocStatus) => {
    if (!findFlowDocument(id)) return;
    const entry = required.get(id) ?? { origins: [], status: null };
    entry.origins.push(qid);
    if (hint) entry.status = hint;
    required.set(id, entry);
  };

  for (const qid of plan(state)) {
    const answer = state.answers[qid];
    if (!answer) continue;

    const question = QUESTIONS[qid];
    for (const id of question.docs ?? []) addDoc(id, qid);

    for (const option of question.options) {
      if (!answer.values.includes(option.v)) continue;
      for (const id of option.docs ?? []) {
        addDoc(id, qid, option.docStatus?.[id]);
      }
    }
  }

  // A business-purpose declaration review becomes an action once the purpose is
  // classified, and consent evidence once authority is recorded.
  if (state.answers.P02) addDoc("doc-bpd", "P02");
  if (state.answers.C03) addDoc("doc-consent", "C03");

  /*
   * The trust deed always appears, marked not applicable unless the borrower is
   * a trust. Showing it as absent rather than omitting it makes clear the
   * question was considered.
   */
  const isTrust = valueOf(state, "C02") === "trust";
  const deed = required.get("doc-trustdeed");
  if (!deed) {
    required.set("doc-trustdeed", {
      origins: ["C02"],
      status: isTrust ? null : "Not applicable",
    });
  } else if (!isTrust) {
    deed.status = "Not applicable";
  }

  // Anything the analysis or the broker has already touched stays visible, even
  // before a question makes it mandatory.
  for (const id of Object.keys(state.docState)) {
    if (findFlowDocument(id) && !required.has(id)) {
      required.set(id, { origins: ["Document analysis"], status: null });
    }
  }

  const rows: RegisterRow[] = [];

  for (const [id, entry] of required) {
    const doc = findFlowDocument(id)!;
    const overrides = state.docState[id] ?? {};
    const status = overrides.status ?? entry.status ?? "Required";

    rows.push({
      id,
      name: doc.name,
      why: doc.why,
      party: doc.party,
      period: doc.period,
      section: doc.section,
      status,
      review: overrides.review ?? reviewDefault(status),
      requested:
        overrides.requested ??
        (status === "Requested" || status === "Obtained"
          ? "Recorded at setup"
          : "—"),
      obtained:
        overrides.obtained ??
        (status === "Obtained" ? "Recorded at setup" : "—"),
      note: overrides.note ?? "",
      origins: entry.origins,
      broker: false,
    });
  }

  for (const extra of state.extraDocs) {
    const overrides = state.docState[extra.id] ?? {};
    rows.push({
      ...extra,
      status: overrides.status ?? extra.status,
      review: overrides.review ?? extra.review,
      requested: overrides.requested ?? "—",
      obtained: overrides.obtained ?? "—",
      note: overrides.note ?? extra.note,
      origins: ["Broker-created"],
      broker: true,
    });
  }

  return rows.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name),
  );
}

export interface DocSummary {
  readonly total: number;
  readonly obtained: number;
  readonly outstanding: number;
  readonly clarification: number;
}

const OUTSTANDING: readonly DocStatus[] = [
  "Required",
  "Requested",
  "Requires clarification",
];

export function docSummary(state: CommercialState): DocSummary {
  const rows = docRegister(state);
  return {
    total: rows.length,
    obtained: rows.filter((r) => r.status === "Obtained").length,
    outstanding: rows.filter((r) => OUTSTANDING.includes(r.status)).length,
    clarification: rows.filter((r) => r.status === "Requires clarification")
      .length,
  };
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export interface ActiveFinding extends FlowFinding {
  /** Question or process that raised it. */
  readonly origin: string;
  readonly resolved: boolean;
  readonly resolutionNote: string;
}

/** Threshold above which a requested LVR needs policy confirmation. */
const LVR_POLICY_THRESHOLD = 70;

/**
 * Findings currently on the file, most restrictive first.
 *
 * A finding raised by an answer that is no longer in the plan disappears, and an
 * option that clears a finding withdraws it. A resolved finding is downgraded
 * to `COND` rather than removed, so the record shows it was addressed.
 */
export function activeFindings(
  state: CommercialState,
): readonly ActiveFinding[] {
  const created = new Map<string, string>();
  const cleared = new Set<string>();
  const active = plan(state);

  for (const qid of active) {
    const answer = state.answers[qid];
    if (!answer) continue;

    const question = QUESTIONS[qid];
    for (const id of question.find ?? []) created.set(id, qid);

    for (const option of question.options) {
      if (!answer.values.includes(option.v)) continue;
      for (const id of option.find ?? []) created.set(id, qid);
      for (const id of option.clears ?? []) cleared.add(id);
    }
  }

  // Free text against a material question is something the system cannot
  // classify, so it is referred to the broker rather than interpreted.
  for (const [qid, answer] of Object.entries(state.answers)) {
    if (
      answer.other &&
      MATERIAL_QUESTIONS.includes(qid) &&
      active.includes(qid)
    ) {
      created.set("fnd-other-material", qid);
    }
  }

  const fields = deriveFields(state);
  const c = calcs(state, fields);

  const target = num(fields, "wcTarget");
  if (target && c.workingCapital < target) created.set("fnd-wc-gap", "T01");
  if (c.lvr != null && c.lvr > LVR_POLICY_THRESHOLD) {
    created.set("fnd-lvr-policy", "T01");
  }
  if (state.choice?.needsReconfirmation) {
    created.set("fnd-choice-reconfirm", "L06");
  }

  // Extraction outcomes that need a person rather than the system.
  for (const [key, record] of Object.entries(state.extracted)) {
    if (record.status === "conflicting") {
      created.set("fnd-extract-conflict", "analysis");
    }
    if (record.status === "normalisation_evidence_required") {
      created.set("fnd-adj-requested", "analysis");
    }
    if (record.status === "heads_of_agreement_missing") {
      created.set("fnd-occupancy-thirdparty", "analysis");
    }
    if (
      record.status === "requires_review" &&
      key === "thirdPartyOccupancyPercent"
    ) {
      created.set("fnd-occupancy-thirdparty", "analysis");
    }
  }

  if (state.analysis) {
    const unconfirmed = Object.values(state.extracted).filter(
      (e) => e.status !== "broker_confirmed" && e.status !== "broker_edited",
    );
    if (unconfirmed.length) created.set("fnd-extract-unconfirmed", "analysis");
    // The pack has known gaps by design; the register must say so.
    created.set("fnd-doc-gaps", "analysis");
  }

  return [...created.entries()]
    .filter(([id]) => !cleared.has(id) && findFlowFinding(id))
    .map(([id, origin]) => {
      const base = findFlowFinding(id)!;
      const note = state.resolvedFindings[id];
      return {
        ...base,
        origin,
        resolved: !!note,
        resolutionNote: note ?? "",
        effect: note ? "COND" : base.effect,
      };
    })
    .sort(
      (a, b) => EFFECT_ORDER.indexOf(a.effect) - EFFECT_ORDER.indexOf(b.effect),
    );
}

// ---------------------------------------------------------------------------
// Checks and gate
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly met: boolean;
}

const checkContext = (state: CommercialState): CheckContext => ({
  fields: deriveFields(state),
  docs: docRegister(state),
  comparisonOpened: state.comparisonOpened,
  recommendation: state.recommendation,
  analysis: state.analysis,
  extracted: state.extracted,
  confirmations: state.confirmations,
});

export function gateItems(state: CommercialState): readonly ChecklistItem[] {
  const context = checkContext(state);
  return GATE.map((g) => ({ id: g.id, label: g.label, met: g.need(context) }));
}

export function checkItems(state: CommercialState): readonly ChecklistItem[] {
  const context = checkContext(state);
  return CHECKS.map((c) => ({
    id: c.id,
    label: c.label,
    met: c.need(context),
  }));
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

export interface Progression {
  readonly key: ProgressionKey | "GATHERING";
  readonly label: string;
  readonly tone: Tone;
  /** The effect driving the state, or `OK` when nothing restricts it. */
  readonly level: Effect | "OK";
  readonly gateOk: boolean;
  readonly gate: readonly ChecklistItem[];
  /** True when a full comparison may be prepared. */
  readonly canCompare: boolean;
  /** True when products may be explored without preparing a comparison. */
  readonly canExplore: boolean;
  /** Headlines of the findings driving the state. */
  readonly reasons: readonly string[];
  /** Gate items still outstanding. */
  readonly outstanding: readonly string[];
}

/**
 * Whether a comparison may proceed, and why not when it may not.
 *
 * GUARDRAIL: this gates the comparison only. It is never a statement about the
 * application's merits, and "blocked" always means information is missing.
 */
export function progression(state: CommercialState): Progression {
  const findings = activeFindings(state);
  const gate = gateItems(state);
  const gateOk = gate.every((g) => g.met);

  // The most restrictive effect on the file wins. INFO findings are recorded
  // but never restrict progression.
  let worst: Effect | null = null;
  for (const finding of findings) {
    if (finding.effect === "INFO") continue;
    if (
      worst == null ||
      EFFECT_ORDER.indexOf(finding.effect) < EFFECT_ORDER.indexOf(worst)
    ) {
      worst = finding.effect;
    }
  }

  const level: Effect | "OK" = worst ?? "OK";

  /*
   * Nothing restricts the file but the gate is incomplete: that is still
   * gathering information, not a comparison that is available. Saying
   * "available" here would overstate what is known.
   */
  const base =
    level === "OK" && !gateOk
      ? {
          key: "GATHERING" as const,
          label: "Comparison not yet available",
          tone: "muted" as Tone,
        }
      : PROGRESSION[level];

  return {
    key: base.key,
    label: base.label,
    tone: base.tone,
    level,
    gateOk,
    gate,
    canCompare: level !== "BLOCK" && level !== "PAUSE" && gateOk,
    canExplore: level !== "BLOCK" && gateOk,
    reasons: findings.filter((f) => f.effect === worst).map((f) => f.headline),
    outstanding: gate.filter((g) => !g.met).map((g) => g.label),
  };
}

// ---------------------------------------------------------------------------
// Finalisation
// ---------------------------------------------------------------------------

export interface FinalisationReadiness {
  readonly ready: boolean;
  readonly outstanding: readonly string[];
}

/**
 * Whether the application may be finalised. Requires every broker confirmation,
 * a confirmed recommendation, a recorded client choice and a comparison that is
 * not blocked or paused.
 */
export function canFinalise(state: CommercialState): FinalisationReadiness {
  const outstanding: string[] = [];

  const checks = checkItems(state);
  for (const check of checks) {
    if (!check.met) outstanding.push(check.label);
  }

  if (!state.recommendation?.confirmed) {
    outstanding.push("Recommendation rationale confirmed by the broker");
  }
  if (state.recommendation?.needsReconfirmation) {
    outstanding.push(
      "Recommendation reconfirmed against the current information",
    );
  }
  if (!state.choice) {
    outstanding.push("Client choice recorded");
  }
  if (state.choice?.needsReconfirmation) {
    outstanding.push(
      "Client choice reconfirmed against the current information",
    );
  }

  const prog = progression(state);
  if (!prog.canCompare) outstanding.push(prog.label);

  return {
    ready: outstanding.length === 0,
    outstanding: [...new Set(outstanding)],
  };
}

export { DOC_STATUS };

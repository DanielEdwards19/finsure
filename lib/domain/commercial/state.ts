/**
 * Commercial loan application — state shape.
 *
 * One state object drives both the chat and the canvas, so the two cannot
 * contradict each other. The rule that makes that work: this object holds only
 * what the broker has actually recorded. Every fact shown on screen — fields,
 * document register, findings, progression, comparison availability — is
 * derived from it by `derive.ts`, never stored alongside it. Changing an earlier
 * answer therefore cannot leave a stale fact behind.
 *
 * The state is treated as immutable. `reducer.ts` returns new objects.
 */

import type { ValueSource } from "../types";
import type { CalculatorInputs, CalculatorRun } from "./products";
import type { DocStatus, ReviewStatus } from "./flow";
import type { ExtractionReviewStatus } from "./document-pack";

export const SOURCE_DOCUMENTS: ValueSource =
  "Read from the supporting documents";

/** A value the broker typed, rather than selected. */
export type FieldInput = string | number;

/** One recorded answer to a guided question. */
export interface Answer {
  readonly questionId: string;
  /** Selected option values, in selection order. Ranking questions rely on it. */
  readonly values: readonly string[];
  /** Labels for the selected values, positionally aligned with `values`. */
  readonly labels: readonly string[];
  /** Free text accompanying an "other" selection. */
  readonly other: string;
  readonly fields: Readonly<Record<string, FieldInput>>;
  readonly at: string;
  readonly by: string;
  readonly source: ValueSource;
  /** True when read from a document rather than answered by the broker. */
  readonly fromDocuments: boolean;
}

/** Broker-maintained state for one document in the register. */
export interface DocState {
  readonly status?: DocStatus;
  readonly review?: ReviewStatus;
  readonly requested?: string;
  readonly obtained?: string;
  readonly note?: string;
}

/** A document requirement the broker created themselves. */
export interface ExtraDocument {
  readonly id: string;
  readonly name: string;
  readonly why: string;
  readonly party: string;
  readonly period: string;
  readonly section: string;
  readonly status: DocStatus;
  readonly review: ReviewStatus;
  readonly note: string;
}

/**
 * A proposed EBITDA normalisation adjustment. `accepted` reflects whether
 * evidence is held, and only accepted adjustments reach the normalised figure.
 */
export interface Adjustment {
  readonly id: string;
  readonly label: string;
  readonly amount: number;
  readonly period: string;
  readonly reason: string;
  readonly recurring: string;
  readonly evidence: string;
  readonly accepted: boolean;
}

/** An extracted value and where the broker has taken it. */
export interface ExtractedState {
  readonly status: ExtractionReviewStatus;
  readonly value: string | number;
  readonly at: string;
  /** What was already recorded, when the extraction disagreed with it. */
  readonly priorValue?: FieldInput | null;
  readonly confirmedAt?: string;
  /** Original extracted value, when the broker has changed it. */
  readonly editedFrom?: string | number;
}

/** A citation for an answer read from a document. */
export interface DocumentCitation {
  readonly docId: string;
  readonly page: number;
  readonly section: string;
  readonly basis: string;
  readonly confidence: string;
  /** Set once the broker has confirmed the answer as their own. */
  readonly status?: "confirmed";
  /**
   * Set when the supporting document was removed after the broker had already
   * confirmed the answer. The answer stands; the evidence for it does not.
   */
  readonly evidenceWithdrawn?: boolean;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  readonly role: ChatRole;
  readonly text: string;
  readonly kind?: "effect" | "analysis" | "opening";
  readonly qid?: string;
}

/**
 * One entry in the audit history. `docsAdded` and `findingsAdded` are computed
 * by comparing the derived state before and after, so the history records what
 * an answer actually changed rather than what its rule declared.
 */
export interface AuditEntry {
  readonly id: string;
  readonly at: string;
  readonly by: string;
  readonly questionId: string;
  readonly question: string;
  readonly from: string | null;
  readonly to: string;
  readonly changed: boolean;
  readonly fields: readonly string[];
  readonly docsAdded: readonly string[];
  readonly docsRemoved: readonly string[];
  readonly findingsAdded: readonly string[];
  readonly findingsResolved: readonly string[];
  readonly progression: string;
  readonly source: string;
}

export interface Recommendation {
  readonly productId: string;
  readonly rationale: string;
  readonly confirmed: boolean;
  readonly at: string;
  /**
   * Set when a material fact changed after the recommendation was confirmed.
   * The recommendation is not withdrawn — it is marked as needing to be
   * reconfirmed against the information now on file.
   */
  readonly needsReconfirmation?: boolean;
}

/** The client's recorded decision. Never inferred. */
export interface ClientChoice {
  readonly productId: string;
  readonly recordedAt: string;
  readonly discussedVia: string;
  readonly note: string;
  readonly needsReconfirmation?: boolean;
}

export interface AnalysisRecord {
  readonly at: string;
  readonly docIds: readonly string[];
}

/** A record of the broker opening a source document at a given page. */
export interface SourceOpen {
  readonly key: string;
  readonly docId: string;
  readonly page: number;
  readonly at: string;
}

/** A product the broker excluded, with the reason recorded. */
export interface Exclusion {
  readonly productId: string;
  readonly reason: string;
  readonly at: string;
}

/** A lender or product the broker added outside the panel. */
export interface ManualOption {
  readonly id: string;
  readonly lender: string;
  readonly product: string;
  readonly note: string;
}

export interface CommercialState {
  readonly id: string;
  readonly name: string;
  readonly brokerId: string;
  readonly broker: string;
  readonly branch: string;
  readonly clientId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  /** Question id to the answer recorded for it. */
  readonly answers: Readonly<Record<string, Answer>>;
  /** Direct edits the broker made on the canvas, which win over derived values. */
  readonly fieldEdits: Readonly<Record<string, FieldInput>>;
  readonly docState: Readonly<Record<string, DocState>>;
  readonly extraDocs: readonly ExtraDocument[];
  /** Finding id to the broker's resolution note. */
  readonly resolvedFindings: Readonly<Record<string, string>>;
  /** A question the broker asked to revisit, overriding the natural order. */
  readonly cursor: string | null;

  readonly audit: readonly AuditEntry[];
  readonly chat: readonly ChatMessage[];
  readonly notes: readonly string[];
  readonly adjustments: readonly Adjustment[];

  readonly comparisonOpened: boolean;
  /** Documents attached to the composer, before analysis runs. */
  readonly attachments: readonly string[];
  /** True while the simulated analysis is running. */
  readonly analysing: boolean;
  readonly analysis: AnalysisRecord | null;
  /** Set once the broker has finished working through the extracted values. */
  readonly extractionReviewed: boolean;
  /** Source-map key to its extraction state. */
  readonly extracted: Readonly<Record<string, ExtractedState>>;
  /** Question id to the citation supporting an answer read from a document. */
  readonly docAnswers: Readonly<Record<string, DocumentCitation>>;
  readonly sourceOpens: readonly SourceOpen[];
  readonly calcRuns: readonly CalculatorRun[];
  readonly excluded: Readonly<Record<string, Exclusion>>;
  readonly manualOptions: readonly ManualOption[];
  readonly recommendation: Recommendation | null;
  /** Superseded recommendations, retained so the history stays complete. */
  readonly superseded: readonly Recommendation[];
  readonly discussion: string | null;
  readonly choice: ClientChoice | null;
  /** Confirmation id to the instant the broker gave it. */
  readonly confirmations: Readonly<Record<string, string>>;
  readonly finalised: string | null;
  readonly lenderStage: number;
  readonly lenderConfirmed: Readonly<Record<string, boolean>>;
  /** Set when an answer stops the flow, with the reason. */
  readonly halted: string | null;
  readonly scenario: string;
  /** Calculator inputs currently applied to the comparison. */
  readonly calcInputs: CalculatorInputs | null;
}

export const BROKER = {
  id: "BROKER-RN-001",
  userId: "USER-BR-001",
  name: "Rachael Nguyen",
  role: "Mortgage Broker",
  branchId: "BR-BRIS-SOUTH",
  branch: "Finsure · Brisbane South",
} as const;

export interface CommercialClient {
  readonly id: string;
  readonly legalName: string;
  readonly tradingName: string;
  readonly abn: string;
  readonly industry: string;
  readonly contactName: string;
  readonly contactRole: string;
  readonly directors: string;
  readonly meta: string;
}

export const CLIENT_BOOK: readonly CommercialClient[] = [
  {
    id: "CLI-HARB-001",
    legalName: "Harbourview Allied Health Pty Ltd",
    tradingName: "Harbourview Physio & Sports Clinic",
    abn: "51 234 567 890",
    industry: "Allied health services",
    contactName: "Emma Collins",
    contactRole: "Director",
    directors: "Emma Collins, David Collins",
    meta: "West End QLD · Allied health · 7 years trading",
  },
  {
    id: "CLI-MERI-002",
    legalName: "Meridian Freight Services Pty Ltd",
    tradingName: "Meridian Freight",
    abn: "62 345 678 901",
    industry: "Transport and logistics",
    contactName: "Sam Whitfield",
    contactRole: "Director",
    directors: "Sam Whitfield",
    meta: "Rocklea QLD · Transport · 11 years trading",
  },
  {
    id: "CLI-KURI-003",
    legalName: "Kurilpa Dental Group Pty Ltd",
    tradingName: "Kurilpa Dental",
    abn: "73 456 789 012",
    industry: "Dental services",
    contactName: "Priya Nair",
    contactRole: "Director",
    directors: "Priya Nair, Anand Nair",
    meta: "South Brisbane QLD · Dental · 4 years trading",
  },
  {
    id: "CLI-STON-004",
    legalName: "Stonegate Property Holdings Pty Ltd",
    tradingName: "Stonegate",
    abn: "84 567 890 123",
    industry: "Property investment",
    contactName: "Marcus Deane",
    contactRole: "Director",
    directors: "Marcus Deane",
    meta: "Woolloongabba QLD · Property · 9 years trading",
  },
];

export const findClient = (id: string): CommercialClient | null =>
  CLIENT_BOOK.find((c) => c.id === id) ?? null;

export const OPENING =
  "I can help you set up a commercial loan application. If you have the client’s documents, start by uploading them — I will identify the client and the entity from what they contain, populate the application on the canvas, and then only ask you about what is missing or needs your judgement. Nothing here is a credit decision or a compliance conclusion — the assessment and the recommendation stay yours.";

/**
 * A new application. The clock is injected so a created application is
 * reproducible and renders identically on server and client.
 */
export function createApplication(now: string): CommercialState {
  return {
    id: "COM-DEMO-0001",
    name: "Commercial loan application",
    brokerId: BROKER.id,
    broker: BROKER.name,
    branch: BROKER.branch,
    clientId: null,
    createdAt: now,
    updatedAt: now,
    answers: {},
    fieldEdits: {},
    docState: {},
    extraDocs: [],
    resolvedFindings: {},
    cursor: null,
    audit: [],
    chat: [],
    notes: [],
    adjustments: [],
    comparisonOpened: false,
    attachments: [],
    analysing: false,
    analysis: null,
    extractionReviewed: false,
    extracted: {},
    docAnswers: {},
    sourceOpens: [],
    calcRuns: [],
    excluded: {},
    manualOptions: [],
    recommendation: null,
    superseded: [],
    discussion: null,
    choice: null,
    confirmations: {},
    finalised: null,
    lenderStage: 0,
    lenderConfirmed: {},
    halted: null,
    scenario: "A",
    calcInputs: null,
  };
}

/** Next sequential audit id, so ids are reproducible rather than time-based. */
export const nextAuditId = (state: CommercialState): string =>
  `AUD-${String(state.audit.length + 1).padStart(3, "0")}`;

// ---------------------------------------------------------------------------
// Answer readers
// ---------------------------------------------------------------------------

export const answerFor = (state: CommercialState, qid: string): Answer | null =>
  state.answers[qid] ?? null;

/** First selected value, for single-select questions. */
export const valueOf = (state: CommercialState, qid: string): string | null =>
  state.answers[qid]?.values[0] ?? null;

export const valuesOf = (
  state: CommercialState,
  qid: string,
): readonly string[] => state.answers[qid]?.values ?? [];

export const hasValue = (
  state: CommercialState,
  qid: string,
  value: string,
): boolean => valuesOf(state, qid).includes(value);

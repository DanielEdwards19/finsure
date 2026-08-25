/**
 * Domain vocabulary for the Finsure broker workspace.
 *
 * Two rules from `docs/DESIGN.md` are enforced here by the type system rather
 * than by convention:
 *
 *   §3 — relationships resolve through identifiers, never display names. Each
 *        identifier family is branded, so a broker id cannot be passed where a
 *        branch id is expected.
 *   §2 — every value shown on screen carries its provenance, and lender results
 *        use a closed vocabulary. See `Sourced` and `LenderResult`.
 */

declare const __brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [__brand]: B };

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Branch identifier, e.g. `BR-BRIS-SOUTH`. */
export type BranchId = Branded<string, "BranchId">;
/** Broker identifier, e.g. `BROKER-RN-001`. */
export type BrokerId = Branded<string, "BrokerId">;
/** Client identifier, e.g. `CLI-SARA-0001`. */
export type ClientId = Branded<string, "ClientId">;
/** Application identifier, e.g. `APP-0001`. */
export type ApplicationId = Branded<string, "ApplicationId">;
/** Client file reference quoted in correspondence, e.g. `FIN-DEMO-0001`. */
export type FileReference = Branded<string, "FileReference">;
/** Email thread identifier, e.g. `t001`. */
export type ThreadId = Branded<string, "ThreadId">;
/** Identity of a signed-in user, e.g. `USER-ORG-001`. */
export type UserId = Branded<string, "UserId">;

const PREFIX = {
  BranchId: "BR-",
  BrokerId: "BROKER-",
  ClientId: "CLI-",
  ApplicationId: "APP-",
  FileReference: "FIN-DEMO-",
  UserId: "USER-",
} as const;

function assertPrefix(
  value: string,
  family: keyof typeof PREFIX,
): asserts value is string {
  if (!value.startsWith(PREFIX[family])) {
    throw new Error(
      `Malformed ${family}: expected the "${PREFIX[family]}" prefix, received "${value}".`,
    );
  }
}

/*
 * The generated record sets are the only place raw strings enter the domain, so
 * these constructors are the single validation boundary. They throw rather than
 * coerce: a malformed identifier means the generator drifted, and silently
 * accepting it would break every relationship downstream.
 */
export const branchId = (v: string): BranchId => {
  assertPrefix(v, "BranchId");
  return v as BranchId;
};
export const brokerId = (v: string): BrokerId => {
  assertPrefix(v, "BrokerId");
  return v as BrokerId;
};
export const clientId = (v: string): ClientId => {
  assertPrefix(v, "ClientId");
  return v as ClientId;
};
export const applicationId = (v: string): ApplicationId => {
  assertPrefix(v, "ApplicationId");
  return v as ApplicationId;
};
export const fileReference = (v: string): FileReference => {
  assertPrefix(v, "FileReference");
  return v as FileReference;
};
export const userId = (v: string): UserId => {
  assertPrefix(v, "UserId");
  return v as UserId;
};
export const threadId = (v: string): ThreadId => v as ThreadId;

// ---------------------------------------------------------------------------
// Provenance — docs/DESIGN.md §2
// ---------------------------------------------------------------------------

/** The four permitted provenances. No value reaches the screen without one. */
export const VALUE_SOURCES = [
  "Read from the supporting documents",
  "Broker-provided during guided setup",
  "Existing client record",
  "System calculation — indicative",
] as const;

export type ValueSource = (typeof VALUE_SOURCES)[number];

/**
 * A value together with where it came from. Rendering helpers accept `Sourced`
 * rather than bare numbers so an unsourced figure is a compile error.
 */
export interface Sourced<T> {
  readonly value: T;
  readonly source: ValueSource;
  /** True for figures that must carry an indicative-simulation label. */
  readonly simulated?: boolean;
}

export const sourced = <T>(
  value: T,
  source: ValueSource,
  simulated = false,
): Sourced<T> => ({ value, source, simulated });

/**
 * The only permitted lender result language. Superlatives such as "best",
 * "cheapest" or "recommended" are prohibited — see `docs/DESIGN.md` §2.
 */
export const LENDER_RESULTS = [
  "Proposed option",
  "Suitable alternative for consideration",
  "Policy confirmation required",
  "Insufficient information to assess",
  "Not presently preferred",
] as const;

export type LenderResult = (typeof LENDER_RESULTS)[number];

// ---------------------------------------------------------------------------
// Assessment states
// ---------------------------------------------------------------------------

/**
 * Traffic-light severity for a single record or a rolled-up group. Never a
 * compliance determination — only an indication that review may be required.
 */
export type Severity = "attention" | "watch" | "ok";

/** Field states from `docs/DESIGN.md` §5.4, in tone order. */
export const FIELD_STATES = {
  "Broker confirmed": "good",
  "Ready for broker confirmation": "good",
  "Requires review": "warn",
  "Needs reconfirmation": "warn",
  "Information required": "bad",
} as const satisfies Record<string, "good" | "warn" | "bad">;

export type FieldState = keyof typeof FIELD_STATES;

/** Document states from `docs/DESIGN.md` §5.4. */
export const DOCUMENT_STATES = [
  "Obtained",
  "Outstanding",
  "Requires clarification",
  "Not applicable",
] as const;

export type DocumentState = (typeof DOCUMENT_STATES)[number];

/**
 * Progression effects, most restrictive first — `docs/DESIGN.md` §5.1. The
 * most restrictive active effect wins; under `BLOCK` no product may be shown.
 */
export const EFFECT_ORDER = ["BLOCK", "PAUSE", "COND", "INFO"] as const;

export type ProgressionEffect = (typeof EFFECT_ORDER)[number];

// ---------------------------------------------------------------------------
// Compliance review vocabulary
// ---------------------------------------------------------------------------

/**
 * The three permitted assessment states. Note what is absent: there is no
 * "compliant" or "non-compliant" state, because the product may never make
 * that determination — see `docs/DESIGN.md` §2.
 */
export const ASSESSMENT_STATES = [
  "EVIDENCE_FOUND",
  "POTENTIAL_GAP",
  "REQUIRES_REVIEW",
] as const;

export type AssessmentState = (typeof ASSESSMENT_STATES)[number];

export const ASSESSMENT_STATE_LABEL: Record<AssessmentState, string> = {
  EVIDENCE_FOUND: "Evidence found",
  POTENTIAL_GAP: "Potential gap",
  REQUIRES_REVIEW: "Requires review",
};

/** Finding severities, least severe first. */
export const FINDING_SEVERITY_ORDER = [
  "INFORMATIONAL",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type FindingSeverity = (typeof FINDING_SEVERITY_ORDER)[number];

export const FINDING_SEVERITY_LABEL: Record<FindingSeverity, string> = {
  INFORMATIONAL: "Informational",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
};

/** Where a human reviewer has taken a finding. Never set automatically. */
export const REVIEWER_STATES = [
  "UNREVIEWED",
  "CONFIRMED",
  "DISMISSED",
  "FURTHER_INFO",
] as const;

export type ReviewerState = (typeof REVIEWER_STATES)[number];

export const REVIEWER_STATE_LABEL: Record<ReviewerState, string> = {
  UNREVIEWED: "Unreviewed",
  CONFIRMED: "Confirmed",
  DISMISSED: "Dismissed",
  FURTHER_INFO: "Further information required",
};

/** Compare two severities for sorting, most severe first. */
export const bySeverityDescending = (
  a: FindingSeverity,
  b: FindingSeverity,
): number =>
  FINDING_SEVERITY_ORDER.indexOf(b) - FINDING_SEVERITY_ORDER.indexOf(a);

// ---------------------------------------------------------------------------
// Access control — docs/DESIGN.md §4
// ---------------------------------------------------------------------------

export type AccessLevel = "organisation" | "branch_owner" | "broker";

export type MapLayer = "lenders" | "branches" | "brokers" | "clients";

export interface Identity {
  readonly id: UserId;
  readonly name: string;
  readonly role: string;
  readonly shortRole: string;
  readonly accessLevel: AccessLevel;
  readonly location: string;
  readonly branchId: BranchId | null;
  readonly brokerId: BrokerId | null;
  readonly initials: string;
  readonly scopeLabel: string;
}

// ---------------------------------------------------------------------------
// Network entities
// ---------------------------------------------------------------------------

export interface LatLng {
  readonly lat: number;
  readonly lon: number;
}

export interface Branch {
  readonly id: BranchId;
  /** URL-safe segment, e.g. `brisbane-south`. Display and routing only. */
  readonly slug: string;
  readonly name: string;
  readonly state: string;
  readonly address: string;
  readonly position: LatLng;
  readonly coverage: string;
  readonly brokerCount: number;
}

export interface Broker {
  readonly id: BrokerId;
  /** URL-safe segment, e.g. `b041`. Display and routing only. */
  readonly slug: string;
  readonly name: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly officeAddress: string;
  readonly position: LatLng;
}

export interface Application {
  readonly id: ApplicationId;
  /** URL-safe segment, e.g. `a001`. Display and routing only. */
  readonly slug: string;
  readonly clientId: ClientId;
  readonly customer: string;
  readonly brokerId: BrokerId;
  readonly brokerName: string;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly residentialAddress: string;
  readonly position: LatLng;
  readonly type: string;
  readonly amount: number;
  readonly lender: string;
  readonly stage: string;
  readonly status: string;
  /**
   * File reference quoted in correspondence. Present only for the applications
   * that have an email thread on file, which is the join key used by the
   * compliance and document layers.
   */
  readonly fileReference: FileReference | null;
}

// ---------------------------------------------------------------------------
// Correspondence
// ---------------------------------------------------------------------------

export interface Message {
  readonly from: string;
  readonly fromEmail: string;
  readonly to: string;
  readonly cc: string;
  /** Display date as written, e.g. `11 May 2026, 9:14 AM AEST`. */
  readonly date: string;
  readonly subject: string;
  readonly body: string;
  readonly attachments: readonly string[];
  readonly iso: string;
  /** Abbreviated date, e.g. `11 May`. */
  readonly short: string;
  readonly isBroker: boolean;
}

export interface Thread {
  readonly id: ThreadId;
  readonly reference: FileReference;
  readonly applicationId: ApplicationId;
  readonly customer: string;
  readonly clients: string;
  readonly broker: string;
  readonly branch: string;
  /** One-line description of the application, as quoted in correspondence. */
  readonly application: string;
  /** Chronological. Never empty. */
  readonly messages: readonly Message[];
  readonly subject: string;
  readonly participants: readonly string[];
}

/**
 * The most recent message in a thread. The archive stores a duplicate copy of
 * this alongside the message list; deriving it keeps one source of truth.
 */
export const lastMessageOf = (thread: Thread): Message =>
  thread.messages[thread.messages.length - 1];

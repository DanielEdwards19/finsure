/**
 * Harbourview prototype document pack — manifest, static previews and the
 * extraction result.
 *
 * Nothing is parsed at runtime. The values come from the supplied source map and
 * the files are served as static assets: there is no upload backend, OCR,
 * storage, transfer or lender integration.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - An extracted value is never treated as confirmed. Every one carries a
 *    review status and stays linked to the document and page it came from.
 *  - A document the pack does not contain produces an entry in
 *    `INTENTIONAL_GAPS`, never a negative finding. Absence of a file is not
 *    proof of absence of the fact.
 */

import type { Tone } from "@/lib/design/tokens";

export const PACK_DIR =
  "/uploads/Harbourview_COM-DEMO-0001_Prototype_Document_Pack/";

export const PROTOTYPE_LABEL =
  "Fictional prototype document — not a real client record";

export interface PackCategory {
  readonly id: string;
  readonly title: string;
}

export const CATEGORIES: readonly PackCategory[] = [
  { id: "entity", title: "Entity and identity" },
  { id: "financial", title: "Financial information" },
  { id: "transaction", title: "Transaction and property" },
  { id: "occupancy", title: "Occupancy and tenancy" },
];

export type PackFileKind = "pdf" | "docx";

export interface PackDocument {
  readonly documentId: string;
  /** Position in the pack, as numbered on the files. */
  readonly n: number;
  readonly filename: string;
  readonly path: string;
  /** Filename with its numbering and prototype suffix removed. */
  readonly displayName: string;
  readonly title: string;
  readonly kind: PackFileKind;
  readonly mime: string;
  readonly typeLabel: string;
  readonly size: number;
  readonly sizeLabel: string;
  readonly pages: number;
  readonly category: string;
  readonly period: string;
  /** Source-map keys this document supplies. */
  readonly extracted: readonly string[];
}

const MIME: Record<PackFileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const TYPE_LABEL: Record<PackFileKind, string> = {
  pdf: "PDF document",
  docx: "Word document (.docx)",
};

const D = (
  id: string,
  n: number,
  filename: string,
  title: string,
  kind: PackFileKind,
  size: number,
  category: string,
  period: string,
  extracted: readonly string[],
): PackDocument => ({
  documentId: id,
  n,
  filename,
  path: PACK_DIR + filename,
  displayName: filename
    .replace(/^\d+_/, "")
    .replace(/_PROTOTYPE\.(pdf|docx)$/, "")
    .replace(/_/g, " "),
  title,
  kind,
  mime: MIME[kind],
  typeLabel: TYPE_LABEL[kind],
  size,
  sizeLabel: `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`,
  pages: 1,
  category,
  period,
  extracted,
});

export const DOC_PACK: readonly PackDocument[] = [
  D(
    "DOC-001",
    1,
    "01_ASIC_Current_Company_Extract_PROTOTYPE.pdf",
    "Current Company Extract",
    "pdf",
    2963,
    "entity",
    "Current as at 5 August 2026",
    ["legalEntityName", "abn", "entityType", "directors", "tradingName"],
  ),
  // `normalisationAddBack` added: the source map reads it from this document's
  // Note 1, but the manifest did not declare it, so the value appeared in the
  // register sourced to a document that did not claim to contain it.
  D(
    "DOC-002",
    2,
    "02_FY2025_FY2026_Company_Financial_Statements_PROTOTYPE.pdf",
    "Company Financial Statements",
    "pdf",
    3380,
    "financial",
    "FY2025 and FY2026",
    [
      "fy2025Revenue",
      "fy2026Revenue",
      "normalisedEbitda",
      "normalisationAddBack",
      "cashAtBank",
      "equipmentFinance",
    ],
  ),
  D(
    "DOC-003",
    3,
    "03_FY2025_Company_Tax_Return_PROTOTYPE.pdf",
    "Company Tax Return Summary",
    "pdf",
    2715,
    "financial",
    "FY2025",
    ["fy2025TaxableIncome", "fy2025TaxStatus"],
  ),
  D(
    "DOC-004",
    4,
    "04_YTD_Management_Accounts_31_July_2026_PROTOTYPE.pdf",
    "Year-to-date Management Accounts",
    "pdf",
    2715,
    "financial",
    "To 31 July 2026",
    ["ytdRevenue", "ytdEbitda", "currentCash"],
  ),
  D(
    "DOC-005",
    5,
    "05_Six_Month_Business_Bank_Statements_PROTOTYPE.pdf",
    "Business Bank Statement Pack",
    "pdf",
    3392,
    "financial",
    "Six months to 31 July 2026",
    ["operatingAccount", "sixMonthCashFlow", "currentCash"],
  ),
  D(
    "DOC-006",
    6,
    "06_Current_Business_Debt_Schedule_PROTOTYPE.docx",
    "Current Business Debt Schedule",
    "docx",
    38627,
    "financial",
    "As at 31 July 2026",
    ["existingDebtBalance", "existingAnnualDebtCommitments"],
  ),
  D(
    "DOC-007",
    7,
    "07_Contract_of_Sale_18_Riverstone_Road_PROTOTYPE.pdf",
    "Contract of Sale Extract",
    "pdf",
    2893,
    "transaction",
    "Executed 24 July 2026",
    ["purchasePrice", "propertyAddress", "settlementDate", "financeDate"],
  ),
  D(
    "DOC-008",
    8,
    "08_Deposit_Receipt_PROTOTYPE.pdf",
    "Deposit Receipt",
    "pdf",
    2627,
    "transaction",
    "Paid 24 July 2026",
    ["depositAmount", "depositDate"],
  ),
  D(
    "DOC-009",
    9,
    "09_Directors_Personal_Assets_and_Liabilities_PROTOTYPE.docx",
    "Personal Assets and Liabilities",
    "docx",
    38706,
    "entity",
    "Declared 2 August 2026",
    ["directorAssets", "directorLiabilities"],
  ),
  D(
    "DOC-010",
    10,
    "10_Director_Identification_Register_PROTOTYPE.pdf",
    "Director Identification Register",
    "pdf",
    2754,
    "entity",
    "Current as at 5 August 2026",
    ["identityEvidence"],
  ),
  D(
    "DOC-011",
    11,
    "11_Draft_Property_Occupancy_Plan_PROTOTYPE.pdf",
    "Draft Property Occupancy Plan",
    "pdf",
    2783,
    "occupancy",
    "Draft dated 1 August 2026",
    ["ownerOccupancyPercent", "thirdPartyOccupancyPercent", "proposedTenant"],
  ),
];
export const findPackDocument = (id: string): PackDocument | null =>
  DOC_PACK.find((d) => d.documentId === id) ?? null;

export const TOTAL_DOCS = DOC_PACK.length;

export interface DocxPreview {
  readonly heading: string;
  readonly sub: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly note: string;
}

/**
 * Static previews for the .docx files. A browser cannot render .docx natively,
 * so the content is transcribed; the filename and file-type label are kept so it
 * is clear which file is being shown.
 */
export const DOCX_PREVIEW: Readonly<Record<string, DocxPreview>> = {
  "DOC-006": {
    heading: "Current Business Debt Schedule",
    sub: "Harbourview Allied Health Pty Ltd | As at 31 July 2026",
    columns: [
      "Facility",
      "Balance",
      "Monthly",
      "Annual commitment",
      "Remaining term",
      "Security / note",
    ],
    rows: [
      [
        "Toyota Finance \u2014 equipment",
        "$148,000",
        "$4,000",
        "$48,000",
        "36 months",
        "Equipment charge",
      ],
      [
        "Business credit card",
        "$9,800",
        "Variable",
        "Excluded from committed annual debt",
        "Revolving",
        "$25,000 limit",
      ],
    ],
    note: "Prototype note: values require broker review and confirmation before use in any indicative assessment.",
  },
  "DOC-009": {
    heading: "Personal Assets and Liabilities",
    sub: "Emma Collins and David Collins | Declared 2 August 2026",
    columns: [
      "Director",
      "Asset",
      "Asset value",
      "Liability",
      "Balance",
      "Ownership / note",
    ],
    rows: [
      [
        "Emma Collins",
        "Home \u2014 West End",
        "$1,420,000",
        "Home loan",
        "$510,000",
        "Joint",
      ],
      [
        "Emma Collins",
        "Cash and investments",
        "$285,000",
        "Credit card",
        "$4,500",
        "Personal",
      ],
      [
        "David Collins",
        "Home \u2014 West End",
        "$1,420,000",
        "Home loan",
        "$510,000",
        "Joint",
      ],
      [
        "David Collins",
        "Cash and investments",
        "$248,000",
        "Motor vehicle loan",
        "$22,000",
        "Personal",
      ],
      [
        "Joint",
        "Superannuation",
        "$612,000",
        "Other liabilities",
        "$0",
        "Declared",
      ],
    ],
    note: "Prototype note: values require broker review and confirmation before use in any indicative assessment.",
  },
};

/**
 * Confidence the extraction attaches to a value. Never presented as certainty:
 * even `high` requires broker confirmation before the value is relied upon.
 */
export type ExtractionConfidence = "high" | "medium" | "low";

/**
 * Where an extracted value stands. The first five are extraction outcomes; the
 * last four are set by the broker or by a later conflict.
 */
export type ExtractionReviewStatus =
  | "needs_broker_confirmation"
  | "confirmed_by_two_documents"
  | "normalisation_evidence_required"
  | "requires_review"
  | "heads_of_agreement_missing"
  | "broker_confirmed"
  | "broker_edited"
  | "conflicting"
  | "outdated"
  | "missing";

export interface ExtractedValue {
  readonly value: string | number;
  /** Document the value was read from. */
  readonly source: string;
  readonly page: number;
  /** Heading within the document, so the value can be located. */
  readonly section: string;
  readonly confidence: ExtractionConfidence;
  /** Other documents agreeing with this value. */
  readonly crossCheckSources?: readonly string[];
  readonly reviewStatus: ExtractionReviewStatus;
}

/** The supplied source map, verbatim. Keyed by extraction field name. */
export const SOURCE_MAP: Readonly<Record<string, ExtractedValue>> = {
  legalEntityName: {
    value: "Harbourview Allied Health Pty Ltd",
    source: "DOC-001",
    page: 1,
    section: "Company details",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  abn: {
    value: "51 234 567 890",
    source: "DOC-001",
    page: 1,
    section: "Company details",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  fy2026Revenue: {
    value: 2420000,
    source: "DOC-002",
    page: 1,
    section: "Statement of profit or loss",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  normalisedEbitda: {
    value: 438000,
    source: "DOC-002",
    page: 1,
    section: "Statement of profit or loss",
    confidence: "medium",
    reviewStatus: "normalisation_evidence_required",
  },
  existingAnnualDebtCommitments: {
    value: 48000,
    source: "DOC-006",
    page: 1,
    section: "Debt schedule",
    confidence: "high",
    crossCheckSources: ["DOC-002", "DOC-005"],
    reviewStatus: "needs_broker_confirmation",
  },
  purchasePrice: {
    value: 1850000,
    source: "DOC-007",
    page: 1,
    section: "Key contract terms",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  propertyAddress: {
    value: "18 Riverstone Road, West End QLD 4101",
    source: "DOC-007",
    page: 1,
    section: "Key contract terms",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  settlementDate: {
    value: "2026-11-30",
    source: "DOC-007",
    page: 1,
    section: "Key contract terms",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  depositAmount: {
    value: 185000,
    source: "DOC-008",
    page: 1,
    section: "Deposit transaction",
    confidence: "high",
    reviewStatus: "confirmed_by_two_documents",
    crossCheckSources: ["DOC-007"],
  },
  thirdPartyOccupancyPercent: {
    value: 20,
    source: "DOC-011",
    page: 1,
    section: "Proposed occupancy",
    confidence: "medium",
    reviewStatus: "requires_review",
  },
  proposedTenant: {
    value: "River City Radiology Pty Ltd",
    source: "DOC-011",
    page: 1,
    section: "Proposed occupancy",
    confidence: "medium",
    reviewStatus: "heads_of_agreement_missing",
  },
  // Fields each document declares in the manifest and states on its face. Values
  // are read from the bundled prototype files, not inferred.
  tradingName: {
    value: "Harbourview Physio & Sports Clinic",
    source: "DOC-001",
    page: 1,
    section: "Company details",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  directors: {
    value: "Emma Collins, David Collins",
    source: "DOC-001",
    page: 1,
    section: "Officeholders",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  fy2025Revenue: {
    value: 2180000,
    source: "DOC-002",
    page: 1,
    section: "Statement of profit or loss",
    confidence: "high",
    crossCheckSources: ["DOC-003"],
    reviewStatus: "confirmed_by_two_documents",
  },
  normalisationAddBack: {
    value: 24000,
    source: "DOC-002",
    page: 1,
    section: "Note 1 — Normalisation",
    confidence: "medium",
    reviewStatus: "normalisation_evidence_required",
  },
  cashAtBank: {
    value: 342000,
    source: "DOC-002",
    page: 1,
    section: "Statement of financial position",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  fy2025TaxableIncome: {
    value: 311000,
    source: "DOC-003",
    page: 1,
    section: "Company tax return summary",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  ytdRevenue: {
    value: 214000,
    source: "DOC-004",
    page: 1,
    section: "Management performance",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  ytdEbitda: {
    value: 40000,
    source: "DOC-004",
    page: 1,
    section: "Management performance",
    confidence: "medium",
    reviewStatus: "requires_review",
  },
  operatingAccount: {
    value: "Primary operating account ending 4821",
    source: "DOC-005",
    page: 1,
    section: "Account summary",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  sixMonthCashFlow: {
    value: 109600,
    source: "DOC-005",
    page: 1,
    section: "Account summary",
    confidence: "high",
    reviewStatus: "needs_broker_confirmation",
  },
  currentCash: {
    value: 348000,
    source: "DOC-005",
    page: 1,
    section: "Account summary",
    confidence: "high",
    crossCheckSources: ["DOC-004"],
    reviewStatus: "confirmed_by_two_documents",
  },
  existingDebtBalance: {
    value: 148000,
    source: "DOC-006",
    page: 1,
    section: "Debt schedule",
    confidence: "high",
    crossCheckSources: ["DOC-002"],
    reviewStatus: "confirmed_by_two_documents",
  },
  identityEvidence: {
    value:
      "Driver licence held for Emma Collins; passport held for David Collins",
    source: "DOC-010",
    page: 1,
    section: "Identity evidence register",
    confidence: "medium",
    reviewStatus: "requires_review",
  },
};
export const SUPPRESSION_RULE =
  "Suppress a questionnaire question only when its field is current, consistent and broker-confirmed. Extracted values remain reviewable and source-linked.";

/**
 * How an extracted value is rendered. The prototype carried a `display`
 * function on each entry, which cannot be serialised across the server/client
 * boundary; a discriminant can, and it keeps the formatting rules in one place.
 */
export type FieldFormat = "text" | "money" | "date" | "percent";

export interface FieldMeta {
  /** Where the value lands in the application state. */
  readonly appKey: string;
  readonly label: string;
  readonly section: string;
  /** Canvas group the field is shown under. */
  readonly builder: string;
  /** Guided question this value removes the need to re-ask. */
  readonly qid: string;
  readonly format: FieldFormat;
}

const M = (
  appKey: string,
  label: string,
  section: string,
  builder: string,
  qid: string,
  format: FieldFormat = "text",
): FieldMeta => ({ appKey, label, section, builder, qid, format });

const ENTITY_DETAILS = "Applicant and borrowing entity details";
const ENTITY_PEOPLE = "Directors, shareholders and guarantors";
const PERFORMANCE = "Historical and current financial performance";
const COMMITMENTS = "Existing debts and commitments";
const ASSETS = "Assets and liabilities";
const PURCHASE = "Purchase, deposit and contribution details";
const OCCUPANCY = "Proposed tenancy and occupancy information";

/**
 * Where each extracted field lands in the application, and which guided question
 * it removes the need to re-enter.
 */
export const FIELD_META: Readonly<Record<string, FieldMeta>> = {
  legalEntityName: M(
    "legalName",
    "Legal name",
    "entities",
    ENTITY_DETAILS,
    "C01",
  ),
  abn: M("abn", "ABN", "entities", ENTITY_DETAILS, "C01"),
  tradingName: M(
    "tradingName",
    "Trading name",
    "entities",
    ENTITY_DETAILS,
    "C01",
  ),
  directors: M(
    "directors",
    "Directors and beneficial owners",
    "entities",
    ENTITY_PEOPLE,
    "C01",
  ),
  identityEvidence: M(
    "identityEvidence",
    "Identity evidence held",
    "entities",
    ENTITY_PEOPLE,
    "C01",
  ),

  fy2026Revenue: M(
    "rev1",
    "Revenue — most recent completed year",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  fy2025Revenue: M(
    "rev2",
    "Revenue — prior year",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  fy2025TaxableIncome: M(
    "taxableIncomePrior",
    "Taxable income — prior year",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  normalisedEbitda: M(
    "ebitdaReported",
    "Reported EBITDA",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  normalisationAddBack: M(
    "addBackProposed",
    "Normalisation add-back proposed",
    "financials",
    PERFORMANCE,
    "F02",
    "money",
  ),
  ytdRevenue: M(
    "ytd",
    "Current year-to-date revenue",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  ytdEbitda: M(
    "ytdEbitda",
    "Year-to-date EBITDA",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  operatingAccount: M(
    "operatingAccount",
    "Primary operating account",
    "financials",
    PERFORMANCE,
    "F01",
  ),
  sixMonthCashFlow: M(
    "sixMonthCashFlow",
    "Net operating cash movement — six months",
    "financials",
    PERFORMANCE,
    "F01",
    "money",
  ),
  currentCash: M(
    "currentCash",
    "Cash at bank — most recent statement",
    "financials",
    ASSETS,
    "F01",
    "money",
  ),
  cashAtBank: M(
    "cashAtBank",
    "Cash at bank — last balance date",
    "financials",
    ASSETS,
    "F01",
    "money",
  ),
  existingDebtBalance: M(
    "existingDebtBalance",
    "Existing debt balance",
    "financials",
    COMMITMENTS,
    "F01",
    "money",
  ),
  existingAnnualDebtCommitments: M(
    "existingDebt",
    "Existing annual business debt commitments",
    "financials",
    COMMITMENTS,
    "F01",
    "money",
  ),

  purchasePrice: M(
    "purchasePrice",
    "Purchase price or project cost",
    "request",
    PURCHASE,
    "T01",
    "money",
  ),
  depositAmount: M(
    "depositAmount",
    "Deposit amount and date",
    "request",
    PURCHASE,
    "T02",
    "money",
  ),
  settlementDate: M(
    "settlementDate",
    "Required settlement date",
    "request",
    "Loan purpose and requested facilities",
    "T01",
    "date",
  ),

  propertyAddress: M(
    "propertyAddress",
    "Property address",
    "security",
    "Property and security details",
    "S01",
  ),
  thirdPartyOccupancyPercent: M(
    "tenantArea",
    "Proposed tenant area (% of net lettable area)",
    "security",
    OCCUPANCY,
    "S01A",
    "percent",
  ),
  proposedTenant: M(
    "tenantName",
    "Proposed third-party tenant",
    "security",
    OCCUPANCY,
    "S01A",
  ),
};

export interface DocumentAnswer {
  readonly qid: string;
  /** Option values the document establishes. */
  readonly values: readonly string[];
  readonly docId: string;
  readonly page: number;
  readonly section: string;
  readonly confidence: ExtractionConfidence;
  /** The words in the document supporting the answer. Always shown with it. */
  readonly basis: string;
  /** Additional fields the same passage establishes. */
  readonly fields?: Readonly<Record<string, string>>;
}

/**
 * Questions the documents answer on their face, each with the citation and the
 * basis shown beside the resulting value.
 *
 * Nothing requiring judgement, classification or a regulatory conclusion appears
 * here — those stay as questions for the broker.
 */
export const DOC_ANSWERS: readonly DocumentAnswer[] = [
  {
    qid: "C02",
    values: ["company"],
    docId: "DOC-001",
    page: 1,
    section: "Company details",
    confidence: "high",
    basis:
      "The company extract records the entity type as an Australian proprietary company.",
  },
  {
    qid: "P01",
    values: ["purchase"],
    docId: "DOC-007",
    page: 1,
    section: "Key contract terms",
    confidence: "high",
    basis:
      "The contract of sale is for the purchase of a commercial property, with the use noted as an owner-occupied allied health clinic.",
  },
  {
    qid: "T01",
    values: ["signed"],
    docId: "DOC-007",
    page: 1,
    section: "Key contract terms",
    confidence: "high",
    basis:
      "The contract is dated 28 July 2026 and records a settlement date and a finance condition.",
  },
  {
    qid: "B01",
    values: ["gt5"],
    docId: "DOC-001",
    page: 1,
    section: "Officeholders",
    confidence: "high",
    basis:
      "Both directors were appointed on 15 August 2019, more than five years before the extract date.",
    fields: { industry: "Allied health services" },
  },
  {
    qid: "F01",
    values: ["financials", "mgmt", "bank", "debtsched"],
    docId: "DOC-005",
    page: 1,
    section: "Account summary",
    confidence: "high",
    basis:
      "The pack contains financial statements, year-to-date management accounts, six months of bank statements and a debt schedule. The FY2026 tax return is not in the pack, so tax returns are not recorded as held.",
  },
  {
    qid: "F02",
    values: ["requested"],
    docId: "DOC-002",
    page: 1,
    section: "Note 1 — Normalisation",
    confidence: "medium",
    basis:
      "Note 1 records a $24,000 add-back for one-off refurbishment and launch costs and states that broker or accountant confirmation is required.",
  },
  {
    qid: "S01",
    values: ["mainlyowner"],
    docId: "DOC-011",
    page: 1,
    section: "Proposed occupancy",
    confidence: "high",
    basis:
      "The occupancy plan shows 80% owner occupation and a 20% area proposed for a third-party tenant.",
  },
  {
    qid: "S01A",
    values: ["proposed"],
    docId: "DOC-011",
    page: 1,
    section: "Outstanding clarification",
    confidence: "high",
    basis:
      "The plan states that heads of agreement have been requested but are not available, and that no proposed rental income should be included in serviceability until verified.",
    fields: { tenantTerm: "5 years" },
  },
  {
    qid: "S02",
    values: ["contract"],
    docId: "DOC-007",
    page: 1,
    section: "Key contract terms",
    confidence: "high",
    basis:
      "The recorded value is the contract purchase price. The pack contains no valuation.",
  },
];

/** How the client record is identified from the documents. */
export const CLIENT_MATCH = {
  abnKey: "abn",
  nameKey: "legalEntityName",
  docId: "DOC-001",
  page: 1,
  section: "Company details",
  basisMatched:
    "The ABN and legal name on the company extract match an existing client record.",
  basisNew:
    "The ABN and legal name on the company extract do not match any existing client record, so a draft record has been created.",
} as const;

/**
 * Facts a document contains that the extraction does not assign a value to.
 * Listed by name so the register shows the fact was seen but not extracted,
 * rather than implying the document is silent on it.
 */
export const UNMAPPED_LABELS: Readonly<Record<string, string>> = {
  entityType: "Entity type",
  financeDate: "Finance approval date",
  depositDate: "Deposit date",
  directorAssets: "Director assets",
  directorLiabilities: "Director liabilities",
  fy2025TaxStatus: "FY2025 tax lodgement status",
  ownerOccupancyPercent: "Owner-occupied percentage",
  // Declared by DOC-002 but unmapped. Without an entry here the register
  // omitted it, which reads as the statements being silent on equipment finance.
  equipmentFinance: "Equipment finance liability",
};

export interface ReviewStateLabel {
  readonly label: string;
  readonly tone: Tone;
}

/**
 * How each review status reads on the field and its section. Note that no status
 * maps to a "verified" or "compliant" label — the strongest is broker confirmed.
 */
export const REVIEW_STATE: Readonly<
  Record<ExtractionReviewStatus, ReviewStateLabel>
> = {
  needs_broker_confirmation: {
    label: "Extracted \u2014 awaiting broker confirmation",
    tone: "warn",
  },
  confirmed_by_two_documents: {
    label: "Extracted \u2014 cross-checked, awaiting broker confirmation",
    tone: "warn",
  },
  normalisation_evidence_required: {
    label: "Requires broker or policy review",
    tone: "warn",
  },
  requires_review: { label: "Requires broker or policy review", tone: "warn" },
  heads_of_agreement_missing: {
    label: "Requires broker or policy review",
    tone: "warn",
  },
  broker_confirmed: { label: "Broker confirmed", tone: "good" },
  broker_edited: {
    label: "Broker confirmed \u2014 edited from the extracted value",
    tone: "good",
  },
  conflicting: { label: "Conflicting", tone: "bad" },
  outdated: { label: "Outdated or updated evidence required", tone: "bad" },
  missing: { label: "Missing", tone: "bad" },
};

/**
 * Notes attached to particular extraction outcomes, explaining what the figure
 * is and — where relevant — what it is not.
 */
export const FIELD_NOTES: Readonly<Record<string, string>> = {
  normalisedEbitda:
    "The statements describe this figure as normalised. The adjustments behind it are not evidenced in the pack, so it is held for broker review before it is used in the indicative assessment.",
  normalisationAddBack:
    "Note 1 to the statements records this add-back and states that broker or accountant confirmation is required. It is excluded from the primary indicative assessment until evidenced.",
  fy2025Revenue:
    "The FY2025 revenue in the statements agrees with the total business income in the FY2025 tax return.",
  ytdEbitda:
    "One month of the new financial year does not establish a full-year result. The annualised column in the source document is a prototype extrapolation and not a forecast.",
  sixMonthCashFlow:
    "Net movement across the six-month statement period: credits of $1,238,900 less debits of $1,129,300. This is the account movement, not an assessed serviceability figure.",
  currentCash:
    "The closing balance on the bank statement pack agrees with the cash at bank in the management accounts.",
  existingDebtBalance:
    "The debt schedule balance agrees with the equipment finance liability in the financial statements.",
  identityEvidence:
    "The identification register records that secondary address evidence is outstanding for David Collins.",
  existingAnnualDebtCommitments:
    "Cross-checked against the financial statements and the bank statement pack. The business credit card is excluded from the committed annual figure in the source document.",
  depositAmount: "Cross-checked against the contract of sale.",
  thirdPartyOccupancyPercent:
    "The occupancy plan is a draft. This changes the property-use profile and requires lender policy confirmation. It is not an adverse issue.",
  proposedTenant:
    "No lease or heads of agreement is in the pack, so the rental income stays excluded from serviceability.",
};

export interface IntentionalGap {
  readonly id: string;
  readonly label: string;
  /** The requirement in the document catalogue this gap maps to. */
  readonly docId: string;
  readonly why: string;
}

/**
 * Documents and facts the pack does not contain.
 *
 * GUARDRAIL: each of these produces "information required", never an adverse
 * finding. Absence of a file is not proof that the underlying fact is absent.
 */
export const INTENTIONAL_GAPS: readonly IntentionalGap[] = [
  {
    id: "gap-fy26tax",
    label: "FY2026 company tax return",
    docId: "doc-taxreturns",
    why: "The pack contains the FY2025 return only.",
  },
  {
    id: "gap-ato",
    label: "Latest ATO integrated client account statement",
    docId: "doc-ato",
    why: "The tax position cannot be confirmed from the documents provided.",
  },
  {
    id: "gap-val",
    label: "Formal property valuation",
    docId: "doc-val",
    why: "The contract price is a transaction figure, not a valuation.",
  },
  {
    id: "gap-contrib",
    label: "Evidence of the full client contribution",
    docId: "doc-contrib",
    why: "The deposit receipt evidences part of the contribution only.",
  },
  {
    id: "gap-lease",
    label: "Radiology lease or heads of agreement",
    docId: "doc-lease-radiology",
    why: "The pack contains a draft occupancy plan only, not a lease or heads of agreement.",
  },
  {
    id: "gap-consent",
    label: "Privacy and information-sharing consent evidence",
    docId: "doc-consent",
    why: "Authority was recorded in conversation; the consent evidence is not in the pack.",
  },
];

/** Facts no document can supply. These stay as questions for the broker. */
export const NOT_IN_DOCUMENTS: readonly string[] = [
  "The client\u2019s ranked priorities and preferred structure",
  "Purpose classification and the suitability of any business-purpose declaration",
  "Requested loan amount, contribution and retained working capital",
  "Repayment and interest structure preferences",
];

/** Progress steps shown while the simulated analysis runs. */
export const ANALYSIS_STEPS: readonly string[] = [
  "Preparing documents",
  "Reading documents",
  "Matching information to application sections",
  "Checking for gaps",
  "Ready for broker review",
];

export const ANALYSIS_NOTICE =
  "Hardcoded prototype analysis. The files are read from the bundled pack using the supplied source map. No upload, transfer, OCR, storage or lender integration takes place.";

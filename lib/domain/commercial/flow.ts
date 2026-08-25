/**
 * Commercial loan application — question matrix, document catalogue and finding
 * catalogue.
 *
 * This is the authoritative encoding of the "complete conversation decision
 * model": every controlled option carries its deterministic effects — canvas
 * fields, document requirements, findings, progression effect and route. The
 * data is transcribed from the prototype unchanged; the constructors below give
 * it types, so an option naming a document or finding that does not exist is a
 * compile error rather than a silently dropped requirement.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - Progression effects gate the comparison. They are not credit decisions:
 *    `BLOCK` means information is missing, never that an application fails.
 *  - Every field written by an option carries a `ValueSource`.
 */

import type { Tone } from "@/lib/design/tokens";
import { VALUE_SOURCES, type ValueSource } from "../types";

/**
 * Progression effects, most restrictive first. An option's effect is the most
 * restrictive of those it raises.
 *
 *  BLOCK — mandatory identity, authority or classification unresolved
 *  PAUSE — material fact needs broker review before a meaningful comparison
 *  COND  — comparison may proceed with visible assumptions and conditions
 *  INFO  — recorded for the file; no effect on progression
 */
export const EFFECT_ORDER = ["BLOCK", "PAUSE", "COND", "INFO"] as const;

export type Effect = (typeof EFFECT_ORDER)[number];

/** Progression states, including `OK` which no option raises directly. */
export type ProgressionKey = "BLOCKED" | "PAUSED" | "CONDITIONS" | "AVAILABLE";

export interface ProgressionState {
  readonly key: ProgressionKey;
  readonly label: string;
  readonly tone: Tone;
}

export const PROGRESSION: Readonly<Record<Effect | "OK", ProgressionState>> = {
  BLOCK: { key: "BLOCKED", label: "Comparison blocked", tone: "bad" },
  PAUSE: { key: "PAUSED", label: "Comparison paused", tone: "warn" },
  COND: { key: "CONDITIONS", label: "Available with conditions", tone: "warn" },
  INFO: { key: "AVAILABLE", label: "Comparison available", tone: "good" },
  OK: { key: "AVAILABLE", label: "Comparison available", tone: "good" },
};

/*
 * Provenance labels. These are the `ValueSource` members rather than free
 * strings, so a field cannot be written with an unrecognised source.
 */
export const SOURCE_BROKER: ValueSource = VALUE_SOURCES[1];
export const SOURCE_EXISTING: ValueSource = VALUE_SOURCES[2];
export const SOURCE_CALC: ValueSource = VALUE_SOURCES[3];

/** Canvas sections, in the order they appear. */
export interface Section {
  readonly id: string;
  readonly n: number;
  readonly title: string;
}

export const SECTIONS: readonly Section[] = [
  { id: "entities", n: 1, title: "Client and entities" },
  { id: "request", n: 2, title: "Finance request" },
  { id: "business", n: 3, title: "Business profile" },
  { id: "financials", n: 4, title: "Financial position and serviceability" },
  { id: "security", n: 5, title: "Security and property" },
  { id: "needs", n: 6, title: "Needs and objectives" },
  { id: "documents", n: 7, title: "Required documents and evidence" },
  { id: "findings", n: 8, title: "Risks, gaps and items requiring review" },
  { id: "comparison", n: 9, title: "Lender and product comparison" },
  {
    id: "recommendation",
    n: 10,
    title: "Proposed recommendation and rationale",
  },
  { id: "final", n: 11, title: "Final application review" },
];

export const DOC_STATUS = [
  "Required",
  "Requested",
  "Obtained",
  "Not applicable",
  "Requires clarification",
] as const;

export type DocStatus = (typeof DOC_STATUS)[number];

/** Broker review state for a document. Never set automatically. */
export const REVIEW_STATUS = [
  "Not reviewed",
  "Reviewed by broker",
  "Issue identified",
  "Further information required",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[number];

// ---------------------------------------------------------------- documents

export interface FlowDocument {
  readonly id: string;
  readonly name: string;
  /** Why the document is required. Shown to the client on request. */
  readonly why: string;
  /** Who is expected to provide it. */
  readonly party: string;
  readonly period: string;
  readonly section: string;
}

const D = (
  id: string,
  name: string,
  why: string,
  party: string,
  period: string,
  section: string,
): FlowDocument => ({ id, name, why, party, period, section });

export const DOCS: readonly FlowDocument[] = [
  D(
    "doc-financials",
    "Two years of company financial statements",
    "Establishes reported earnings used for indicative serviceability",
    "Client accountant",
    "FY2024 and FY2025",
    "financials",
  ),
  D(
    "doc-mgmt",
    "Current year-to-date management accounts",
    "Shows current trading against the last completed year",
    "Client accountant",
    "To 30 June 2026",
    "financials",
  ),
  D(
    "doc-taxreturns",
    "Two years of company tax returns",
    "Corroborates the financial statements provided",
    "Client accountant",
    "FY2024 and FY2025",
    "financials",
  ),
  D(
    "doc-ato",
    "Latest ATO integrated client account statement",
    "Confirms the lodgement and payment position recorded by the broker",
    "Client accountant",
    "Current",
    "financials",
  ),
  D(
    "doc-bank",
    "Six months of primary business bank statements",
    "Supports reported turnover and operating cash flow",
    "Client",
    "Last 6 months",
    "financials",
  ),
  D(
    "doc-debtsched",
    "Current business debt schedule",
    "Identifies existing commitments used in the indicative DSCR",
    "Client",
    "Current",
    "financials",
  ),
  D(
    "doc-contract",
    "Contract of sale",
    "Confirms purchase price, parties, conditions and critical dates",
    "Client solicitor",
    "Executed copy",
    "security",
  ),
  D(
    "doc-deposit",
    "Evidence of deposit paid",
    "Confirms the deposit amount and how it was funded",
    "Client",
    "At date paid",
    "request",
  ),
  D(
    "doc-contrib",
    "Evidence of source of client contribution",
    "Confirms the contribution is available and its source",
    "Client",
    "Current",
    "request",
  ),
  D(
    "doc-val",
    "Property valuation",
    "Lender-instructed valuation required to confirm value and LVR",
    "Lender panel valuer",
    "On instruction",
    "security",
  ),
  D(
    "doc-dirpal",
    "Directors\u2019 personal assets and liabilities statements",
    "Relevant to the proposed directors\u2019 guarantees",
    "Directors",
    "Current",
    "entities",
  ),
  D(
    "doc-id",
    "Identification for directors and guarantors",
    "Required to verify the identity of borrowers and guarantors",
    "Directors",
    "Current",
    "entities",
  ),
  D(
    "doc-trustdeed",
    "Trust deed and any amendments",
    "Confirms trustee powers, appointor and beneficiaries",
    "Client solicitor",
    "Executed copy",
    "entities",
  ),
  D(
    "doc-lease-radiology",
    "Proposed radiology lease or heads of agreement",
    "Clarifies the proposed third-party occupancy, area and rent",
    "Client",
    "Before submission",
    "security",
  ),
  D(
    "doc-consent",
    "Privacy and information-sharing consent",
    "Records the client\u2019s consent to collect, use and share information",
    "Client",
    "At setup",
    "entities",
  ),
  D(
    "doc-bpd",
    "Business-purpose declaration review",
    "Broker review of whether a declaration is relevant and how it is obtained",
    "Broker",
    "Before submission",
    "request",
  ),
  // conditional
  D(
    "doc-companyextract",
    "Company extract and current company details",
    "Confirms the borrowing entity, directors and shareholders",
    "Broker search",
    "Current",
    "entities",
  ),
  D(
    "doc-trusteeextract",
    "Corporate trustee extract and director details",
    "Confirms the trustee entity and its officers",
    "Broker search",
    "Current",
    "entities",
  ),
  D(
    "doc-trusteeid",
    "Identification for each individual trustee",
    "Confirms the identity of each trustee",
    "Trustees",
    "Current",
    "entities",
  ),
  D(
    "doc-partnership",
    "Partnership agreement and partner identities",
    "Confirms partners, ownership shares and authority",
    "Client solicitor",
    "Executed copy",
    "entities",
  ),
  D(
    "doc-soletrader",
    "Individual identity, ABN record and personal assets and liabilities",
    "The borrower is the individual for a sole trader",
    "Client",
    "Current",
    "entities",
  ),
  D(
    "doc-smsf",
    "SMSF deed, trustee records and investment strategy",
    "Required to understand a proposed limited-recourse structure",
    "Client adviser",
    "Current",
    "entities",
  ),
  D(
    "doc-structure",
    "Structure description and responsible entity records",
    "The proposed structure is outside the standard options",
    "Broker",
    "Current",
    "entities",
  ),
  D(
    "doc-authority",
    "Authority document for the person acting",
    "Confirms the person\u2019s capacity to act for the borrower",
    "Client",
    "Current",
    "entities",
  ),
  D(
    "doc-adviserauth",
    "Client authority to deal with the adviser",
    "Confirms the adviser may act and receive information",
    "Client",
    "Current",
    "entities",
  ),
  D(
    "doc-poa",
    "Power of attorney or agency authority and identity",
    "Confirms the attorney\u2019s or agent\u2019s authority",
    "Client solicitor",
    "Current",
    "entities",
  ),
  D(
    "doc-facilitystmts",
    "Current facility statements and payout figure",
    "Confirms the debt being refinanced and its cost",
    "Client / existing financier",
    "Current",
    "request",
  ),
  D(
    "doc-refibenefit",
    "Refinance benefit statement and current-facility comparison",
    "Records why the refinance is being proposed",
    "Broker",
    "Before comparison",
    "needs",
  ),
  D(
    "doc-saleagreement",
    "Business sale agreement",
    "Confirms what is being acquired and on what terms",
    "Client solicitor",
    "Executed copy",
    "request",
  ),
  D(
    "doc-dd",
    "Due diligence report or findings",
    "Records the diligence performed on the target business",
    "Client adviser",
    "Before settlement",
    "findings",
  ),
  D(
    "doc-targetfin",
    "Historical financials for the target business",
    "Establishes the earnings being acquired",
    "Vendor accountant",
    "Last 2 years",
    "financials",
  ),
  D(
    "doc-forecast",
    "Forecasts and supporting assumptions",
    "Supports repayment capacity where history is limited",
    "Client accountant",
    "12\u201324 months",
    "financials",
  ),
  D(
    "doc-experience",
    "Evidence of relevant owner or management experience",
    "Relevant where the operator is new to the business or industry",
    "Client",
    "Current",
    "business",
  ),
  D(
    "doc-quote",
    "Supplier quote or invoice and asset details",
    "Confirms the asset, price and supplier",
    "Supplier",
    "Current",
    "security",
  ),
  D(
    "doc-assetlife",
    "Asset useful-life information",
    "Relevant to matching the term to the economic life",
    "Broker / supplier",
    "Current",
    "request",
  ),
  D(
    "doc-usefunds",
    "Use-of-funds schedule",
    "Itemises how the requested funds will be applied",
    "Broker with client",
    "Before comparison",
    "request",
  ),
  D(
    "doc-cashflow",
    "Cash-flow forecast supporting the funding need",
    "Supports the working-capital requirement",
    "Client accountant",
    "12 months",
    "financials",
  ),
  D(
    "doc-devcosts",
    "Cost evidence — QS report or fixed-price contract",
    "Establishes total project cost and contingency",
    "Quantity surveyor / builder",
    "Before comparison",
    "request",
  ),
  D(
    "doc-approvals",
    "Development approvals and planning documentation",
    "Confirms the project may proceed as proposed",
    "Client / consultant",
    "Before comparison",
    "security",
  ),
  D(
    "doc-builder",
    "Builder details, licence and building contract",
    "Confirms who is delivering the project and on what basis",
    "Client",
    "Before comparison",
    "security",
  ),
  D(
    "doc-feasibility",
    "Feasibility with contingency allowance",
    "Shows the project margin and cost buffer",
    "Client",
    "Before comparison",
    "financials",
  ),
  D(
    "doc-debtorledger",
    "Aged debtor ledger",
    "Establishes the ledger size, ageing and concentration",
    "Client",
    "Current",
    "financials",
  ),
  D(
    "doc-topcustomers",
    "Top-customer schedule and continuity commentary",
    "Explains revenue concentration and its stability",
    "Client",
    "Current",
    "business",
  ),
  D(
    "doc-contracts",
    "Material customer contracts",
    "Supports the continuity of concentrated revenue",
    "Client",
    "Current",
    "business",
  ),
  D(
    "doc-franchise",
    "Franchise agreement, disclosure document and fee schedule",
    "Confirms franchise terms and remaining term",
    "Franchisor / client",
    "Current",
    "business",
  ),
  D(
    "doc-franchisorapproval",
    "Franchisor approval and opening forecast",
    "Required for a proposed new franchise",
    "Franchisor",
    "Before comparison",
    "business",
  ),
  D(
    "doc-atoarrangement",
    "ATO payment arrangement statement",
    "Confirms the balance, instalments and expiry",
    "Client accountant",
    "Current",
    "financials",
  ),
  D(
    "doc-taxdispute",
    "Correspondence on the disputed tax liability",
    "Records the basis of the dispute and adviser involvement",
    "Client adviser",
    "Current",
    "financials",
  ),
  D(
    "doc-adverse",
    "Details and evidence for the disclosed adverse event",
    "Establishes what happened, the amount and current status",
    "Client",
    "Current",
    "findings",
  ),
  D(
    "doc-leaseevidence",
    "Executed lease and rent evidence",
    "Verifies contracted rental income relied upon",
    "Client",
    "Current",
    "security",
  ),
  D(
    "doc-assetsale",
    "Evidence of the asset relied on for repayment or exit",
    "Supports an exit that depends on an asset sale",
    "Client",
    "Current",
    "financials",
  ),
  D(
    "doc-refiassump",
    "Refinance assumptions and residual balance calculation",
    "Supports an exit that depends on refinancing",
    "Broker",
    "Current",
    "financials",
  ),
  D(
    "doc-capital",
    "Evidence of committed third-party capital",
    "Supports repayment or contribution from a capital injection",
    "Client",
    "Current",
    "financials",
  ),
  D(
    "doc-guarantorcapacity",
    "Guarantor capacity evidence",
    "Supports reliance on guarantor support",
    "Guarantors",
    "Current",
    "entities",
  ),
  D(
    "doc-title",
    "Title search and encumbrance confirmation",
    "Confirms ownership, mortgages, caveats and priority",
    "Broker search",
    "Before submission",
    "security",
  ),
  D(
    "doc-payout",
    "Payout figure for the existing mortgage",
    "Confirms the amount to be discharged at settlement",
    "Existing financier",
    "Before settlement",
    "security",
  ),
  D(
    "doc-propertydd",
    "Property due-diligence or specialist report",
    "Addresses the environmental, zoning or planning matter raised",
    "Client consultant",
    "Before submission",
    "security",
  ),
  D(
    "doc-assetschedule",
    "Business asset schedule and existing security interests",
    "Supports a general security agreement over business assets",
    "Client",
    "Current",
    "security",
  ),
  D(
    "doc-guarantorconsent",
    "Guarantor consent, assets and liabilities",
    "Records each guarantor\u2019s position and consent",
    "Guarantors",
    "Current",
    "entities",
  ),
  D(
    "doc-vendorfinance",
    "Vendor finance terms and subordination position",
    "Confirms how vendor finance ranks against bank debt",
    "Client solicitor",
    "Before comparison",
    "request",
  ),
  D(
    "doc-brokerrationale",
    "Broker rationale and policy or legal review status",
    "Records the broker\u2019s review of the purpose classification",
    "Broker",
    "Before comparison",
    "request",
  ),
  D(
    "doc-email",
    "Client discussion correspondence",
    "Retains the email record of the options discussion",
    "Broker",
    "At discussion",
    "recommendation",
  ),
];
export const findFlowDocument = (id: string): FlowDocument | null =>
  DOCS.find((d) => d.id === id) ?? null;

// ---------------------------------------------------------------- findings

/**
 * A finding raised by an answer. `action` is a suggested next step for the
 * broker, never an instruction and never a credit conclusion.
 */
export interface FlowFinding {
  readonly id: string;
  readonly headline: string;
  readonly effect: Effect;
  readonly explanation: string;
  readonly action: string;
  readonly section: string;
}

const F = (
  id: string,
  headline: string,
  effect: Effect,
  explanation: string,
  action: string,
  section: string,
): FlowFinding => ({ id, headline, effect, explanation, action, section });

export const FINDINGS: readonly FlowFinding[] = [
  F(
    "fnd-client-unknown",
    "Information required — client record not identified",
    "BLOCK",
    "The borrower has not been matched to a client record, so identity and contact details cannot be relied upon.",
    "Identify or create the client record before a comparison is prepared.",
    "entities",
  ),
  F(
    "fnd-entity-trust",
    "Entity structure requires review",
    "PAUSE",
    "A trust borrower requires the deed, trustee identity, appointor and relevant beneficial owners to be recorded and reviewed.",
    "Obtain the trust deed and record the trustee and beneficial-owner details.",
    "entities",
  ),
  F(
    "fnd-trustee-unconfirmed",
    "Information required — trustee not confirmed",
    "BLOCK",
    "The trustee has not been confirmed, so the borrowing entity is not fully identified.",
    "Confirm the trustee and record who will provide the evidence.",
    "entities",
  ),
  F(
    "fnd-smsf",
    "Specialist review required — SMSF borrowing structure",
    "PAUSE",
    "An SMSF borrowing structure requires specialist review. No SMSF product is included in this prototype comparison.",
    "Refer the structure for specialist review before considering products.",
    "entities",
  ),
  F(
    "fnd-entity-other",
    "Entity classification requires review",
    "PAUSE",
    "The proposed structure sits outside the standard entity options and needs to be described and reviewed.",
    "Record the structure and the responsible entities, then review the classification.",
    "entities",
  ),
  F(
    "fnd-authority-pending",
    "Authority provided but not recorded",
    "COND",
    "Authority to collect, use and share information was given but has not been recorded on the file.",
    "Record the consent evidence on the file.",
    "entities",
  ),
  F(
    "fnd-authority-missing",
    "Information required — authority to proceed not recorded",
    "BLOCK",
    "Authority to collect, use and share the client\u2019s information has not been recorded.",
    "Record authority before continuing beyond initial information capture.",
    "entities",
  ),
  F(
    "fnd-acting-attorney",
    "Requires review — attorney or agent acting",
    "PAUSE",
    "A person is acting under a power of attorney or agency authority that has not been verified.",
    "Verify the authority and identity of the person acting.",
    "entities",
  ),
  F(
    "fnd-acting-unsure",
    "Information required — capacity of the person acting",
    "PAUSE",
    "It is not confirmed whether anyone is acting on behalf of another person or entity.",
    "Confirm the capacity of each person involved before the comparison is finalised.",
    "entities",
  ),
  F(
    "fnd-purpose-other",
    "Purpose classification requires review",
    "PAUSE",
    "The stated purpose sits outside the listed categories and needs a description and use-of-funds breakdown.",
    "Record the purpose description and itemise the use of funds.",
    "request",
  ),
  F(
    "fnd-reg-review",
    "Regulatory classification requires review",
    "BLOCK",
    "A personal, domestic, household or residential-investment component has been indicated. The application of consumer-credit obligations depends on the substance and purpose of the credit, not the commercial label.",
    "Record the purpose split and review the classification under the applicable law and business policy.",
    "request",
  ),
  F(
    "fnd-reg-unclassified",
    "Purpose not sufficiently classified",
    "BLOCK",
    "The purpose has not been classified clearly enough to proceed to a product comparison.",
    "Record a use-of-funds breakdown and review the classification.",
    "request",
  ),
  F(
    "fnd-reg-confirmed",
    "Policy confirmation required — purpose reviewed by broker",
    "COND",
    "The broker has recorded a review concluding the purpose is wholly or predominantly commercial. Supporting rationale and review status remain visible.",
    "Retain the rationale and confirm the position under business policy before submission.",
    "request",
  ),
  F(
    "fnd-reg-regulated",
    "Route for specialist or residential compliance review",
    "BLOCK",
    "A regulated or mixed-purpose pathway has been indicated, so commercial product recommendations are not shown.",
    "Route the application for specialist or residential compliance review.",
    "request",
  ),
  F(
    "fnd-relatedparty",
    "Related-party benefit requires review",
    "PAUSE",
    "Some or all of the funds benefit a related entity or person, which changes the purpose and benefit analysis.",
    "Record the inter-entity purpose and the evidence of benefit.",
    "request",
  ),
  F(
    "fnd-flowoffunds",
    "Flow of funds requires clarification",
    "PAUSE",
    "It is not clear who receives the direct benefit of the funds.",
    "Record the intended flow of funds and supporting evidence.",
    "request",
  ),
  F(
    "fnd-resi-security",
    "Residential security — classification and policy review required",
    "PAUSE",
    "Residential property is offered as security, which requires the purpose classification and lender policy treatment to be reviewed.",
    "Confirm whether the purpose remains wholly or predominantly commercial and record the rationale.",
    "security",
  ),
  F(
    "fnd-resi-unsure",
    "Regulatory classification requires review — residential security",
    "BLOCK",
    "It is not confirmed whether the purpose remains wholly or predominantly commercial while residential security is offered.",
    "Review the purpose and record the conclusion and rationale.",
    "security",
  ),
  F(
    "fnd-unsecured",
    "Insufficient information to assess — no security proposed",
    "PAUSE",
    "No specific security is proposed. The four hardcoded products in this prototype are compared on a secured basis.",
    "Record the proposed security or confirm an unsecured request with the lender.",
    "security",
  ),
  F(
    "fnd-security-undecided",
    "Security structure required",
    "PAUSE",
    "The security structure has not been decided, so a meaningful comparison cannot be finalised.",
    "Record the proposed security.",
    "security",
  ),
  F(
    "fnd-timing-high",
    "High timing importance — unconditional contract",
    "COND",
    "The contract is unconditional, so settlement timing carries elevated importance. Legal advice on the contract sits outside this platform.",
    "Confirm the settlement date and the client\u2019s own legal advice arrangements.",
    "request",
  ),
  F(
    "fnd-deposit-risk",
    "Timing and deposit risk requires review",
    "PAUSE",
    "A potentially non-refundable deposit has been paid, which increases the consequences of a funding delay.",
    "Record the deposit terms and confirm the settlement timetable.",
    "request",
  ),
  F(
    "fnd-deposit-unknown",
    "Information required — deposit status",
    "COND",
    "The deposit position is not confirmed.",
    "Confirm the deposit position and record who will confirm it.",
    "request",
  ),
  F(
    "fnd-no-conditions",
    "Timing risk requires review — no transaction conditions",
    "PAUSE",
    "No transaction conditions were recorded, so there is no contractual protection if finance or valuation outcomes differ.",
    "Confirm the contract position and the client\u2019s legal advice.",
    "request",
  ),
  F(
    "fnd-io-tradeoff",
    "Interest-only structure — total cost trade-off",
    "COND",
    "An interest-only period reduces early repayments and increases total interest over the life of the facility.",
    "Record the reason, requested period and repayment or exit strategy.",
    "request",
  ),
  F(
    "fnd-revolving",
    "Revolving facility — structure review",
    "COND",
    "A revolving or line-of-credit facility requires the operating cycle and reduction strategy to be recorded, and only compatible facilities can be compared.",
    "Record the limit need and proposed cleanup or reduction strategy.",
    "request",
  ),
  F(
    "fnd-bullet",
    "Bullet or residual structure — specialist and policy review",
    "COND",
    "A bullet or residual repayment depends on the exit, so lender policy and specialist review are required.",
    "Record the exit strategy and confirm lender appetite.",
    "request",
  ),
  F(
    "fnd-fixed-nopricing",
    "Insufficient information to assess a fixed rate",
    "COND",
    "A fixed rate was requested. The hardcoded prototype dataset does not hold verified fixed pricing for these products.",
    "Request fixed pricing from the lender before presenting a fixed option.",
    "comparison",
  ),
  F(
    "fnd-history-short",
    "Limited trading history requires review",
    "PAUSE",
    "The business has traded for less than 12 months, so historical earnings are not available to support the request.",
    "Obtain monthly forecasts, assumptions, opening balance sheet and evidence of owner experience.",
    "business",
  ),
  F(
    "fnd-history-2y",
    "Short trading history",
    "COND",
    "The business has traded for between 12 and 24 months, so forecasts and interim accounts carry more weight.",
    "Obtain forecasts, interim accounts and experience evidence.",
    "business",
  ),
  F(
    "fnd-franchise-unsure",
    "Franchise status requires clarification",
    "COND",
    "It is not confirmed whether the business operates under a franchise agreement.",
    "Confirm the franchise position with the client.",
    "business",
  ),
  F(
    "fnd-concentration",
    "Revenue concentration requires review",
    "PAUSE",
    "More than 40% of revenue comes from one customer or referral source, which concentrates repayment capacity.",
    "Obtain the contracts and prepare a sensitivity scenario.",
    "business",
  ),
  F(
    "fnd-concentration-unmeasured",
    "Concentration not measured",
    "COND",
    "Customer concentration has not been measured, so its effect on earnings is unknown.",
    "Prepare a concentration analysis from the debtor ledger or revenue records.",
    "business",
  ),
  F(
    "fnd-trend",
    "Financial trend requires review",
    "PAUSE",
    "A revenue or margin decline has been disclosed.",
    "Record the explanation and obtain a downside forecast.",
    "financials",
  ),
  F(
    "fnd-dependency",
    "Material dependency review",
    "PAUSE",
    "The loss of a key customer or person has been disclosed.",
    "Record the mitigation plan and its evidence.",
    "business",
  ),
  F(
    "fnd-tax-arrangement",
    "Tax liability — lender policy review",
    "COND",
    "A current ATO payment arrangement exists. Treatment of the arrangement requires lender confirmation.",
    "Obtain the arrangement statement and confirm treatment with the lender.",
    "financials",
  ),
  F(
    "fnd-tax-arrears",
    "Tax arrears requires review",
    "PAUSE",
    "An amount is overdue to the ATO with no payment arrangement in place.",
    "Record the proposed treatment of the arrears and obtain ATO evidence.",
    "financials",
  ),
  F(
    "fnd-tax-dispute",
    "Disputed tax liability",
    "PAUSE",
    "A tax liability is disputed. The amount, basis and adviser position need to be recorded.",
    "Obtain the correspondence and record the adviser\u2019s position.",
    "financials",
  ),
  F(
    "fnd-tax-unconfirmed",
    "Information required — tax position",
    "COND",
    "The tax position has not been confirmed.",
    "Obtain ATO or accountant evidence of the lodgement and payment position.",
    "financials",
  ),
  F(
    "fnd-adverse-historical",
    "Historical adverse event — review relevance",
    "COND",
    "A resolved adverse event has been disclosed. Its relevance to the current request should be recorded.",
    "Record the details and evidence, and note the relevance to this request.",
    "findings",
  ),
  F(
    "fnd-adverse-current",
    "Material adverse event requires review",
    "PAUSE",
    "A current dispute or default has been disclosed.",
    "Record the amount, status and legal or accounting context.",
    "findings",
  ),
  F(
    "fnd-insolvency",
    "Specialist escalation required",
    "BLOCK",
    "An insolvency appointment, application or serious concern has been disclosed. Product recommendations are not shown.",
    "Escalate for specialist review before any product is considered.",
    "findings",
  ),
  F(
    "fnd-adverse-unconfirmed",
    "Adverse position not confirmed",
    "PAUSE",
    "It is not confirmed whether disputes, defaults or insolvency events exist.",
    "Obtain searches or written client confirmation.",
    "findings",
  ),
  F(
    "fnd-nofinancials",
    "Information required — no financial information available",
    "BLOCK",
    "No financial information has been obtained, so repayment capacity cannot be assessed even indicatively.",
    "Obtain financial statements, management accounts and a debt schedule.",
    "financials",
  ),
  F(
    "fnd-adj-requested",
    "Normalisation adjustment — evidence requested",
    "COND",
    "A proposed add-back is not yet supported by evidence, so it is excluded from the primary DSCR and shown only as a secondary scenario.",
    "Obtain the supporting evidence and review each adjustment.",
    "financials",
  ),
  F(
    "fnd-adj-unsupported",
    "Potential gap — unsupported normalisation adjustment",
    "PAUSE",
    "A proposed add-back has no identified evidence. It is excluded from the primary DSCR.",
    "Identify evidence for the adjustment or remove it from the assessment.",
    "financials",
  ),
  F(
    "fnd-adj-unsure",
    "Requires review — adjustment basis unclear",
    "COND",
    "It is not clear whether adjustments should be included, so reported and provisional adjusted figures are shown separately.",
    "Review each proposed adjustment with the client\u2019s accountant.",
    "financials",
  ),
  F(
    "fnd-lease-income",
    "Requires review — reliance on lease income",
    "PAUSE",
    "Repayment relies on contracted lease income that has not been verified.",
    "Obtain the lease and rent evidence, and show serviceability with and without the income.",
    "financials",
  ),
  F(
    "fnd-exit-asset",
    "Exit-dependent repayment review",
    "PAUSE",
    "Repayment depends on an asset sale, so value, timing and a fallback are required.",
    "Record the asset, indicative value, timing and fallback position.",
    "financials",
  ),
  F(
    "fnd-exit-refi",
    "Refinance risk review",
    "COND",
    "Repayment depends on refinancing at maturity.",
    "Record the residual balance and refinance assumptions.",
    "financials",
  ),
  F(
    "fnd-thirdparty-funding",
    "Third-party funding dependency",
    "PAUSE",
    "Repayment or contribution depends on a capital injection from another party.",
    "Obtain evidence of the source and the commitment.",
    "financials",
  ),
  F(
    "fnd-exit-none",
    "Information required — exit strategy",
    "PAUSE",
    "No credible secondary repayment or exit strategy has been recorded.",
    "Record the secondary repayment or exit position.",
    "financials",
  ),
  F(
    "fnd-occupancy-thirdparty",
    "Requires review — proposed third-party occupancy needs clarification before lender comparison is finalised",
    "PAUSE",
    "Part of the property may be occupied by an independent third party. This changes the property-use profile and requires expected rental income, lease arrangements, valuation treatment and lender policy to be clarified. It is not an adverse issue.",
    "Record the proposed tenant, area, term and lease status, and confirm treatment with the proposed lender.",
    "security",
  ),
  F(
    "fnd-occupancy-thirdparty-resolved",
    "Policy confirmation required — proposed third-party occupancy recorded",
    "COND",
    "The proposed tenant, area, term and lease status have been recorded and rental income is excluded from serviceability. Lender treatment of the occupancy still requires confirmation and does not prevent finalising the internal application record.",
    "Confirm treatment of the proposed occupancy with the proposed lender before submission.",
    "security",
  ),
  F(
    "fnd-occupancy-investment",
    "Property investment classification and lender-policy review",
    "PAUSE",
    "The property is mainly or fully leased, which changes the classification and the lender policy that applies.",
    "Record the tenant schedule and rental reliance, and confirm lender treatment.",
    "security",
  ),
  F(
    "fnd-vacancy",
    "Vacancy and timing review",
    "COND",
    "The property will be vacant at settlement, so holding costs apply until occupation.",
    "Record the intended occupation date and holding-cost capacity.",
    "security",
  ),
  F(
    "fnd-occupancy-unknown",
    "Information required — property occupancy",
    "PAUSE",
    "How the property will be occupied is not confirmed.",
    "Confirm the intended occupancy with the client.",
    "security",
  ),
  F(
    "fnd-occupancy-informal",
    "Requires review — informal occupancy arrangement",
    "PAUSE",
    "An informal occupancy arrangement has been disclosed. Rental income is excluded from serviceability.",
    "Record the arrangement and confirm lender policy treatment.",
    "security",
  ),
  F(
    "fnd-occupancy-notenant",
    "Occupancy uncertainty",
    "PAUSE",
    "A third-party area is proposed but no tenant has been identified. Income is excluded.",
    "Confirm the intended use of the area and whether income will be relied upon.",
    "security",
  ),
  F(
    "fnd-value-unverified",
    "Requires review — value evidence is unverified",
    "COND",
    "The recorded value is an appraisal, estimate or contract figure rather than a lender-accepted valuation.",
    "Instruct a lender valuation and treat the LVR as indicative.",
    "security",
  ),
  F(
    "fnd-value-stale",
    "Requires review — stale valuation",
    "COND",
    "The valuation relied upon is older than the period a lender would usually accept.",
    "Obtain an updated valuation.",
    "security",
  ),
  F(
    "fnd-value-none",
    "Insufficient information to assess — no value evidence",
    "BLOCK",
    "No value evidence has been recorded, so an LVR-based comparison cannot be produced.",
    "Record a working value estimate and instruct a valuation.",
    "security",
  ),
  F(
    "fnd-priority",
    "Security priority requires review",
    "PAUSE",
    "Another encumbrance is registered against the security, which affects priority.",
    "Record the encumbrance type and beneficiary, and confirm the priority position.",
    "security",
  ),
  F(
    "fnd-title-unconfirmed",
    "Information required — title and encumbrance position",
    "COND",
    "The encumbrance position has not been confirmed.",
    "Obtain a title search before submission.",
    "security",
  ),
  F(
    "fnd-propertydd",
    "Property due diligence requires review",
    "PAUSE",
    "An environmental, zoning, planning or specialised-property matter has been raised and its materiality is not yet known.",
    "Obtain the specialist report or professional review.",
    "security",
  ),
  F(
    "fnd-specialised",
    "Specialised property — valuation and lender appetite confirmation",
    "COND",
    "The property has specialised characteristics that affect valuation and lender appetite.",
    "Confirm valuation approach and lender appetite for the specialised use.",
    "security",
  ),
  F(
    "fnd-propertydd-unconfirmed",
    "Property due diligence not confirmed",
    "COND",
    "Environmental, zoning and planning matters have not been confirmed.",
    "Add the due-diligence enquiries to the action list.",
    "security",
  ),
  F(
    "fnd-wc-gap",
    "Potential gap — working capital below the client\u2019s stated minimum",
    "COND",
    "Estimated working capital after settlement and costs is below the minimum the client said they wanted to retain.",
    "Discuss the funding structure or the retained buffer with the client.",
    "financials",
  ),
  F(
    "fnd-lvr-policy",
    "Policy confirmation required — contribution below a published deposit indicator",
    "COND",
    "The requested LVR exceeds a published deposit indicator held for one of the compared products. No lender maximum has been assumed.",
    "Confirm the deposit and LVR position with the lender.",
    "comparison",
  ),
  F(
    "fnd-acq-structure",
    "Structure requires review — vendor finance terms",
    "PAUSE",
    "Vendor finance is proposed on terms that are unknown or not subordinated to bank debt.",
    "Record the vendor finance terms and subordination position.",
    "request",
  ),
  F(
    "fnd-acq-experience",
    "Requires review — operator new to the industry",
    "PAUSE",
    "The operator is new to this industry, which affects the assessment of the acquisition.",
    "Record the experience plan and any retained management.",
    "business",
  ),
  F(
    "fnd-acq-dd",
    "Acquisition due diligence review",
    "PAUSE",
    "Due diligence on the target business has not been started or has been waived.",
    "Record the diligence scope the client will undertake, or the reason it was waived.",
    "findings",
  ),
  F(
    "fnd-dev-planning",
    "Development approvals not in place",
    "PAUSE",
    "Planning approval has not been granted, so the project cannot be assessed on a final basis.",
    "Record the approval pathway and expected timing.",
    "security",
  ),
  F(
    "fnd-dev-builder",
    "Construction delivery review",
    "PAUSE",
    "The delivery method is cost-plus, owner-builder or the builder is not appointed.",
    "Record the delivery method and the builder position.",
    "security",
  ),
  F(
    "fnd-dev-costs",
    "Cost evidence insufficient",
    "PAUSE",
    "Only a preliminary cost estimate is available, so total project cost is not established.",
    "Obtain a QS report or fixed-price contract.",
    "request",
  ),
  F(
    "fnd-dev-contingency",
    "Feasibility information required — contingency",
    "PAUSE",
    "No contingency allowance has been recorded in the feasibility.",
    "Record the contingency amount or percentage.",
    "financials",
  ),
  F(
    "fnd-equip-term",
    "Structure review — term against economic life",
    "COND",
    "The requested term may exceed the asset\u2019s useful life, or the comparison has not been assessed.",
    "Record the asset\u2019s economic life and align the requested term.",
    "request",
  ),
  F(
    "fnd-equip-used",
    "Policy confirmation required — used or private-sale asset",
    "COND",
    "A used or private-sale asset requires valuation and lender policy confirmation.",
    "Obtain a valuation and confirm lender appetite for the asset age and sale type.",
    "security",
  ),
  F(
    "fnd-wc-unclear",
    "Repayment source not clear",
    "PAUSE",
    "The working-capital repayment source and timeframe are not clear.",
    "Record the repayment source and the expected timeframe.",
    "financials",
  ),
  F(
    "fnd-if-ledger",
    "Ledger information not captured",
    "PAUSE",
    "Ledger size and ageing have not been captured, so invoice-finance product matching cannot proceed.",
    "Obtain the aged debtor ledger.",
    "financials",
  ),
  F(
    "fnd-if-concentration",
    "Debtor concentration requires detailed ledger review",
    "PAUSE",
    "Customer concentration in the ledger is high or unknown.",
    "Obtain a detailed ledger review by customer.",
    "financials",
  ),
  F(
    "fnd-if-disputes",
    "Eligibility and policy review — ledger quality",
    "PAUSE",
    "Disputes, contra arrangements or progress claims are present or unknown, which affects eligible invoices.",
    "Record the ledger quality issues and confirm eligibility treatment.",
    "financials",
  ),
  F(
    "fnd-if-noproduct",
    "Insufficient information to assess — no compatible product in this prototype",
    "PAUSE",
    "The four hardcoded products in this prototype are term facilities. No invoice-finance product is available to compare.",
    "Compare invoice-finance options outside this prototype dataset.",
    "comparison",
  ),
  F(
    "fnd-tradeoff-covenant",
    "Requires review — tighter covenants accepted for lower price",
    "COND",
    "The client indicated they may accept tighter covenants in exchange for lower pricing.",
    "Record which covenants were explained and the client\u2019s understanding of them.",
    "needs",
  ),
  F(
    "fnd-tradeoff-security",
    "Additional security or guarantees accepted",
    "INFO",
    "The client indicated they may accept additional security or guarantees. The requirement and its risk remain visible.",
    "Explain the guarantee implications when presenting options.",
    "needs",
  ),
  F(
    "fnd-tradeoff-price",
    "Higher price accepted for certainty or speed",
    "INFO",
    "The client indicated they may accept a higher price for certainty or speed. Price can only be outweighed with an explicit rationale.",
    "Record the rationale in the recommendation.",
    "needs",
  ),
  F(
    "fnd-tradeoff-term",
    "Longer term accepted for lower repayments",
    "INFO",
    "A longer term reduces repayments and increases total interest.",
    "Show the total-interest effect when presenting options.",
    "needs",
  ),
  F(
    "fnd-needs-conflict",
    "Requires review — options conflict with stated priorities",
    "INFO",
    "The client accepted no material trade-off. Where a compared option conflicts with a stated priority this is shown rather than the option being suppressed.",
    "Explain the conflicts when presenting options.",
    "needs",
  ),
  F(
    "fnd-choice-reconfirm",
    "Needs reconfirmation — application facts changed",
    "PAUSE",
    "A material fact changed after the recommendation or client choice was recorded.",
    "Re-run the comparison and reconfirm the recommendation and client choice.",
    "recommendation",
  ),
  F(
    "fnd-broker-review",
    "Broker review required before finalisation",
    "PAUSE",
    "The broker recorded that it is unclear whether the selected product remains consistent with the latest application facts.",
    "Complete the broker review before finalising.",
    "final",
  ),
  F(
    "fnd-other-material",
    "Requires review — broker-provided fact outside the prototype classification",
    "PAUSE",
    "A fact was recorded as free text that this prototype cannot classify. It is material to purpose, repayment, security, entity identity or recommendation.",
    "Review the recorded text and classify it under business policy.",
    "findings",
  ),
  F(
    "fnd-extract-conflict",
    "Conflicting information — extracted value differs from the recorded value",
    "PAUSE",
    "A value read from a supporting document differs from a value already recorded on the application. The recorded value has been kept and both are shown.",
    "Open the source document, decide which value is correct and confirm it.",
    "findings",
  ),
  F(
    "fnd-extract-unconfirmed",
    "Extracted values awaiting broker confirmation",
    "COND",
    "Values written into the application by the document analysis have not all been confirmed. They are visible with their source citation and do not influence the recommendation until confirmed.",
    "Review each extracted value against its source document and confirm or edit it.",
    "findings",
  ),
  F(
    "fnd-doc-gaps",
    "Documents outstanding after analysis",
    "COND",
    "The document pack does not contain every item the application needs. A document not being present is not evidence that the underlying fact does not exist.",
    "Request the outstanding documents and record who is providing each one.",
    "documents",
  ),
  F(
    "fnd-unsure-generic",
    "Information required — answer not yet confirmed",
    "COND",
    "The broker recorded that the answer is not yet confirmed.",
    "Record who will confirm the answer and by when.",
    "findings",
  ),
];
export const findFlowFinding = (id: string): FlowFinding | null =>
  FINDINGS.find((f) => f.id === id) ?? null;

// ---------------------------------------------------------------- questions

/** A value written onto the canvas by an answer. */
export type FieldValue = string | number | readonly string[];

/** A free-text field an option asks the broker to complete. */
export interface PromptedField {
  readonly k: string;
  readonly label: string;
  readonly type: "text" | "num" | "money";
}

/**
 * What selecting an option does. Every consequence is declared here rather than
 * computed later, so the effect of an answer is inspectable without running it.
 */
export interface OptionEffects {
  /** Canvas fields to set. */
  readonly f?: Readonly<Record<string, FieldValue>>;
  /** Document requirements to add. */
  readonly docs?: readonly string[];
  /** Initial status for specific documents, overriding `Required`. */
  readonly docStatus?: Readonly<Record<string, DocStatus>>;
  /** Findings to raise. */
  readonly find?: readonly string[];
  /**
   * Findings this answer resolves. Re-answering a question must be able to
   * withdraw a finding an earlier answer raised, or a corrected answer would
   * leave a stale concern on the file.
   */
  readonly clears?: readonly string[];
  /** Additional fields to ask the broker for. */
  readonly ask?: readonly string[];
  /**
   * In a multi-select, choosing this option clears the others — used for
   * "None of these" style answers that contradict any other selection.
   */
  readonly exclusive?: boolean;
  /** The question's prompted fields must be completed for this option. */
  readonly fieldsRequired?: boolean;
  /** Requires a free-text description alongside the selection. */
  readonly other?: boolean;
  /** Note recorded against the answer. */
  readonly note?: string;
  /** Specialist module to activate. */
  readonly mod?: string;
  /** Progression effect, when the option itself gates the comparison. */
  readonly prog?: Effect;
  /** Keep the question open after answering. */
  readonly stay?: boolean;
  /** Stop the flow with this message. */
  readonly halt?: string;
  /** Opens a record picker instead of accepting a plain value. */
  readonly picker?: "client";
  /** Franchise sub-flow branch. */
  readonly franchise?: string;
}

export interface QuestionOption extends OptionEffects {
  readonly v: string;
  readonly label: string;
}

const o = (
  v: string,
  label: string,
  fx: OptionEffects = {},
): QuestionOption => ({ v, label, ...fx });

/**
 * How a question is answered.
 *  single/multi — choose one or several options
 *  rank3        — choose three options and rank them
 *  gate         — a checklist that must be satisfied
 *  products     — the product comparison step
 *  actions      — a set of next actions rather than an answer
 */
export type Control =
  "single" | "multi" | "rank3" | "gate" | "products" | "actions";

export interface QuestionExtras {
  /** Explains why the question is asked. Shown on request. */
  readonly why?: string;
  /** Fields collected alongside the selection. */
  readonly fields?: readonly PromptedField[];
  readonly docs?: readonly string[];
  readonly find?: readonly string[];
  /** Additional fields to ask the broker for, whichever option is chosen. */
  readonly ask?: readonly string[];
}

export interface Question extends QuestionExtras {
  readonly id: string;
  readonly stage: string;
  readonly section: string;
  readonly text: string;
  readonly control: Control;
  readonly options: readonly QuestionOption[];
}

const Q = (
  id: string,
  stage: string,
  section: string,
  text: string,
  control: Control,
  options: readonly QuestionOption[],
  extra: QuestionExtras = {},
): Question => ({ id, stage, section, text, control, options, ...extra });

/*
 * Built by the `add` calls below, in declaration order. The matrix is large
 * enough that keeping each question adjacent to its options is worth more than
 * avoiding the accumulator.
 */
const questions: Record<string, Question> = {};
const add = (q: Question): Question => {
  questions[q.id] = q;
  return q;
};

export const QUESTIONS: Readonly<Record<string, Question>> = questions;

// ---- A. Client, entity and authority
add(
  Q(
    "I01",
    "Client, borrower and authority",
    "documents",
    "Do you have the client’s documents to upload?",
    "single",
    [
      o("most", "Yes — I have most or all documents", {
        f: { intakeMode: "Document-led — broker holds most or all documents" },
      }),
      o("some", "I have some documents", {
        f: { intakeMode: "Document-led — broker holds some documents" },
      }),
      o("none", "No documents yet — let’s go through the questions", {
        f: { intakeMode: "Question-led — no documents held yet" },
      }),
    ],
    {
      why: "If you upload first, I can identify the client and the entity from the documents, populate the application with what they contain, and then only ask about what is missing or needs your judgement.",
    },
  ),
);

add(
  Q(
    "C01",
    "Client, borrower and authority",
    "entities",
    "Is this application for an existing client or a new client?",
    "single",
    [
      o("existing", "Existing client", {
        picker: "client",
        f: { clientStatus: "Existing client record" },
      }),
      o("new", "New client", {
        f: { clientStatus: "New client — draft record created" },
        ask: ["legalName", "tradingName", "abn", "contactName"],
      }),
      o("check", "I need to check", {
        f: { clientStatus: "Not identified" },
        find: ["fnd-client-unknown"],
      }),
    ],
    {
      why: "Identifying the borrower first means every later answer attaches to the right record.",
    },
  ),
);

add(
  Q(
    "C02",
    "Client, borrower and authority",
    "entities",
    "What is the proposed borrowing entity?",
    "single",
    [
      o("company", "Company", {
        f: { entityType: "Company" },
        docs: ["doc-companyextract", "doc-id", "doc-dirpal"],
      }),
      o("trust", "Trust", {
        f: { entityType: "Trust" },
        docs: ["doc-trustdeed"],
        find: ["fnd-entity-trust"],
      }),
      o("partnership", "Partnership", {
        f: { entityType: "Partnership" },
        docs: ["doc-partnership", "doc-id"],
      }),
      o("sole", "Sole trader", {
        f: { entityType: "Sole trader — borrower is the individual" },
        docs: ["doc-soletrader", "doc-id"],
      }),
      o("smsf", "SMSF", {
        f: { entityType: "SMSF" },
        docs: ["doc-smsf"],
        find: ["fnd-smsf"],
      }),
      o("other", "Other", {
        f: { entityType: "Other — described by broker" },
        other: true,
        docs: ["doc-structure"],
        find: ["fnd-entity-other"],
      }),
    ],
    {
      why: "The entity determines whose identity, records and guarantees are required.",
    },
  ),
);

add(
  Q(
    "C02A",
    "Client, borrower and authority",
    "entities",
    "For the trust, who is the trustee?",
    "single",
    [
      o("corporate", "Corporate trustee", {
        f: { trusteeType: "Corporate trustee" },
        docs: ["doc-trusteeextract"],
      }),
      o("individual", "Individual trustee", {
        f: { trusteeType: "Individual trustee" },
        docs: ["doc-trusteeid"],
      }),
      o("unconfirmed", "Not yet confirmed", {
        f: { trusteeType: "Not yet confirmed" },
        find: ["fnd-trustee-unconfirmed"],
      }),
    ],
  ),
);

add(
  Q(
    "C03",
    "Client, borrower and authority",
    "entities",
    "Do you have authority to collect, use and share this client\u2019s information for this finance request?",
    "single",
    [
      o("recorded", "Yes — recorded", {
        f: { authorityStatus: "Recorded" },
        docs: ["doc-consent"],
      }),
      o("pending", "Provided but not recorded", {
        f: { authorityStatus: "Pending evidence" },
        docs: ["doc-consent"],
        docStatus: { "doc-consent": "Requested" },
        find: ["fnd-authority-pending"],
      }),
      o("notyet", "Not yet", {
        f: { authorityStatus: "Not recorded" },
        find: ["fnd-authority-missing"],
        stay: true,
      }),
      o("declined", "Client declined", {
        f: { authorityStatus: "Client declined" },
        halt: "Cannot continue without authority",
      }),
    ],
    {
      why: "Privacy handling requires the collection to be necessary and the client to be notified.",
    },
  ),
);

add(
  Q(
    "C04",
    "Client, borrower and authority",
    "entities",
    "Is anyone acting on behalf of another person or entity?",
    "single",
    [
      o("no", "No", {
        f: { actingFor: "No — the directors are acting for the borrower" },
      }),
      o("officer", "Yes — director or authorised officer", {
        f: { actingFor: "Director or authorised officer" },
        docs: ["doc-authority"],
        ask: ["actingName", "actingCapacity"],
      }),
      o("adviser", "Yes — accountant, lawyer or adviser", {
        f: { actingFor: "Accountant, lawyer or adviser" },
        docs: ["doc-adviserauth"],
        ask: ["actingName", "actingCapacity"],
      }),
      o("attorney", "Yes — attorney or agent", {
        f: { actingFor: "Attorney or agent" },
        docs: ["doc-poa"],
        find: ["fnd-acting-attorney"],
      }),
      o("unsure", "Unsure", {
        f: { actingFor: "Not confirmed" },
        find: ["fnd-acting-unsure"],
      }),
    ],
  ),
);

// ---- B. Purpose and regulatory classification
add(
  Q(
    "P01",
    "Loan purpose and classification",
    "request",
    "What is the finance being used for? Select every purpose that applies.",
    "multi",
    [
      o("purchase", "Purchase commercial property", {
        docs: ["doc-contract", "doc-deposit", "doc-contrib", "doc-val"],
        mod: "purchase",
      }),
      o("refinance", "Refinance existing commercial debt", {
        docs: ["doc-facilitystmts"],
        mod: "refinance",
      }),
      o("acquire", "Buy a business", {
        docs: [
          "doc-saleagreement",
          "doc-dd",
          "doc-targetfin",
          "doc-forecast",
          "doc-experience",
        ],
        mod: "acquisition",
      }),
      o("equipment", "Equipment or vehicle", {
        docs: ["doc-quote", "doc-assetlife"],
        mod: "equipment",
      }),
      o("workingcap", "Working capital", {
        docs: ["doc-usefunds", "doc-cashflow"],
        mod: "workingcap",
      }),
      o("development", "Property development or construction", {
        docs: [
          "doc-approvals",
          "doc-devcosts",
          "doc-builder",
          "doc-feasibility",
        ],
        mod: "development",
        prog: "PAUSE",
      }),
      o("invoice", "Debtor or invoice finance", {
        docs: ["doc-debtorledger"],
        mod: "invoice",
      }),
      o("other", "Other", {
        other: true,
        docs: ["doc-usefunds"],
        find: ["fnd-purpose-other"],
      }),
    ],
    {
      why: "The purpose drives which questions, documents and product structures apply.",
    },
  ),
);

add(
  Q(
    "P01A",
    "Loan purpose and classification",
    "needs",
    "Why is the client refinancing?",
    "multi",
    [
      o("cost", "Reduce cost"),
      o("limit", "Increase limit"),
      o("release", "Release security"),
      o("term", "Extend term"),
      o("covenant", "Covenant flexibility"),
      o("consolidate", "Consolidate debt"),
      o("relationship", "Relationship issue"),
      o("other", "Other", { other: true }),
    ],
    { docs: ["doc-refibenefit"], ask: ["refiBenefit"] },
  ),
);

add(
  Q(
    "P02",
    "Loan purpose and classification",
    "request",
    "Does any part of the proposed credit relate to personal, domestic or household use, or to residential property for investment?",
    "single",
    [
      o("no", "No — wholly business or commercial", {
        f: {
          purposeIndication:
            "Predominantly business-purpose commercial finance",
        },
      }),
      o("personal", "Yes — personal, domestic or household component", {
        f: { purposeIndication: "Mixed or consumer purpose indicated" },
        find: ["fnd-reg-review"],
      }),
      o("resi", "Yes — residential investment component", {
        f: { purposeIndication: "Residential investment purpose indicated" },
        find: ["fnd-reg-review"],
      }),
      o("unsure", "Unsure", {
        f: { purposeIndication: "Purpose not sufficiently classified" },
        find: ["fnd-reg-unclassified"],
      }),
    ],
    {
      why: "A commercial label does not by itself remove consumer-credit obligations — the substance and purpose of the credit decide.",
    },
  ),
);

add(
  Q(
    "P02A",
    "Loan purpose and classification",
    "request",
    "Record the purpose split, then choose how this application should proceed.",
    "single",
    [
      o(
        "confirmed",
        "Confirmed wholly or predominantly commercial after review",
        {
          f: { regTreatment: "Reviewed by broker — predominantly commercial" },
          docs: ["doc-brokerrationale"],
          find: ["fnd-reg-confirmed"],
          clears: ["fnd-reg-review", "fnd-reg-unclassified"],
          ask: ["brokerRationale"],
        },
      ),
      o("regulated", "Regulated or mixed-purpose pathway required", {
        f: { regTreatment: "Specialist or residential compliance review" },
        find: ["fnd-reg-regulated"],
        clears: ["fnd-reg-review", "fnd-reg-unclassified"],
      }),
      o("more", "More information required", {
        f: { regTreatment: "More information required" },
        docs: ["doc-usefunds"],
      }),
    ],
    {
      fields: [
        {
          k: "splitCommercial",
          label: "Business or commercial portion (%)",
          type: "num",
        },
        {
          k: "splitOther",
          label:
            "Personal, domestic, household or residential-investment portion (%)",
          type: "num",
        },
        { k: "splitNote", label: "Use-of-funds note", type: "text" },
      ],
    },
  ),
);

add(
  Q(
    "P03",
    "Loan purpose and classification",
    "request",
    "Who receives the direct benefit of the funds?",
    "single",
    [
      o("business", "The borrowing business", {
        f: { benefit: "Borrowing business" },
      }),
      o("settlement", "Vendor or financier paid at settlement", {
        f: { benefit: "Vendor or financier paid at settlement" },
        docs: ["doc-contract"],
      }),
      o("related", "A related entity or related person", {
        f: { benefit: "Related entity or person" },
        find: ["fnd-relatedparty"],
        ask: ["relatedRecipient"],
      }),
      o("several", "Several recipients", {
        f: { benefit: "Several recipients — itemised" },
        docs: ["doc-usefunds"],
      }),
      o("unsure", "Other or unsure", {
        f: { benefit: "Not confirmed" },
        other: true,
        find: ["fnd-flowoffunds"],
      }),
    ],
  ),
);

add(
  Q(
    "P04",
    "Loan purpose and classification",
    "security",
    "What security is proposed?",
    "multi",
    [
      o("commercial", "Commercial property", {
        docs: ["doc-val"],
        mod: "propertysec",
      }),
      o("residential", "Residential property", {
        find: ["fnd-resi-security"],
        mod: "propertysec",
      }),
      o("equipment", "Equipment or vehicle", {
        docs: ["doc-quote"],
        mod: "equipment",
      }),
      o("gsa", "Business assets or general security agreement", {
        docs: ["doc-assetschedule"],
      }),
      o("guarantees", "Directors\u2019 guarantees", {
        docs: ["doc-guarantorconsent", "doc-dirpal", "doc-id"],
      }),
      o("none", "No specific security", { find: ["fnd-unsecured"] }),
      o("undecided", "Not yet decided", { find: ["fnd-security-undecided"] }),
    ],
  ),
);

add(
  Q(
    "P04A",
    "Loan purpose and classification",
    "security",
    "Residential property is offered as security. Does the loan purpose remain wholly or predominantly commercial?",
    "single",
    [
      o("yes", "Yes", {
        f: {
          resiCommercial:
            "Broker recorded: purpose remains predominantly commercial",
        },
        docs: ["doc-brokerrationale", "doc-usefunds"],
        find: ["fnd-reg-confirmed"],
        clears: ["fnd-resi-unsure"],
        ask: ["brokerRationale"],
      }),
      o("no", "No", {
        f: { resiCommercial: "Not predominantly commercial" },
        find: ["fnd-reg-regulated"],
      }),
      o("unsure", "Unsure", {
        f: { resiCommercial: "Not confirmed" },
        find: ["fnd-resi-unsure"],
      }),
    ],
  ),
);

// ---- C. Transaction and facility structure
add(
  Q(
    "T01",
    "Transaction and funding",
    "request",
    "What stage is the transaction at?",
    "single",
    [
      o("considering", "Considering options only", {
        f: {
          txStage: "Considering options only",
          settlementDate: "Estimated only",
        },
      }),
      o("identified", "Property identified — no contract", {
        f: {
          txStage: "Property identified, no contract",
          valueLabel: "Unverified",
        },
        prog: "COND",
      }),
      o("negotiating", "Contract under negotiation", {
        f: { txStage: "Contract under negotiation" },
        docs: ["doc-contract"],
      }),
      o("signed", "Contract signed", {
        f: { txStage: "Contract signed" },
        docs: ["doc-contract", "doc-deposit"],
      }),
      o("unconditional", "Unconditional contract", {
        f: { txStage: "Unconditional contract" },
        docs: ["doc-contract", "doc-deposit"],
        find: ["fnd-timing-high"],
      }),
    ],
    {
      fields: [
        {
          k: "purchasePrice",
          label: "Purchase price or total project cost",
          type: "money",
        },
        { k: "loanAmount", label: "Requested loan amount", type: "money" },
        {
          k: "contribution",
          label: "Client contribution before costs",
          type: "money",
        },
        {
          k: "cashAvailable",
          label: "Total cash available before settlement",
          type: "money",
        },
        {
          k: "acqCosts",
          label: "Estimated acquisition and settlement costs",
          type: "money",
        },
        {
          k: "wcTarget",
          label: "Working capital the client wants to retain",
          type: "money",
        },
        {
          k: "contributionSource",
          label: "Source of the contribution",
          type: "text",
        },
        {
          k: "settlementDate",
          label: "Required settlement date",
          type: "text",
        },
      ],
    },
  ),
);

add(
  Q(
    "T02",
    "Transaction and funding",
    "request",
    "Has a deposit been paid?",
    "single",
    [
      o("no", "No", { f: { deposit: "None paid" } }),
      o("refundable", "Yes — refundable or subject to conditions", {
        f: { deposit: "Paid — refundable or conditional" },
        docs: ["doc-deposit", "doc-contract"],
        ask: ["depositAmount"],
      }),
      o("nonrefundable", "Yes — potentially non-refundable", {
        f: { deposit: "Paid — potentially non-refundable" },
        docs: ["doc-deposit"],
        find: ["fnd-deposit-risk"],
        ask: ["depositAmount"],
      }),
      o("unsure", "Unsure", {
        f: { deposit: "Not confirmed" },
        find: ["fnd-deposit-unknown"],
      }),
    ],
  ),
);

add(
  Q(
    "T03",
    "Transaction and funding",
    "request",
    "Which transaction conditions apply?",
    "multi",
    [
      o("finance", "Subject to finance"),
      o("valuation", "Subject to valuation"),
      o("dd", "Due diligence"),
      o("buildingpest", "Building and pest"),
      o("legal", "Legal review"),
      o("board", "Board approval"),
      o("landlord", "Landlord or tenant condition"),
      o("none", "No conditions", {
        exclusive: true,
        find: ["fnd-no-conditions"],
      }),
      o("other", "Other", { other: true }),
    ],
    {
      why: "Each condition becomes a dated action so the critical path stays visible.",
    },
  ),
);

add(
  Q(
    "T04",
    "Transaction and funding",
    "request",
    "What repayment structure does the client prefer?",
    "single",
    [
      o("PI", "Principal and interest", {
        f: { repaymentType: "Principal and interest" },
      }),
      o("IO", "Interest only", {
        f: { repaymentType: "Interest only" },
        find: ["fnd-io-tradeoff"],
        ask: ["ioReason"],
      }),
      o("revolving", "Revolving or line of credit", {
        f: { repaymentType: "Revolving or line of credit" },
        find: ["fnd-revolving"],
      }),
      o("bullet", "Bullet or residual", {
        f: { repaymentType: "Bullet or residual" },
        find: ["fnd-bullet"],
      }),
      o("compare", "Unsure — compare structures", {
        f: { repaymentType: "Comparing P&I and interest-only illustrations" },
      }),
    ],
    {
      fields: [
        { k: "term", label: "Loan term requested (years)", type: "num" },
      ],
    },
  ),
);

add(
  Q(
    "T05",
    "Transaction and funding",
    "request",
    "What interest structure does the client prefer?",
    "single",
    [
      o("variable", "Variable", {
        f: {
          interestPref:
            "Variable, with flexibility to make additional repayments",
        },
      }),
      o("fixed", "Fixed", {
        f: { interestPref: "Fixed" },
        find: ["fnd-fixed-nopricing"],
        ask: ["fixedPeriod"],
      }),
      o("split", "Split", { f: { interestPref: "Split" }, ask: ["splitPct"] }),
      o("nopref", "No preference", {
        f: { interestPref: "No preference — price certainty not prioritised" },
      }),
    ],
  ),
);

// ---- D. Business profile
add(
  Q(
    "B01",
    "Business profile",
    "business",
    "How long has the business traded under the current or substantially similar ownership?",
    "single",
    [
      o("lt12", "Less than 12 months", {
        f: { tradingHistory: "Less than 12 months" },
        docs: ["doc-forecast", "doc-experience"],
        find: ["fnd-history-short"],
      }),
      o("12to24", "12 to 24 months", {
        f: { tradingHistory: "12 to 24 months" },
        docs: ["doc-forecast", "doc-experience"],
        find: ["fnd-history-2y"],
      }),
      o("2to5", "2 to 5 years", {
        f: { tradingHistory: "2 to 5 years" },
        docs: ["doc-financials", "doc-mgmt"],
      }),
      o("gt5", "More than 5 years", {
        f: { tradingHistory: "More than 5 years" },
        docs: ["doc-financials", "doc-mgmt"],
      }),
      o("newentity", "New entity acquiring an established business", {
        f: { tradingHistory: "New entity acquiring an established business" },
        mod: "acquisition",
        docs: ["doc-targetfin"],
      }),
    ],
    {
      fields: [
        {
          k: "industry",
          label: "Industry and business activities",
          type: "text",
        },
        { k: "locations", label: "Locations", type: "text" },
        { k: "employees", label: "Employees", type: "text" },
      ],
    },
  ),
);

add(
  Q(
    "B02",
    "Business profile",
    "business",
    "Is the business a franchise?",
    "single",
    [
      o("no", "No", { f: { franchise: "No" } }),
      o("existing", "Yes — existing franchise", {
        f: { franchise: "Existing franchise" },
        docs: ["doc-franchise"],
        prog: "COND",
      }),
      o("proposed", "Yes — proposed franchise", {
        f: { franchise: "Proposed franchise" },
        docs: ["doc-franchise", "doc-franchisorapproval"],
        prog: "COND",
      }),
      o("unsure", "Unsure", {
        f: { franchise: "Not confirmed" },
        find: ["fnd-franchise-unsure"],
      }),
    ],
  ),
);

add(
  Q(
    "B03",
    "Business profile",
    "business",
    "What is the largest customer or referral-source concentration?",
    "single",
    [
      o("u20", "Under 20% of revenue", {
        f: {
          concentration: "Under 20% of revenue — low disclosed concentration",
        },
      }),
      o("20to40", "20% to 40%", {
        f: { concentration: "20% to 40% of revenue" },
        docs: ["doc-topcustomers"],
      }),
      o("o40", "Over 40%", {
        f: { concentration: "Over 40% of revenue" },
        docs: ["doc-topcustomers", "doc-contracts"],
        find: ["fnd-concentration"],
      }),
      o("notmeasured", "Not measured", {
        f: { concentration: "Not measured" },
        find: ["fnd-concentration-unmeasured"],
      }),
      o("na", "Not relevant to this business model", {
        f: { concentration: "Not relevant — explained by broker" },
        other: true,
      }),
    ],
  ),
);

add(
  Q(
    "B04",
    "Business profile",
    "business",
    "Are there material recent or expected changes to the business?",
    "multi",
    [
      o("none", "None known", { exclusive: true }),
      o("growth", "Rapid growth", { docs: ["doc-forecast"] }),
      o("decline", "Revenue or margin decline", {
        docs: ["doc-forecast"],
        find: ["fnd-trend"],
      }),
      o("ownership", "Ownership or management change", {
        docs: ["doc-experience"],
      }),
      o("newlocation", "New location or major contract", {
        docs: ["doc-forecast", "doc-contracts"],
      }),
      o("loss", "Loss of a key customer or person", {
        find: ["fnd-dependency"],
      }),
      o("other", "Other", { other: true }),
    ],
  ),
);

add(
  Q(
    "B05",
    "Business profile",
    "financials",
    "What is the client\u2019s current tax position?",
    "single",
    [
      o("current", "Lodgements and payments current", {
        f: { taxPosition: "Lodgements and payments current" },
        docs: ["doc-ato"],
      }),
      o("arrangement", "Payment arrangement current", {
        f: { taxPosition: "Payment arrangement current" },
        docs: ["doc-atoarrangement"],
        find: ["fnd-tax-arrangement"],
        ask: ["taxBalance"],
      }),
      o("overdue", "Amount overdue, no arrangement", {
        f: { taxPosition: "Amount overdue with no arrangement" },
        docs: ["doc-ato"],
        find: ["fnd-tax-arrears"],
        ask: ["taxBalance"],
      }),
      o("disputed", "Liability disputed", {
        f: { taxPosition: "Liability disputed" },
        docs: ["doc-taxdispute"],
        find: ["fnd-tax-dispute"],
        ask: ["taxBalance"],
      }),
      o("unconfirmed", "Not confirmed", {
        f: { taxPosition: "Not confirmed" },
        docs: ["doc-ato"],
        find: ["fnd-tax-unconfirmed"],
      }),
    ],
  ),
);

add(
  Q(
    "B06",
    "Business profile",
    "findings",
    "Are there any current or threatened disputes, defaults or insolvency events?",
    "single",
    [
      o("none", "None known", {
        f: { adverse: "None known — broker-provided statement" },
      }),
      o("past", "Past issue, resolved", {
        f: { adverse: "Past issue, resolved" },
        docs: ["doc-adverse"],
        find: ["fnd-adverse-historical"],
      }),
      o("current", "Current dispute or default", {
        f: { adverse: "Current dispute or default" },
        docs: ["doc-adverse"],
        find: ["fnd-adverse-current"],
        ask: ["adverseDetail"],
      }),
      o(
        "insolvency",
        "Insolvency appointment, application or serious concern",
        {
          f: {
            adverse: "Insolvency appointment, application or serious concern",
          },
          find: ["fnd-insolvency"],
        },
      ),
      o("unconfirmed", "Not confirmed", {
        f: { adverse: "Not confirmed" },
        find: ["fnd-adverse-unconfirmed"],
      }),
    ],
  ),
);

// ---- E. Financial information and repayment
add(
  Q(
    "F01",
    "Financial position",
    "financials",
    "What financial information is available?",
    "multi",
    [
      o("financials", "Two years signed financials", {
        docs: ["doc-financials"],
        docStatus: { "doc-financials": "Obtained" },
      }),
      o("taxreturns", "Two years tax returns", {
        docs: ["doc-taxreturns"],
        docStatus: { "doc-taxreturns": "Obtained" },
      }),
      o("mgmt", "Current management accounts", {
        docs: ["doc-mgmt"],
        docStatus: { "doc-mgmt": "Obtained" },
      }),
      o("bank", "Bank statements", {
        docs: ["doc-bank"],
        docStatus: { "doc-bank": "Obtained" },
      }),
      o("forecasts", "Forecasts", {
        docs: ["doc-forecast"],
        docStatus: { "doc-forecast": "Obtained" },
      }),
      o("debtsched", "Debt schedule", {
        docs: ["doc-debtsched"],
        docStatus: { "doc-debtsched": "Obtained" },
      }),
      o("none", "None yet", { exclusive: true, find: ["fnd-nofinancials"] }),
    ],
    {
      fields: [
        {
          k: "rev1",
          label: "Revenue — most recent completed year",
          type: "money",
        },
        { k: "rev2", label: "Revenue — prior year", type: "money" },
        { k: "ytd", label: "Current year-to-date revenue", type: "money" },
        {
          k: "ebitdaReported",
          label: "Reported EBITDA or operating profit",
          type: "money",
        },
        {
          k: "existingDebt",
          label: "Existing annual business debt commitments",
          type: "money",
        },
      ],
      why: "Each item is added to the evidence register with its review status so the basis of the assessment stays visible.",
    },
  ),
);

add(
  Q(
    "F02",
    "Financial position",
    "financials",
    "Are any normalisation adjustments proposed to the reported result?",
    "single",
    [
      o("no", "No", {
        f: { adjustmentBasis: "None — calculated from the reported result" },
      }),
      o("obtained", "Yes — evidence obtained", {
        f: {
          adjustmentBasis:
            "Adjustments proposed, evidence obtained — supported pending broker review",
        },
      }),
      o("requested", "Yes — evidence requested", {
        f: {
          adjustmentBasis:
            "Adjustments proposed, evidence requested — excluded from the primary DSCR",
        },
        find: ["fnd-adj-requested"],
      }),
      o("noevidence", "Yes — no evidence identified", {
        f: {
          adjustmentBasis:
            "Adjustments proposed with no evidence identified — excluded from the primary DSCR",
        },
        find: ["fnd-adj-unsupported"],
      }),
      o("unsure", "Unsure", {
        f: {
          adjustmentBasis:
            "Unclear — reported and provisional adjusted figures shown separately",
        },
        find: ["fnd-adj-unsure"],
      }),
    ],
  ),
);

add(
  Q(
    "F02A",
    "Financial position",
    "financials",
    "Record each proposed adjustment.",
    "single",
    [
      o("record", "Record this adjustment", { f: {}, stay: true }),
      o("skip", "No further adjustments", {}),
    ],
    {
      fields: [
        { k: "adjLabel", label: "Adjustment", type: "text" },
        { k: "adjAmount", label: "Amount", type: "money" },
        { k: "adjPeriod", label: "Financial period", type: "text" },
        { k: "adjReason", label: "Reason", type: "text" },
        {
          k: "adjRecurring",
          label: "Recurring or non-recurring",
          type: "text",
        },
        { k: "adjEvidence", label: "Evidence status", type: "text" },
      ],
    },
  ),
);

add(
  Q(
    "F03",
    "Financial position",
    "financials",
    "What is the primary repayment source?",
    "single",
    [
      o("cashflow", "Operating cash flow", {
        f: { repaymentSource: "Operating cash flow" },
      }),
      o("lease", "Contracted lease income", {
        f: { repaymentSource: "Contracted lease income" },
        docs: ["doc-leaseevidence"],
        find: ["fnd-lease-income"],
      }),
      o("assetsale", "Asset sale", {
        f: { repaymentSource: "Asset sale" },
        docs: ["doc-assetsale"],
        find: ["fnd-exit-asset"],
      }),
      o("refinance", "Refinance at maturity", {
        f: { repaymentSource: "Refinance at maturity" },
        docs: ["doc-refiassump"],
        find: ["fnd-exit-refi"],
      }),
      o("capital", "Capital injection", {
        f: { repaymentSource: "Capital injection" },
        docs: ["doc-capital"],
        find: ["fnd-thirdparty-funding"],
      }),
      o("mixed", "Mixed sources", {
        f: { repaymentSource: "Mixed sources — allocation recorded" },
        ask: ["repaymentAllocation"],
      }),
    ],
  ),
);

add(
  Q(
    "F04",
    "Financial position",
    "financials",
    "What is the secondary repayment or exit strategy?",
    "single",
    [
      o("term", "Repay over the contracted term", {
        f: {
          exitStrategy:
            "Repay over the contracted term — no separate exit reliance",
        },
      }),
      o("sellproperty", "Sale of the commercial property or asset", {
        f: { exitStrategy: "Sale of the property or asset" },
        docs: ["doc-assetsale"],
        find: ["fnd-exit-asset"],
      }),
      o("refinance", "Refinance", {
        f: { exitStrategy: "Refinance" },
        docs: ["doc-refiassump"],
        find: ["fnd-exit-refi"],
      }),
      o("sellbusiness", "Sale of the business", {
        f: { exitStrategy: "Sale of the business" },
        docs: ["doc-assetsale"],
        find: ["fnd-exit-asset"],
      }),
      o("guarantor", "Guarantor support or capital injection", {
        f: { exitStrategy: "Guarantor support or capital injection" },
        docs: ["doc-guarantorcapacity"],
        find: ["fnd-thirdparty-funding"],
      }),
      o("other", "Other", {
        f: { exitStrategy: "Other — described by broker" },
        other: true,
      }),
      o("none", "No credible strategy recorded", {
        f: { exitStrategy: "None recorded" },
        find: ["fnd-exit-none"],
      }),
    ],
  ),
);

// ---- F. Property and security
add(
  Q(
    "S01",
    "Security and property",
    "security",
    "How will the property be occupied?",
    "single",
    [
      o("owner", "Entirely owner-occupied", {
        f: { occupancy: "100% business occupancy" },
      }),
      o("mainlyowner", "Mainly owner-occupied with a third-party tenant", {
        f: { occupancy: "Mainly owner-occupied with a third-party tenant" },
        find: ["fnd-occupancy-thirdparty"],
      }),
      o("investment", "Mainly or fully investment or leased", {
        f: { occupancy: "Mainly or fully leased" },
        find: ["fnd-occupancy-investment"],
      }),
      o("vacant", "Vacant at settlement", {
        f: { occupancy: "Vacant at settlement" },
        find: ["fnd-vacancy"],
        ask: ["occupationDate"],
      }),
      o("unconfirmed", "Not confirmed", {
        f: { occupancy: "Not confirmed" },
        find: ["fnd-occupancy-unknown"],
      }),
    ],
    {
      fields: [
        { k: "propertyAddress", label: "Property address", type: "text" },
      ],
    },
  ),
);

add(
  Q(
    "S01A",
    "Security and property",
    "security",
    "What is the third-party occupancy status?",
    "single",
    [
      o("signed", "Signed lease", {
        f: {
          tenantStatus: "Signed lease",
          rentTreatment: "Verified rent included only after review",
        },
        docs: ["doc-leaseevidence"],
      }),
      o("heads", "Heads of agreement", {
        f: {
          tenantStatus: "Heads of agreement",
          rentTreatment: "Income shown as unverified",
        },
        docs: ["doc-lease-radiology"],
        docStatus: { "doc-lease-radiology": "Obtained" },
      }),
      o("proposed", "Proposed — document requested", {
        f: {
          tenantStatus: "Proposed — heads of agreement requested",
          rentTreatment: "Excluded from serviceability until verified",
        },
        docs: ["doc-lease-radiology"],
        docStatus: { "doc-lease-radiology": "Requires clarification" },
        find: ["fnd-occupancy-thirdparty-resolved"],
        clears: ["fnd-occupancy-thirdparty"],
      }),
      o("informal", "Informal arrangement", {
        f: {
          tenantStatus: "Informal arrangement",
          rentTreatment: "Excluded from serviceability",
        },
        find: ["fnd-occupancy-informal"],
        clears: ["fnd-occupancy-thirdparty"],
      }),
      o("notenant", "Tenant not identified", {
        f: {
          tenantStatus: "Tenant not identified",
          rentTreatment: "Income excluded",
        },
        find: ["fnd-occupancy-notenant"],
        clears: ["fnd-occupancy-thirdparty"],
      }),
    ],
    {
      fields: [
        { k: "tenantName", label: "Proposed tenant", type: "text" },
        {
          k: "tenantArea",
          label: "Approximate area (% of net lettable area)",
          type: "num",
        },
        { k: "tenantTerm", label: "Proposed lease term", type: "text" },
        { k: "tenantRent", label: "Proposed annual rent", type: "money" },
      ],
    },
  ),
);

add(
  Q(
    "S02",
    "Security and property",
    "security",
    "What supports the current property value?",
    "single",
    [
      o("contract", "Signed purchase contract", {
        f: {
          valueBasis:
            "Signed purchase contract — a transaction figure, not a formal valuation",
        },
        docs: ["doc-val"],
      }),
      o("valuation", "Independent valuation less than 90 days old", {
        f: {
          valueBasis:
            "Independent valuation under 90 days old — subject to lender acceptance",
        },
        ask: ["valuerDetail"],
      }),
      o("appraisal", "Agent appraisal or market estimate", {
        f: { valueBasis: "Agent appraisal — unverified estimate" },
        docs: ["doc-val"],
        find: ["fnd-value-unverified"],
      }),
      o("client", "Client estimate", {
        f: { valueBasis: "Client-provided and unverified" },
        docs: ["doc-val"],
        find: ["fnd-value-unverified"],
      }),
      o("stale", "Older valuation", {
        f: { valueBasis: "Stale valuation" },
        docs: ["doc-val"],
        find: ["fnd-value-stale"],
      }),
      o("none", "No value evidence", {
        f: { valueBasis: "No value evidence recorded" },
        docs: ["doc-val"],
        find: ["fnd-value-none"],
      }),
    ],
  ),
);

add(
  Q(
    "S03",
    "Security and property",
    "security",
    "Are existing mortgages, caveats or other encumbrances known?",
    "single",
    [
      o("none", "None known", {
        f: { encumbrances: "None known — subject to title search" },
        docs: ["doc-title"],
      }),
      o("mortgage", "Existing mortgage", {
        f: { encumbrances: "Existing mortgage" },
        docs: ["doc-payout", "doc-title"],
        ask: ["payoutDetail"],
      }),
      o("other", "Other encumbrance", {
        f: { encumbrances: "Other encumbrance recorded" },
        docs: ["doc-title"],
        find: ["fnd-priority"],
        other: true,
      }),
      o("unconfirmed", "Not confirmed", {
        f: { encumbrances: "Not confirmed" },
        docs: ["doc-title"],
        find: ["fnd-title-unconfirmed"],
      }),
    ],
  ),
);

add(
  Q(
    "S04",
    "Security and property",
    "security",
    "Any known environmental, zoning, planning or specialised-property matters?",
    "single",
    [
      o("none", "None known", {
        f: { propertyMatters: "None known — client and broker statement" },
      }),
      o("issue", "Issue identified", {
        f: { propertyMatters: "Issue identified" },
        docs: ["doc-propertydd"],
        find: ["fnd-propertydd"],
        other: true,
      }),
      o("specialised", "Specialised property", {
        f: { propertyMatters: "Specialised property use recorded" },
        docs: ["doc-val"],
        find: ["fnd-specialised"],
        other: true,
      }),
      o("unconfirmed", "Not confirmed", {
        f: { propertyMatters: "Not confirmed" },
        docs: ["doc-propertydd"],
        find: ["fnd-propertydd-unconfirmed"],
      }),
    ],
  ),
);

// ---- G. Specialist modules
add(
  Q(
    "A01",
    "Business acquisition",
    "request",
    "Is this an asset purchase or a share purchase?",
    "single",
    [
      o("asset", "Asset purchase", {
        f: { acqType: "Asset purchase" },
        docs: ["doc-saleagreement", "doc-usefunds"],
      }),
      o("share", "Share purchase", {
        f: { acqType: "Share purchase" },
        docs: ["doc-saleagreement", "doc-dd"],
      }),
    ],
  ),
);
add(
  Q(
    "A02",
    "Business acquisition",
    "request",
    "What components are being funded?",
    "multi",
    [
      o("tangible", "Tangible assets", { docs: ["doc-usefunds"] }),
      o("goodwill", "Goodwill", { docs: ["doc-usefunds"] }),
      o("stock", "Stock", { docs: ["doc-usefunds"] }),
      o("workingcap", "Working capital", { docs: ["doc-cashflow"] }),
      o("fees", "Fees", { docs: ["doc-usefunds"] }),
      o("vendorfinance", "Vendor finance", { docs: ["doc-vendorfinance"] }),
      o("other", "Other", { other: true, docs: ["doc-usefunds"] }),
    ],
  ),
);
add(
  Q(
    "A03",
    "Business acquisition",
    "request",
    "Is vendor finance proposed?",
    "single",
    [
      o("none", "None", { f: { vendorFinance: "None" } }),
      o("subordinated", "Yes — subordinated to bank debt", {
        f: { vendorFinance: "Subordinated to bank debt" },
        docs: ["doc-vendorfinance"],
      }),
      o("alongside", "Yes — repayable alongside bank debt", {
        f: { vendorFinance: "Repayable alongside bank debt" },
        docs: ["doc-vendorfinance"],
        find: ["fnd-acq-structure"],
      }),
      o("unknown", "Terms unknown", {
        f: { vendorFinance: "Terms unknown" },
        docs: ["doc-vendorfinance"],
        find: ["fnd-acq-structure"],
      }),
    ],
  ),
);
add(
  Q(
    "A04",
    "Business acquisition",
    "business",
    "What management experience does the buyer bring?",
    "single",
    [
      o("operator", "Existing operator", {
        f: { acqExperience: "Existing operator" },
      }),
      o("industry", "Relevant industry experience", {
        f: { acqExperience: "Relevant industry experience" },
        docs: ["doc-experience"],
      }),
      o("new", "New to the industry", {
        f: { acqExperience: "New to the industry" },
        docs: ["doc-experience"],
        find: ["fnd-acq-experience"],
      }),
      o("retained", "Management team retained", {
        f: { acqExperience: "Management team retained" },
        docs: ["doc-experience"],
      }),
    ],
  ),
);
add(
  Q(
    "A05",
    "Business acquisition",
    "findings",
    "What is the due-diligence status?",
    "single",
    [
      o("complete", "Complete", {
        f: { acqDD: "Complete" },
        docs: ["doc-dd"],
        docStatus: { "doc-dd": "Obtained" },
      }),
      o("underway", "Underway", {
        f: { acqDD: "Underway" },
        docs: ["doc-dd"],
        docStatus: { "doc-dd": "Requested" },
        prog: "COND",
      }),
      o("notstarted", "Not started", {
        f: { acqDD: "Not started" },
        docs: ["doc-dd"],
        find: ["fnd-acq-dd"],
      }),
      o("waived", "Waived", { f: { acqDD: "Waived" }, find: ["fnd-acq-dd"] }),
    ],
  ),
);

add(
  Q(
    "D01",
    "Development and construction",
    "request",
    "What type of project is proposed?",
    "single",
    [
      o("ownerbuild", "Owner-occupied build", {
        f: { devType: "Owner-occupied build" },
      }),
      o("investment", "Investment development", {
        f: { devType: "Investment development" },
      }),
      o("subdivision", "Land subdivision", {
        f: { devType: "Land subdivision" },
      }),
      o("refurb", "Refurbishment", { f: { devType: "Refurbishment" } }),
      o("other", "Other", {
        f: { devType: "Other — described by broker" },
        other: true,
      }),
    ],
  ),
);
add(
  Q(
    "D02",
    "Development and construction",
    "security",
    "What is the planning status?",
    "single",
    [
      o("approved", "Approved", {
        f: { devPlanning: "Approved" },
        docs: ["doc-approvals"],
        docStatus: { "doc-approvals": "Obtained" },
      }),
      o("submitted", "Submitted", {
        f: { devPlanning: "Submitted, not approved" },
        docs: ["doc-approvals"],
        find: ["fnd-dev-planning"],
      }),
      o("preapp", "Pre-application", {
        f: { devPlanning: "Pre-application" },
        docs: ["doc-approvals"],
        find: ["fnd-dev-planning"],
      }),
      o("notcommenced", "Not commenced", {
        f: { devPlanning: "Not commenced" },
        docs: ["doc-approvals"],
        find: ["fnd-dev-planning"],
      }),
    ],
  ),
);
add(
  Q(
    "D03",
    "Development and construction",
    "security",
    "Who is delivering the build?",
    "single",
    [
      o("fixed", "Fixed-price licensed builder", {
        f: { devBuilder: "Fixed-price licensed builder" },
        docs: ["doc-builder"],
      }),
      o("costplus", "Cost-plus", {
        f: { devBuilder: "Cost-plus" },
        docs: ["doc-builder"],
        find: ["fnd-dev-builder"],
      }),
      o("owner", "Owner-builder", {
        f: { devBuilder: "Owner-builder" },
        docs: ["doc-builder"],
        find: ["fnd-dev-builder"],
      }),
      o("notappointed", "Not appointed", {
        f: { devBuilder: "Not appointed" },
        docs: ["doc-builder"],
        find: ["fnd-dev-builder"],
      }),
    ],
  ),
);
add(
  Q(
    "D04",
    "Development and construction",
    "request",
    "What cost evidence is available?",
    "single",
    [
      o("qs", "Quantity surveyor report", {
        f: { devCosts: "QS report" },
        docs: ["doc-devcosts"],
        docStatus: { "doc-devcosts": "Obtained" },
      }),
      o("fixedcontract", "Fixed-price contract", {
        f: { devCosts: "Fixed-price contract" },
        docs: ["doc-devcosts"],
        docStatus: { "doc-devcosts": "Obtained" },
      }),
      o("budget", "Detailed budget only", {
        f: { devCosts: "Detailed budget only" },
        docs: ["doc-devcosts"],
        prog: "COND",
      }),
      o("preliminary", "Preliminary estimate", {
        f: { devCosts: "Preliminary estimate" },
        docs: ["doc-devcosts"],
        find: ["fnd-dev-costs"],
      }),
    ],
  ),
);
add(
  Q(
    "D05",
    "Development and construction",
    "security",
    "What is the pre-sale or pre-lease position?",
    "single",
    [
      o("na", "Not applicable", { f: { devPresales: "Not applicable" } }),
      o("achieved", "Achieved", {
        f: { devPresales: "Achieved" },
        docs: ["doc-contracts"],
      }),
      o("partly", "Partly achieved", {
        f: { devPresales: "Partly achieved" },
        docs: ["doc-contracts"],
      }),
      o("none", "None", { f: { devPresales: "None" } }),
      o("unknown", "Unknown", {
        f: { devPresales: "Unknown" },
        find: ["fnd-unsure-generic"],
      }),
    ],
  ),
);
add(
  Q(
    "D06",
    "Development and construction",
    "financials",
    "Has a contingency allowance been recorded?",
    "single",
    [
      o("recorded", "Yes — recorded", {
        f: { devContingency: "Recorded" },
        docs: ["doc-feasibility"],
        fieldsRequired: true,
      }),
      o("notrecorded", "Not recorded", {
        f: { devContingency: "Not recorded" },
        docs: ["doc-feasibility"],
        find: ["fnd-dev-contingency"],
      }),
    ],
    {
      fields: [
        {
          k: "devContingencyAmount",
          label: "Contingency amount or percentage",
          type: "text",
        },
      ],
    },
  ),
);

add(
  Q(
    "E01",
    "Equipment finance",
    "security",
    "What type of asset is being financed?",
    "single",
    [
      o("vehicle", "Vehicle", { f: { assetType: "Vehicle" } }),
      o("plant", "Plant or equipment", {
        f: { assetType: "Plant or equipment" },
      }),
      o("tech", "Technology", { f: { assetType: "Technology" } }),
      o("fitout", "Fit-out", { f: { assetType: "Fit-out" } }),
      o("other", "Other", {
        f: { assetType: "Other — described by broker" },
        other: true,
      }),
    ],
  ),
);
add(
  Q(
    "E02",
    "Equipment finance",
    "security",
    "Is the asset new or used?",
    "single",
    [
      o("new", "New from a supplier", {
        f: { assetCondition: "New from a supplier" },
        docs: ["doc-quote"],
      }),
      o("used", "Used from a dealer", {
        f: { assetCondition: "Used from a dealer" },
        docs: ["doc-quote"],
        find: ["fnd-equip-used"],
      }),
      o("private", "Private sale", {
        f: { assetCondition: "Private sale" },
        docs: ["doc-quote"],
        find: ["fnd-equip-used"],
      }),
    ],
    {
      fields: [
        { k: "assetSupplier", label: "Supplier and asset age", type: "text" },
      ],
    },
  ),
);
add(
  Q(
    "E03",
    "Equipment finance",
    "request",
    "How does the asset\u2019s economic life compare with the requested term?",
    "single",
    [
      o("suitable", "Suitable on face", {
        f: { assetLife: "Suitable on face" },
        docs: ["doc-assetlife"],
      }),
      o("exceeds", "Term may exceed useful life", {
        f: { assetLife: "Term may exceed useful life" },
        docs: ["doc-assetlife"],
        find: ["fnd-equip-term"],
      }),
      o("notassessed", "Not assessed", {
        f: { assetLife: "Not assessed" },
        docs: ["doc-assetlife"],
        find: ["fnd-equip-term"],
      }),
    ],
  ),
);

add(
  Q(
    "WC01",
    "Working capital",
    "request",
    "What is driving the working-capital need?",
    "single",
    [
      o("seasonal", "Seasonal", { f: { wcNeed: "Seasonal" } }),
      o("growth", "Growth", { f: { wcNeed: "Growth" } }),
      o("timing", "Timing gap", { f: { wcNeed: "Timing gap" } }),
      o("oneoff", "One-off expense", { f: { wcNeed: "One-off expense" } }),
      o("tax", "Tax", { f: { wcNeed: "Tax" } }),
      o("loss", "Loss funding", {
        f: { wcNeed: "Loss funding" },
        prog: "COND",
      }),
      o("other", "Other", {
        f: { wcNeed: "Other — described by broker" },
        other: true,
      }),
    ],
    { docs: ["doc-usefunds", "doc-cashflow"] },
  ),
);
add(
  Q(
    "WC02",
    "Working capital",
    "request",
    "What facility pattern suits the need?",
    "single",
    [
      o("term", "One-off term amount", {
        f: { wcFacility: "One-off term amount" },
      }),
      o("revolving", "Revolving limit", {
        f: { wcFacility: "Revolving limit" },
        find: ["fnd-revolving"],
      }),
      o("overdraft", "Overdraft", {
        f: { wcFacility: "Overdraft" },
        find: ["fnd-revolving"],
      }),
      o("uncertain", "Uncertain", {
        f: { wcFacility: "Uncertain" },
        find: ["fnd-unsure-generic"],
      }),
    ],
  ),
);
add(
  Q(
    "WC03",
    "Working capital",
    "financials",
    "What is the repayment source and timeframe?",
    "single",
    [
      o("cycle", "Operating cycle", { f: { wcRepayment: "Operating cycle" } }),
      o("contract", "Contract receipts", {
        f: { wcRepayment: "Contract receipts" },
        docs: ["doc-contracts"],
      }),
      o("assetsale", "Asset sale", {
        f: { wcRepayment: "Asset sale" },
        docs: ["doc-assetsale"],
        find: ["fnd-exit-asset"],
      }),
      o("refinance", "Refinance", {
        f: { wcRepayment: "Refinance" },
        docs: ["doc-refiassump"],
        find: ["fnd-exit-refi"],
      }),
      o("unclear", "Not clear", {
        f: { wcRepayment: "Not clear" },
        find: ["fnd-wc-unclear"],
      }),
    ],
  ),
);

add(
  Q(
    "IF01",
    "Invoice finance",
    "financials",
    "Have ledger size and ageing been captured?",
    "single",
    [
      o("captured", "Captured", {
        f: { ifLedger: "Captured" },
        docs: ["doc-debtorledger"],
        docStatus: { "doc-debtorledger": "Obtained" },
      }),
      o("notcaptured", "Not captured", {
        f: { ifLedger: "Not captured" },
        docs: ["doc-debtorledger"],
        find: ["fnd-if-ledger"],
      }),
    ],
    { find: ["fnd-if-noproduct"] },
  ),
);
add(
  Q(
    "IF02",
    "Invoice finance",
    "financials",
    "What is the customer concentration in the ledger?",
    "single",
    [
      o("u20", "Under 20%", { f: { ifConcentration: "Under 20%" } }),
      o("20to40", "20% to 40%", {
        f: { ifConcentration: "20% to 40%" },
        docs: ["doc-debtorledger"],
      }),
      o("o40", "Over 40%", {
        f: { ifConcentration: "Over 40%" },
        docs: ["doc-debtorledger"],
        find: ["fnd-if-concentration"],
      }),
      o("unknown", "Unknown", {
        f: { ifConcentration: "Unknown" },
        docs: ["doc-debtorledger"],
        find: ["fnd-if-concentration"],
      }),
    ],
  ),
);
add(
  Q(
    "IF03",
    "Invoice finance",
    "financials",
    "Are there disputes, contra arrangements or progress claims?",
    "single",
    [
      o("none", "None", { f: { ifQuality: "None disclosed" } }),
      o("present", "Present", {
        f: { ifQuality: "Present" },
        find: ["fnd-if-disputes"],
      }),
      o("unknown", "Unknown", {
        f: { ifQuality: "Unknown" },
        find: ["fnd-if-disputes"],
      }),
    ],
  ),
);

// ---- H. Needs, comparison, recommendation and client choice
add(
  Q(
    "N01",
    "Needs and objectives",
    "needs",
    "Select the client\u2019s three highest priorities, then rank them 1 to 3.",
    "rank3",
    [
      o("certainty", "Certainty of funding"),
      o("speed", "Speed to settlement"),
      o("cost", "Lowest total cost"),
      o("flexibility", "Repayment flexibility"),
      o("extra", "Extra repayments"),
      o("workingcap", "Preserve working capital"),
      o("covenant", "Covenant flexibility"),
      o("security", "Minimise additional security or guarantees"),
      o("relationship", "Relationship banking"),
      o("digital", "Digital and transaction facilities"),
      o("future", "Future borrowing capacity"),
    ],
    {
      why: "The ranking is applied visibly to the comparison so the reasoning is not driven by rate alone.",
    },
  ),
);

add(
  Q(
    "N02",
    "Needs and objectives",
    "needs",
    "Which trade-offs has the client said they may accept?",
    "multi",
    [
      o("price", "Higher price for certainty or speed", {
        find: ["fnd-tradeoff-price"],
      }),
      o("security", "Additional security or guarantees", {
        find: ["fnd-tradeoff-security"],
      }),
      o("buffer", "Lower initial working-capital buffer"),
      o("term", "Longer term for lower repayments", {
        find: ["fnd-tradeoff-term"],
      }),
      o("covenant", "Tighter covenants for lower price", {
        find: ["fnd-tradeoff-covenant"],
        other: true,
      }),
      o("none", "No material trade-off accepted", {
        exclusive: true,
        find: ["fnd-needs-conflict"],
      }),
      o("other", "Other", { other: true }),
    ],
  ),
);

add(
  Q(
    "N03",
    "Lender comparison",
    "comparison",
    "Are the key facts ready for an indicative lender comparison?",
    "gate",
    [
      o("compare", "Compare lenders"),
      o("review", "Review information required"),
      o("continue", "Continue gathering information"),
    ],
  ),
);

add(
  Q(
    "L01",
    "Lender comparison",
    "comparison",
    "What would you like to do with the shortlist?",
    "actions",
    [
      o("review", "Review full comparison"),
      o("adjust", "Adjust assumptions"),
      o("exclude", "Exclude an option"),
      o("addoption", "Add another option"),
      o("continue", "Continue to the recommendation"),
    ],
  ),
);

add(
  Q(
    "L02",
    "Recommendation",
    "recommendation",
    "Record your proposed recommendation for this client.",
    "products",
    [
      o("PROD-ANZ-BL", "Recommend ANZ Business Loan (secured)"),
      o("PROD-CBA-BBL", "Recommend CommBank BetterBusiness Loan (secured)"),
      o("PROD-NAB-BOL", "Recommend NAB Business Options Loan"),
      o("PROD-WBC-BBBL", "Recommend Westpac Bank Bill Business Loan"),
      o("manual", "Recommend a manually added option"),
      o("none", "No recommendation yet", { stay: true }),
    ],
    {
      why: "Mortgage Intelligence prepares a draft. The recommendation remains the broker\u2019s.",
    },
  ),
);

add(
  Q(
    "L03",
    "Recommendation",
    "recommendation",
    "Confirm your rationale.",
    "actions",
    [
      o("confirm", "Confirm rationale"),
      o("edit", "Edit rationale"),
      o("another", "Choose another product"),
      o("more", "More information required"),
    ],
  ),
);

add(
  Q(
    "L04",
    "Client discussion",
    "recommendation",
    "What was the client\u2019s response after you presented the material options?",
    "single",
    [
      o("recommended", "Selected the recommended option"),
      o("different", "Selected a different compared option", {
        ask: ["clientChoiceNote"],
      }),
      o("moreinfo", "Asked for more information", { stay: true }),
      o("deferred", "Deferred the decision", {
        stay: true,
        ask: ["followUpDate"],
      }),
      o("declined", "Declined to proceed", {
        halt: "Closed — client did not proceed",
      }),
    ],
  ),
);

add(
  Q(
    "L05",
    "Client discussion",
    "recommendation",
    "How was the client discussion conducted?",
    "multi",
    [
      o("meeting", "Meeting"),
      o("video", "Video call"),
      o("phone", "Phone"),
      o("email", "Email", { docs: ["doc-email"] }),
      o("other", "Other", { other: true }),
    ],
    {
      fields: [
        { k: "discussionDate", label: "Date of discussion", type: "text" },
        { k: "discussionParticipants", label: "Participants", type: "text" },
        { k: "discussionRecord", label: "Discussion record", type: "text" },
        {
          k: "clientQuestions",
          label: "Questions raised by the client",
          type: "text",
        },
      ],
    },
  ),
);

add(
  Q(
    "L06",
    "Client discussion",
    "recommendation",
    "Is the selected product still consistent with the recorded purpose, priorities and latest application facts?",
    "single",
    [
      o("yes", "Yes — broker confirmed", {
        f: { choiceStatus: "Client choice recorded" },
      }),
      o("conditions", "Yes, subject to outstanding policy and document items", {
        f: { choiceStatus: "Client choice recorded with conditions" },
      }),
      o("no", "No — facts changed", {
        f: { choiceStatus: "Needs reconfirmation" },
        find: ["fnd-choice-reconfirm"],
      }),
      o("unsure", "Unsure", {
        f: { choiceStatus: "Broker review required" },
        find: ["fnd-broker-review"],
      }),
    ],
  ),
);

export interface Confirmation {
  readonly id: string;
  readonly label: string;
}

/**
 * Broker confirmations required before an application can be finalised. Each is
 * an assertion the broker makes personally; nothing here is ticked by the system.
 */
export const CONFIRMATIONS: readonly Confirmation[] = [
  {
    id: "cnf-info",
    label: "I have reviewed the captured client and transaction information.",
  },
  {
    id: "cnf-purpose",
    label:
      "I have confirmed the stated loan purpose and considered whether consumer-credit obligations may apply.",
  },
  {
    id: "cnf-financial",
    label:
      "I have reviewed the financial inputs, assumptions and verification status.",
  },
  {
    id: "cnf-options",
    label:
      "I have considered the available lender and product options shown and verified that pricing is indicative only.",
  },
  {
    id: "cnf-rationale",
    label:
      "I have reviewed the proposed recommendation and recorded my own rationale.",
  },
  {
    id: "cnf-client",
    label:
      "I have discussed the material options and trade-offs with the client and accurately recorded their choice.",
  },
  {
    id: "cnf-outstanding",
    label:
      "I have identified outstanding documents, policy questions and specialist advice required.",
  },
  {
    id: "cnf-judgement",
    label:
      "I understand that Mortgage Intelligence assists the process but does not provide legal advice or replace my judgement.",
  },
];

/**
 * Answers that change a material fact. Re-answering one clears the broker
 * confirmations, because a confirmation given against different information is
 * not a confirmation of what is now on file.
 */
export const MATERIAL_QUESTIONS: readonly string[] = [
  "C01",
  "C02",
  "C02A",
  "C03",
  "C04",
  "P01",
  "P02",
  "P02A",
  "P03",
  "P04",
  "P04A",
  "T01",
  "T04",
  "T05",
  "F01",
  "F02",
  "F03",
  "S01",
  "S01A",
  "S02",
  "N01",
  "L02",
  "L04",
  "L06",
];

/**
 * What a check reads. Declared structurally so the checklists do not depend on
 * the whole engine, and so the engine's state shape can change independently.
 */
export interface CheckContext {
  readonly fields: Readonly<Record<string, FieldValue | undefined>>;
  readonly docs: readonly { readonly id: string }[];
  readonly comparisonOpened: boolean;
  readonly recommendation: { readonly confirmed: boolean } | null;
  /** Null until the document analysis has run. */
  readonly analysis: unknown;
  readonly extracted: Readonly<Record<string, { readonly status: string }>>;
  readonly confirmations: Readonly<Record<string, unknown>>;
}

export interface Check {
  readonly id: string;
  readonly label: string;
  /** True when the item is satisfied. Never a compliance conclusion. */
  readonly need: (context: CheckContext) => boolean;
}

const text = (c: CheckContext, key: string): string => {
  const value = c.fields[key];
  return typeof value === "string" ? value : "";
};

const list = (c: CheckContext, key: string): readonly string[] => {
  const value = c.fields[key];
  return Array.isArray(value) ? value : [];
};

const present = (c: CheckContext, key: string): boolean => {
  const value = c.fields[key];
  return Array.isArray(value) ? value.length > 0 : !!value;
};

const authorityRecorded = (c: CheckContext): boolean =>
  text(c, "authorityStatus") === "Recorded" ||
  text(c, "authorityStatus") === "Pending evidence";

const identityRecorded = (c: CheckContext): boolean =>
  present(c, "entityType") && text(c, "clientStatus") !== "Not identified";

/**
 * Extraction states that count as dealt with: either the broker has accepted the
 * value, or it is explicitly parked for review. What is excluded is a value
 * still sitting unexamined.
 */
const RESOLVED_EXTRACTION_STATES = new Set([
  "broker_confirmed",
  "broker_edited",
  "requires_review",
  "heads_of_agreement_missing",
  "normalisation_evidence_required",
]);

const extractionReviewed = (c: CheckContext): boolean =>
  !c.analysis ||
  Object.values(c.extracted).every((e) =>
    RESOLVED_EXTRACTION_STATES.has(e.status),
  );

/** Continuous quality checks shown as a review panel. */
export const CHECKS: readonly Check[] = [
  {
    id: "chk-identity",
    label: "Client and entity identity recorded",
    need: identityRecorded,
  },
  {
    id: "chk-authority",
    label: "Authority, privacy notice and consent status recorded",
    need: authorityRecorded,
  },
  {
    id: "chk-purpose",
    label: "Loan purpose and intended use of funds recorded",
    need: (a) => present(a, "purposes"),
  },
  {
    id: "chk-consumer",
    label: "Possible consumer-credit or mixed-purpose issue considered",
    need: (a) => present(a, "purposeIndication"),
  },
  {
    id: "chk-needs",
    label:
      "Needs and objectives recorded in the client\u2019s own commercial context",
    need: (a) => list(a, "priorities").length === 3,
  },
  {
    id: "chk-source",
    label: "Financial information source and verification status visible",
    need: (a) => present(a, "evidenceAvailable"),
  },
  {
    id: "chk-capacity",
    label: "Repayment capacity and exit strategy recorded",
    need: (a) => present(a, "repaymentSource") && present(a, "exitStrategy"),
  },
  {
    id: "chk-security",
    label: "Security, guarantees and material risks identified",
    need: (a) => present(a, "security"),
  },
  {
    id: "chk-options",
    label: "Multiple lender and product options considered where available",
    need: (a) => a.comparisonOpened,
  },
  {
    id: "chk-panel",
    label: "Panel limitations, fees and potential conflicts visible",
    need: (a) => a.comparisonOpened,
  },
  {
    id: "chk-rationale",
    label: "Recommendation rationale recorded",
    need: (a) => !!a.recommendation?.confirmed,
  },
  {
    id: "chk-assumptions",
    label: "Material assumptions and uncertainties disclosed",
    need: (a) => a.comparisonOpened,
  },
  {
    id: "chk-docs",
    label: "Outstanding documents and actions visible",
    need: (a) => a.docs.length > 0,
  },
  {
    id: "chk-extraction",
    label:
      "Extracted values shown with their source document and reviewed by the broker",
    need: extractionReviewed,
  },
  {
    id: "chk-brokerconfirm",
    label: "Broker review and confirmation required before finalisation",
    need: (a) => Object.keys(a.confirmations).length === CONFIRMATIONS.length,
  },
];

/**
 * Minimum information required before product matching begins. An unmet gate
 * item means information is missing, not that the application is unsuitable.
 */
export const GATE: readonly Check[] = [
  {
    id: "g-entity",
    label: "Borrower and entity recorded",
    need: identityRecorded,
  },
  {
    id: "g-authority",
    label: "Authority and privacy status recorded",
    need: authorityRecorded,
  },
  {
    id: "g-purpose",
    label: "Loan purpose recorded",
    need: (a) => present(a, "purposes"),
  },
  {
    id: "g-classification",
    label: "Regulatory classification reviewed or not presently uncertain",
    need: (a) =>
      text(a, "purposeIndication") ===
        "Predominantly business-purpose commercial finance" ||
      present(a, "regTreatment"),
  },
  {
    id: "g-amount",
    label: "Requested amount and contribution recorded",
    need: (a) => present(a, "loanAmount") && present(a, "contribution"),
  },
  {
    id: "g-repayment",
    label: "Repayment source recorded",
    need: (a) => present(a, "repaymentSource"),
  },
  {
    id: "g-figures",
    label: "Core financial figures recorded",
    need: (a) => present(a, "rev1") && present(a, "ebitdaReported"),
  },
  {
    id: "g-extraction",
    label: "Extracted values reviewed by the broker",
    need: extractionReviewed,
  },
  {
    id: "g-security",
    label: "Proposed security recorded",
    need: (a) => present(a, "security"),
  },
  {
    id: "g-needs",
    label: "Needs and priorities recorded",
    need: (a) => list(a, "priorities").length === 3,
  },
];

export interface LenderChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly note: string;
}

/** Illustrative lender checklist. Every line is subject to confirmation. */
export const ANZ_LENDER_CHECKLIST: readonly LenderChecklistItem[] = [
  {
    id: "lc-id",
    label: "Borrower and guarantor identification",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-entity",
    label: "Entity information and company extract",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-financials",
    label: "Two years of financial statements",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-tax",
    label: "Two years of tax returns",
    status: "Requested from the client accountant",
    note: "Outstanding",
  },
  {
    id: "lc-bank",
    label: "Six months of business bank statements",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-liabilities",
    label: "Liabilities and debt schedule",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-contract",
    label: "Contract of sale",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-contrib",
    label: "Evidence of client contribution",
    status: "Requested from the client",
    note: "Outstanding",
  },
  {
    id: "lc-val",
    label: "Property valuation",
    status: "Required — lender instructed",
    note: "Policy confirmation required",
  },
  {
    id: "lc-consent",
    label: "Privacy and consent records",
    status: "Held in the internal evidence register",
    note: "Subject to lender confirmation",
  },
  {
    id: "lc-tenant",
    label: "Proposed tenant information",
    status: "Requires clarification",
    note: "Policy confirmation required",
  },
  {
    id: "lc-pricing",
    label: "Pricing and rate confirmation",
    status: "Not held",
    note: "Policy confirmation required",
  },
];

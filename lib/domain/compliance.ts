/**
 * Curated compliance review — findings anchored to specific passages in the
 * email archive, each citing the review rules and RG 273 paragraphs behind it.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2). These are structural, not stylistic:
 *  - The only assessment states are evidence found, potential gap and requires
 *    review. There is no compliant or non-compliant state to return.
 *  - Every finding carries its evidence. A finding whose anchor does not
 *    resolve to a message is a data error, not something to render.
 *  - Reviewer state is never set here. It is a human decision.
 *
 * Scope is a parameter on every read. The prototype held the permitted set in
 * module state and mutated it on identity change, so a read's result depended
 * on who had most recently switched identity.
 */

import {
  TRUTH,
  type RawFinding,
  type ReviewFramework,
  type ReviewState,
} from "@/lib/data/raw/compliance-truth.generated";
import { THREADS } from "@/lib/data/threads";
import type { DataScope } from "./identity";
import {
  FINDING_SEVERITY_ORDER,
  fileReference,
  type Application,
  type ApplicationId,
  type AssessmentState,
  type Confidence,
  type FileReference,
  type FindingSeverity,
  type Message,
  type Severity,
  type Thread,
  type ThreadId,
} from "./types";

// ---------------------------------------------------------------------------
// Fixed vocabulary
// ---------------------------------------------------------------------------

export const REVIEW_BANNER =
  "Automated evidence review. Human assessment required.";

export const SOURCE_SCOPE =
  "Results are based on the email archive currently available. Relevant evidence may exist in other connected systems.";

/** When the curated email archive was last analysed. Indicative prototype date. */
export const ANALYSIS_DATE = "30 July 2026, 9:12 AM AEST";

export interface ReviewRule {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  /** Regulatory guidance paragraphs this rule draws on. */
  readonly rg: readonly string[];
}

const rule = (
  id: string,
  name: string,
  category: string,
  rg: readonly string[],
): ReviewRule => ({ id, name, category, rg });

export const RULES: Readonly<Record<string, ReviewRule>> = {
  "RES-01": rule(
    "RES-01",
    "Needs and objectives captured",
    "Evidence and record quality",
    ["RG 273.30–273.39", "RG 273.44–273.48"],
  ),
  "RES-02": rule(
    "RES-02",
    "Financial circumstances and commitments",
    "Evidence and record quality",
    ["RG 273.30–273.43"],
  ),
  "RES-03": rule(
    "RES-03",
    "Change in circumstances handled",
    "Changed circumstances",
    ["RG 273.37–273.43"],
  ),
  "RES-04": rule(
    "RES-04",
    "Accurate and complete information",
    "Accuracy or concealment",
    ["RG 273.40–273.43", "RG 273.42"],
  ),
  "RES-05": rule(
    "RES-05",
    "Individual product assessment",
    "Product comparison and recommendation",
    ["RG 273.16–273.20", "RG 273.44–273.86"],
  ),
  "RES-06": rule(
    "RES-06",
    "Options and comparison",
    "Product comparison and recommendation",
    ["RG 273.20", "RG 273.87–273.104"],
  ),
  "RES-07": rule(
    "RES-07",
    "Costs, risks and trade-offs explained",
    "Costs, risks and client understanding",
    ["RG 273.48", "RG 273.87–273.104"],
  ),
  "RES-08": rule(
    "RES-08",
    "Informed instructions and authority",
    "Evidence and record quality",
    ["RG 273.33–273.34", "RG 273.162–273.172"],
  ),
  "RES-09": rule(
    "RES-09",
    "Conflicts and consumer priority",
    "Conflicts and consumer priority",
    ["RG 273.144–273.161"],
  ),
  "RES-10": rule(
    "RES-10",
    "Record and source quality",
    "Evidence and record quality",
    ["RG 273.21", "RG 273.162–273.172"],
  ),
  "RES-11": rule(
    "RES-11",
    "Professional boundaries and referral",
    "Evidence and record quality",
    ["RG 273.142–273.143"],
  ),
  "RES-12": rule(
    "RES-12",
    "Privacy and authorised disclosure",
    "Privacy and data handling",
    ["Privacy / internal policy"],
  ),
  "RES-13": rule(
    "RES-13",
    "Pressure, assurances and client understanding",
    "Costs, risks and client understanding",
    ["RG 273.33", "RG 273.87–273.104"],
  ),
  "RES-14": rule(
    "RES-14",
    "Heightened care for complex scenarios",
    "Costs, risks and client understanding",
    ["RG 273.39"],
  ),
};

export const CATEGORIES: readonly string[] = [
  "Accuracy or concealment",
  "Changed circumstances",
  "Product comparison and recommendation",
  "Costs, risks and client understanding",
  "Conflicts and consumer priority",
  "Privacy and data handling",
  "Evidence and record quality",
];

export const findRule = (id: string): ReviewRule | null => RULES[id] ?? null;

/**
 * When a finding cites several rules, this order decides which one titles it.
 * Privacy and accuracy outrank the rest so the most serious framing leads.
 */
const PRECEDENCE = ["RES-12", "RES-04", "RES-09", "RES-08", "RES-03", "RES-07"];

const primaryRuleOf = (ids: readonly string[]): string =>
  PRECEDENCE.find((p) => ids.includes(p)) ?? ids[0];

// ---------------------------------------------------------------------------
// Evidence resolution
// ---------------------------------------------------------------------------

/** Same normalisation as the email scanner, so anchors survive line wrapping. */
const flatten = (text: string): string =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const locate = (thread: Thread, anchor: string): number => {
  const needle = flatten(anchor);
  return thread.messages.findIndex((m) => flatten(m.body).includes(needle));
};

/** A passage of correspondence supporting a finding. */
export interface Evidence {
  readonly id: string;
  /** The verbatim fragment the finding was anchored to. */
  readonly anchor: string;
  /** Index of the containing message, for scroll-to-evidence. */
  readonly messageIndex: number;
  readonly message: Message;
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export interface Finding {
  readonly id: string;
  readonly reference: FileReference;
  readonly threadId: ThreadId;
  readonly applicationId: ApplicationId;
  readonly customer: string;
  readonly broker: string;
  readonly branch: string;
  readonly applicationType: string;
  readonly status: AssessmentState;
  readonly severity: FindingSeverity;
  readonly confidence: Confidence;
  readonly framework: ReviewFramework;
  readonly primaryRule: string;
  readonly primaryRuleName: string;
  readonly rules: readonly string[];
  readonly category: string;
  readonly categories: readonly string[];
  readonly headline: string;
  readonly explanation: string;
  readonly suggestedAction: string;
  readonly rgRefs: readonly string[];
  readonly evidence: readonly Evidence[];
  /** Filenames of supporting documents on file. */
  readonly documents: readonly string[];
}

export interface ReviewedApplication {
  readonly reference: FileReference;
  readonly threadId: ThreadId;
  readonly applicationId: ApplicationId;
  readonly customer: string;
  readonly broker: string;
  readonly branch: string;
  readonly applicationType: string;
  readonly state: ReviewState;
  /** Single-line summary. Never a compliance determination. */
  readonly headline: string;
  readonly highestSeverity: FindingSeverity;
  readonly findings: readonly Finding[];
  readonly reviewCount: number;
  readonly gapCount: number;
  readonly evidenceCount: number;
  readonly categories: readonly string[];
  readonly reviewCategories: readonly string[];
  /**
   * Share of the rules assessed on this file that evidence was found for.
   * Null when no rule was assessed — never silently zero, which would read as
   * an adverse result rather than an absence of data.
   */
  readonly coverage: number | null;
  readonly assessedRules: readonly string[];
  readonly affirmativeRules: readonly string[];
  readonly inProgress: boolean;
  readonly openCondition: boolean;
}

const headlineFor = (
  state: ReviewState,
  findings: readonly Finding[],
): string => {
  if (state === "CLEAR_OPEN_CONDITION") {
    return "No material concern identified in the analysed record — one lender condition remains open";
  }
  if (findings.some((f) => f.severity === "CRITICAL")) {
    return "Critical matter requires review";
  }
  if (findings.some((f) => f.severity === "HIGH")) {
    return "High-priority review required";
  }
  if (findings.some((f) => f.status === "REQUIRES_REVIEW")) {
    return "Review required";
  }
  if (findings.some((f) => f.status === "POTENTIAL_GAP")) {
    return "Potential evidence gaps";
  }
  return "No material concerns identified in analysed emails";
};

const highestSeverityOf = (findings: readonly Finding[]): FindingSeverity =>
  [...FINDING_SEVERITY_ORDER]
    .reverse()
    .find((s) => findings.some((f) => f.severity === s)) ?? "INFORMATIONAL";

const ratio = (part: number, whole: number): number | null =>
  whole ? Math.round((part / whole) * 100) : null;

function buildFinding(
  raw: RawFinding,
  reference: FileReference,
  thread: Thread,
): Finding {
  const primary = primaryRuleOf(raw.rules);
  const meta = findRule(primary);

  const evidence: Evidence[] = [];
  raw.ev.forEach((anchor, n) => {
    const messageIndex = locate(thread, anchor);
    // An unresolved anchor means the finding cites a passage that is not in the
    // archive. Dropping it keeps every rendered finding traceable; the test
    // suite asserts none are dropped, so this cannot pass unnoticed.
    if (messageIndex < 0) return;

    evidence.push({
      id: `${reference}-E${n + 1}`,
      anchor,
      messageIndex,
      message: thread.messages[messageIndex],
    });
  });

  const categories = [
    ...new Set(
      raw.rules
        .map((r) => findRule(r)?.category)
        .filter((c): c is string => !!c),
    ),
  ];

  return {
    id: `${reference}-${primary}-${raw.key}`,
    reference,
    threadId: thread.id,
    applicationId: thread.applicationId,
    customer: thread.customer,
    broker: thread.broker,
    branch: thread.branch,
    applicationType: thread.application,
    status: raw.status,
    severity: raw.severity,
    confidence: raw.confidence,
    framework: raw.framework,
    primaryRule: primary,
    primaryRuleName: meta?.name ?? primary,
    rules: raw.rules,
    category: meta?.category ?? categories[0],
    categories,
    headline: raw.headline,
    explanation: raw.explanation,
    suggestedAction: raw.action,
    rgRefs: [...new Set(raw.rules.flatMap((r) => findRule(r)?.rg ?? []))],
    evidence,
    documents: raw.docs ?? [],
  };
}

/*
 * The review set is static and resolution is pure, so it is built once at module
 * load. Nothing scope-dependent is captured here — scoping happens on read.
 */
const REVIEWED: readonly ReviewedApplication[] = (() => {
  const threadsByReference = new Map(THREADS.map((t) => [t.reference, t]));

  return TRUTH.flatMap((entry) => {
    const reference = fileReference(entry.ref);
    const thread = threadsByReference.get(reference);
    if (!thread) return [];

    const findings = entry.findings.map((f) =>
      buildFinding(f, reference, thread),
    );

    const assessedRules = [...new Set(findings.flatMap((f) => f.rules))];
    const affirmativeRules = [
      ...new Set(
        findings
          .filter((f) => f.status === "EVIDENCE_FOUND")
          .flatMap((f) => f.rules),
      ),
    ];

    return [
      {
        reference,
        threadId: thread.id,
        applicationId: thread.applicationId,
        customer: thread.customer,
        broker: thread.broker,
        branch: thread.branch,
        applicationType: thread.application,
        state: entry.state,
        headline: headlineFor(entry.state, findings),
        highestSeverity: highestSeverityOf(findings),
        findings,
        reviewCount: findings.filter((f) => f.status === "REQUIRES_REVIEW")
          .length,
        gapCount: findings.filter((f) => f.status === "POTENTIAL_GAP").length,
        evidenceCount: findings.filter((f) => f.status === "EVIDENCE_FOUND")
          .length,
        categories: [...new Set(findings.flatMap((f) => f.categories))],
        reviewCategories: [
          ...new Set(
            findings
              .filter((f) => f.status === "REQUIRES_REVIEW")
              .flatMap((f) => f.categories),
          ),
        ],
        coverage: ratio(affirmativeRules.length, assessedRules.length),
        assessedRules,
        affirmativeRules,
        inProgress: entry.state === "CLEAR_IN_PROGRESS",
        openCondition: entry.state === "CLEAR_OPEN_CONDITION",
      },
    ];
  });
})();

/** Every reviewed application the identity may see. */
export const reviewedApplications = (
  scope: DataScope,
): readonly ReviewedApplication[] =>
  REVIEWED.filter((a) => scope.canSeeApplication(a.applicationId));

export const allFindings = (scope: DataScope): readonly Finding[] =>
  reviewedApplications(scope).flatMap((a) => a.findings);

/*
 * Single-record reads are scoped too. Otherwise a deep link to a file outside
 * the identity's scope would return the record, and the access rules would hold
 * only for the list views that happened to filter.
 */
export const reviewForReference = (
  scope: DataScope,
  reference: FileReference,
): ReviewedApplication | null =>
  reviewedApplications(scope).find((a) => a.reference === reference) ?? null;

export const reviewForApplication = (
  scope: DataScope,
  id: ApplicationId,
): ReviewedApplication | null =>
  reviewedApplications(scope).find((a) => a.applicationId === id) ?? null;

export const findFinding = (scope: DataScope, id: string): Finding | null =>
  allFindings(scope).find((f) => f.id === id) ?? null;

/**
 * The single severity rule for every consumer — map markers, tables and totals
 * alike, so none of them can disagree about the same application.
 *
 * GUARDRAIL (`docs/DESIGN.md` §2): severity comes from findings in analysed
 * correspondence, never from the pipeline status. An application whose emails
 * have not been analysed has no findings either way, so it reads as `ok` rather
 * than adversely: a pipeline stage is not evidence of a compliance concern, and
 * treating it as one would be inferring a negative finding from an absence of
 * analysis.
 *
 * `ok` here means "nothing found requiring review", which is not a statement
 * that the file is compliant. Callers that render a word rather than a colour
 * are responsible for saying which of the two applies — see `statusWord` in
 * `map.ts`.
 */
export const severityResolverFor =
  (scope: DataScope) =>
  (application: Application): Severity => {
    const review = reviewForApplication(scope, application.id);
    if (!review) return "ok";
    if (review.reviewCount > 0) return "attention";
    if (review.gapCount > 0) return "watch";
    return "ok";
  };

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface RuleTally {
  readonly rule: string;
  readonly name: string;
  readonly total: number;
  readonly review: number;
  readonly evidence: number;
}

export interface CategoryTally {
  readonly category: string;
  readonly applications: number;
  readonly references: readonly FileReference[];
}

export interface NetworkCompliance {
  readonly applications: number;
  readonly evidenceFound: number;
  readonly potentialGaps: number;
  readonly requiresReview: number;
  readonly criticalApplications: number;
  readonly highApplications: number;
  readonly clearApplications: number;
  readonly openConditionApplications: number;
  readonly bySeverity: Readonly<Record<FindingSeverity, number>>;
  readonly byRule: readonly RuleTally[];
  readonly byCategory: readonly CategoryTally[];
  readonly coverage: number | null;
  readonly needingAttention: readonly ReviewedApplication[];
}

export function networkCompliance(scope: DataScope): NetworkCompliance {
  const applications = reviewedApplications(scope);
  const findings = applications.flatMap((a) => a.findings);

  const bySeverity = Object.fromEntries(
    FINDING_SEVERITY_ORDER.map((s) => [
      s,
      findings.filter((f) => f.severity === s).length,
    ]),
  ) as Record<FindingSeverity, number>;

  const tallies = new Map<
    string,
    { total: number; review: number; evidence: number }
  >();
  for (const finding of findings) {
    for (const ruleId of finding.rules) {
      const tally = tallies.get(ruleId) ?? { total: 0, review: 0, evidence: 0 };
      tally.total += 1;
      if (finding.status === "REQUIRES_REVIEW") tally.review += 1;
      if (finding.status === "EVIDENCE_FOUND") tally.evidence += 1;
      tallies.set(ruleId, tally);
    }
  }

  const byCategory = CATEGORIES.flatMap((category) => {
    const references = [
      ...new Set(
        findings
          .filter(
            (f) =>
              f.status === "REQUIRES_REVIEW" && f.categories.includes(category),
          )
          .map((f) => f.reference),
      ),
    ];
    return references.length
      ? [{ category, applications: references.length, references }]
      : [];
  }).sort((a, b) => b.applications - a.applications);

  // Rule-weighted: a finding citing four rules counts four times, so coverage
  // reflects how much of the rule surface was evidenced rather than how many
  // findings were written.
  const assessed = findings.reduce((n, f) => n + f.rules.length, 0);
  const affirmative = findings
    .filter((f) => f.status === "EVIDENCE_FOUND")
    .reduce((n, f) => n + f.rules.length, 0);

  return {
    applications: applications.length,
    evidenceFound: findings.filter((f) => f.status === "EVIDENCE_FOUND").length,
    potentialGaps: findings.filter((f) => f.status === "POTENTIAL_GAP").length,
    requiresReview: findings.filter((f) => f.status === "REQUIRES_REVIEW")
      .length,
    criticalApplications: applications.filter(
      (a) => a.state === "CRITICAL_REVIEW",
    ).length,
    highApplications: applications.filter((a) => a.state === "HIGH_REVIEW")
      .length,
    clearApplications: applications.filter((a) => a.state.startsWith("CLEAR"))
      .length,
    openConditionApplications: applications.filter((a) => a.openCondition)
      .length,
    bySeverity,
    byRule: [...tallies.entries()]
      .map(([id, t]) => ({
        rule: id,
        name: findRule(id)?.name ?? id,
        ...t,
      }))
      .sort((a, b) => b.review - a.review || b.total - a.total),
    byCategory,
    coverage: ratio(affirmative, assessed),
    needingAttention: [...applications]
      .filter((a) => a.reviewCount > 0)
      .sort(
        (a, b) =>
          FINDING_SEVERITY_ORDER.indexOf(b.highestSeverity) -
          FINDING_SEVERITY_ORDER.indexOf(a.highestSeverity),
      ),
  };
}

export interface RuleDetail {
  readonly rule: ReviewRule;
  readonly findings: readonly Finding[];
  readonly total: number;
  readonly review: number;
  readonly gaps: number;
  readonly evidence: number;
  readonly applications: number;
  readonly brokers: number;
  readonly bySeverity: Readonly<Partial<Record<FindingSeverity, number>>>;
}

/** Every finding citing one rule, for a rule-level summary. */
export function ruleDetail(scope: DataScope, id: string): RuleDetail | null {
  const meta = findRule(id);
  if (!meta) return null;

  const findings = allFindings(scope).filter((f) => f.rules.includes(id));

  const bySeverity: Partial<Record<FindingSeverity, number>> = {};
  for (const severity of FINDING_SEVERITY_ORDER) {
    const n = findings.filter((f) => f.severity === severity).length;
    if (n) bySeverity[severity] = n;
  }

  return {
    rule: meta,
    findings,
    total: findings.length,
    review: findings.filter((f) => f.status === "REQUIRES_REVIEW").length,
    gaps: findings.filter((f) => f.status === "POTENTIAL_GAP").length,
    evidence: findings.filter((f) => f.status === "EVIDENCE_FOUND").length,
    applications: new Set(findings.map((f) => f.reference)).size,
    brokers: new Set(findings.map((f) => f.broker)).size,
    bySeverity,
  };
}

// ---------------------------------------------------------------------------
// Drill-down groups
// ---------------------------------------------------------------------------

export type GroupKind = "severity" | "category" | "rule" | "status";

export interface FindingGroupApplication {
  readonly reference: FileReference;
  readonly applicationId: ApplicationId;
  readonly customer: string;
  readonly broker: string;
  readonly branch: string;
  readonly findings: readonly Finding[];
}

export interface FindingGroup {
  readonly kind: GroupKind;
  readonly value: string;
  readonly findings: readonly Finding[];
  readonly total: number;
  readonly applications: readonly FindingGroupApplication[];
  readonly brokerCount: number;
  readonly review: number;
  readonly gaps: number;
  readonly evidence: number;
  readonly evidenceItems: number;
  readonly rules: readonly string[];
  readonly bySeverity: Readonly<Partial<Record<FindingSeverity, number>>>;
  readonly byStatus: Readonly<Partial<Record<AssessmentState, number>>>;
}

const matches = (finding: Finding, kind: GroupKind, value: string): boolean => {
  switch (kind) {
    case "severity":
      return finding.severity === value;
    case "category":
      return finding.category === value || finding.categories.includes(value);
    case "rule":
      return finding.rules.includes(value);
    case "status":
      return finding.status === value;
  }
};

/**
 * Every finding sharing a severity, category, rule or state, grouped by
 * application so the references read at a glance.
 *
 * Titles are not produced here: the group is data, and the wording belongs with
 * the view that renders it.
 */
export function findingGroup(
  scope: DataScope,
  kind: GroupKind,
  value: string,
): FindingGroup {
  const findings = allFindings(scope).filter((f) => matches(f, kind, value));

  const grouped = new Map<FileReference, FindingGroupApplication>();
  for (const finding of findings) {
    const existing = grouped.get(finding.reference);
    if (existing) {
      grouped.set(finding.reference, {
        ...existing,
        findings: [...existing.findings, finding],
      });
      continue;
    }
    grouped.set(finding.reference, {
      reference: finding.reference,
      applicationId: finding.applicationId,
      customer: finding.customer,
      broker: finding.broker,
      branch: finding.branch,
      findings: [finding],
    });
  }

  const bySeverity: Partial<Record<FindingSeverity, number>> = {};
  for (const severity of FINDING_SEVERITY_ORDER) {
    const n = findings.filter((f) => f.severity === severity).length;
    if (n) bySeverity[severity] = n;
  }

  const byStatus: Partial<Record<AssessmentState, number>> = {};
  for (const finding of findings) {
    byStatus[finding.status] = (byStatus[finding.status] ?? 0) + 1;
  }

  return {
    kind,
    value,
    findings,
    total: findings.length,
    applications: [...grouped.values()],
    brokerCount: new Set(findings.map((f) => f.broker)).size,
    review: findings.filter((f) => f.status === "REQUIRES_REVIEW").length,
    gaps: findings.filter((f) => f.status === "POTENTIAL_GAP").length,
    evidence: findings.filter((f) => f.status === "EVIDENCE_FOUND").length,
    evidenceItems: findings.reduce((n, f) => n + f.evidence.length, 0),
    rules: [...new Set(findings.flatMap((f) => f.rules))],
    bySeverity,
    byStatus,
  };
}

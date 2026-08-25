/**
 * Network analysis over a scoped dataset: roll-ups, totals and entity
 * resolution.
 *
 * Every function takes the `DataScope` it should read, so scoping is a visible
 * argument rather than ambient module state. Nothing here produces prose — the
 * chat feature narrates these results, which keeps the numbers testable
 * independently of the wording.
 */

import { rollUpSeverity } from "@/lib/data/network";
import { normalise } from "@/lib/format";
import { severityResolverFor } from "./compliance";
import type { DataScope } from "./identity";
import type {
  Application,
  ApplicationId,
  Branch,
  BranchId,
  Broker,
  BrokerId,
  Severity,
} from "./types";

/**
 * How an application's severity is decided.
 *
 * The default is the compliance-aware rule, so markers, tables and totals all
 * read the same findings and cannot disagree. It is a parameter only so that
 * tests can substitute a rule and assert the roll-up arithmetic independently
 * of the dataset.
 *
 * It deliberately does NOT default to the recorded pipeline status: a stage
 * such as "Requires review" describes where a file sits in the process, and
 * treating that as a compliance signal would report an adverse finding for a
 * file whose correspondence was never analysed.
 */
export type SeverityResolver = (application: Application) => Severity;

export interface AnalysisOptions {
  readonly severityOf?: SeverityResolver;
}

// ---------------------------------------------------------------------------
// Lookups within a scope
// ---------------------------------------------------------------------------

export const brokerIn = (scope: DataScope, id: BrokerId): Broker | undefined =>
  scope.brokers.find((b) => b.id === id);

export const branchIn = (scope: DataScope, id: BranchId): Branch | undefined =>
  scope.branches.find((b) => b.id === id);

export const applicationIn = (
  scope: DataScope,
  id: ApplicationId,
): Application | undefined => scope.applications.find((a) => a.id === id);

export const applicationsForBroker = (
  scope: DataScope,
  id: BrokerId,
): readonly Application[] =>
  scope.applications.filter((a) => a.brokerId === id);

export const applicationsForBranch = (
  scope: DataScope,
  id: BranchId,
): readonly Application[] =>
  scope.applications.filter((a) => a.branchId === id);

export const brokersForBranch = (
  scope: DataScope,
  id: BranchId,
): readonly Broker[] => scope.brokers.filter((b) => b.branchId === id);

// ---------------------------------------------------------------------------
// Roll-ups
// ---------------------------------------------------------------------------

export interface BranchRollup {
  readonly branch: Branch;
  readonly applications: number;
  readonly brokers: number;
  readonly attention: number;
  readonly watch: number;
  readonly value: number;
  readonly severity: Severity;
  /**
   * Evidence coverage as a percentage. Derived deterministically from the
   * proportion of applications requiring attention, floored at 72 so the scale
   * stays legible. An indicative figure, not a measured one.
   */
  readonly coverage: number;
}

export function branchRollup(
  scope: DataScope,
  { severityOf = severityResolverFor(scope) }: AnalysisOptions = {},
): readonly BranchRollup[] {
  return scope.branches.map((branch) => {
    const applications = applicationsForBranch(scope, branch.id);
    const severities = applications.map(severityOf);
    const attention = severities.filter((s) => s === "attention").length;
    const watch = severities.filter((s) => s === "watch").length;

    return {
      branch,
      applications: applications.length,
      brokers: brokersForBranch(scope, branch.id).length,
      attention,
      watch,
      value: applications.reduce((total, a) => total + a.amount, 0),
      severity: rollUpSeverity(severities),
      coverage: applications.length
        ? Math.max(
            72,
            Math.round(
              100 - ((attention * 9 + watch * 3) / applications.length) * 4,
            ),
          )
        : 100,
    };
  });
}

export interface NetworkTotals {
  readonly brokers: number;
  readonly branches: number;
  readonly applications: number;
  readonly attention: number;
  readonly watch: number;
  readonly value: number;
  readonly averageValue: number;
  /** Mean branch coverage, or null when no branch is in scope. */
  readonly coverage: number | null;
  readonly branchesNeedingAttention: number;
}

export function networkTotals(
  scope: DataScope,
  { severityOf = severityResolverFor(scope) }: AnalysisOptions = {},
): NetworkTotals {
  const rollup = branchRollup(scope, { severityOf });
  const severities = scope.applications.map(severityOf);
  const value = scope.applications.reduce((total, a) => total + a.amount, 0);

  return {
    brokers: scope.brokers.length,
    branches: scope.branches.length,
    applications: scope.applications.length,
    attention: severities.filter((s) => s === "attention").length,
    watch: severities.filter((s) => s === "watch").length,
    value,
    averageValue: Math.round(value / (scope.applications.length || 1)),
    coverage: rollup.length
      ? Math.round(
          rollup.reduce((total, b) => total + b.coverage, 0) / rollup.length,
        )
      : null,
    branchesNeedingAttention: rollup.filter((b) => b.severity === "attention")
      .length,
  };
}

export interface BrokerRollup {
  readonly broker: Broker;
  readonly applications: readonly Application[];
  readonly attention: readonly Application[];
  readonly value: number;
  readonly severity: Severity;
}

export function brokerRollup(
  scope: DataScope,
  id: BrokerId,
  { severityOf = severityResolverFor(scope) }: AnalysisOptions = {},
): BrokerRollup | null {
  const broker = brokerIn(scope, id);
  if (!broker) return null;

  const applications = applicationsForBroker(scope, id);

  return {
    broker,
    applications,
    attention: applications.filter((a) => severityOf(a) === "attention"),
    value: applications.reduce((total, a) => total + a.amount, 0),
    severity: rollUpSeverity(applications.map(severityOf)),
  };
}

// ---------------------------------------------------------------------------
// Catalogues
// ---------------------------------------------------------------------------

const distinct = (values: readonly string[]): readonly string[] => [
  ...new Set(values),
];

/*
 * These read the scope rather than the full dataset. The prototype exported
 * frozen copies computed at module load, which kept showing lenders and stages
 * an identity could not actually see.
 */
export const stagesIn = (scope: DataScope): readonly string[] =>
  distinct(scope.applications.map((a) => a.stage));

export const lendersIn = (scope: DataScope): readonly string[] =>
  distinct(scope.applications.map((a) => a.lender));

export const applicationTypesIn = (scope: DataScope): readonly string[] =>
  distinct(scope.applications.map((a) => a.type));

// ---------------------------------------------------------------------------
// Entity resolution
// ---------------------------------------------------------------------------

/**
 * Words carrying no entity signal. Dropped before matching so "show me the
 * Thompson application" resolves on "thompson" alone.
 */
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "what",
  "who",
  "how",
  "many",
  "show",
  "tell",
  "give",
  "about",
  "all",
  "any",
  "are",
  "was",
  "has",
  "have",
  "did",
  "does",
  "from",
  "file",
  "files",
  "client",
  "customer",
  "application",
  "applications",
  "me",
  "my",
  "our",
  "their",
  "list",
  "details",
  "detail",
  "status",
  "email",
  "emails",
  "last",
  "most",
  "recent",
]);

export interface Match<T> {
  readonly record: T;
  readonly score: number;
}

export interface ResolvedEntities {
  readonly customers: readonly Match<Application>[];
  readonly brokers: readonly Match<Broker>[];
  readonly branches: readonly Match<Branch>[];
}

const EMPTY_RESOLUTION: ResolvedEntities = {
  customers: [],
  brokers: [],
  branches: [],
};

/**
 * Whether a query token names a word in a record's name.
 *
 * A token has to line up with the start of a word rather than appear anywhere
 * inside one. Matching on any substring made "which branches need attention
 * right now" resolve to a customer named Wright, because "right" sits inside
 * "wright" — so an unambiguous question about the network answered with one
 * household's file.
 *
 * Leading-edge matching is kept so that a partly typed name still resolves:
 * "thomp" finds Thompson, while "right" does not find Wright.
 */
const tokenNamesWord = (words: readonly string[], token: string): boolean =>
  words.some((word) => word.startsWith(token));

/**
 * Score a record name against the query. An exact match ranks highest, then a
 * name fully contained in the query, then partial token overlap.
 */
function scoreName(
  name: string,
  query: string,
  tokens: readonly string[],
): number {
  if (tokens.length === 0) return 0;

  const candidate = normalise(name);
  const words = candidate.split(" ").filter(Boolean);
  const hits = tokens.filter((t) => tokenNamesWord(words, t)).length;
  if (hits === 0) return 0;

  if (candidate === query) return 100;
  if (query.includes(candidate)) return 60 + hits;
  return hits * 10;
}

const rank = <T>(
  records: readonly T[],
  nameOf: (record: T) => string,
  query: string,
  tokens: readonly string[],
): readonly Match<T>[] =>
  records
    .map((record) => ({
      record,
      score: scoreName(nameOf(record), query, tokens),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

/** Resolve free text to the records in scope that match it, best first. */
export function resolveEntities(
  scope: DataScope,
  text: string,
): ResolvedEntities {
  const query = normalise(text);
  if (!query) return EMPTY_RESOLUTION;

  const tokens = query
    .split(" ")
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  return {
    customers: rank(scope.applications, (a) => a.customer, query, tokens),
    brokers: rank(scope.brokers, (b) => b.name, query, tokens),
    branches: rank(scope.branches, (b) => b.name, query, tokens),
  };
}

/**
 * Distinct customers from a resolution, keyed by customer and broker so the
 * same household with two brokers stays two records.
 */
export function distinctCustomers(
  matches: readonly Match<Application>[],
): readonly Application[] {
  const seen = new Set<string>();
  const out: Application[] = [];

  for (const { record } of matches) {
    const key = `${record.customer}|${record.brokerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(record);
  }

  return out;
}

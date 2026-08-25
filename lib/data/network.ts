/**
 * Canonical network record sets.
 *
 * This is the only module that reads the generated branch/broker/application
 * literals. It normalises the export's overlapping identifier fields into the
 * single-identifier domain records described in `lib/domain/types.ts`, and
 * validates every identifier prefix on the way through, so generator drift
 * fails loudly at import rather than silently breaking a relationship.
 *
 * Everything here is an immutable value derived once from static data. There is
 * no mutable module state, so the module is safe to share across requests.
 */

import {
  APPLICATIONS as RAW_APPLICATIONS,
  ATTENTION_STATUSES,
  BRANCHES as RAW_BRANCHES,
  BROKERS as RAW_BROKERS,
  WATCH_STATUSES,
} from "./raw/network.generated";
import { THREADS as RAW_THREADS } from "./raw/threads.generated";
import {
  applicationId,
  branchId,
  brokerId,
  clientId,
  fileReference,
  type Application,
  type ApplicationId,
  type Branch,
  type BranchId,
  type Broker,
  type BrokerId,
  type FileReference,
  type Severity,
} from "@/lib/domain/types";

/**
 * Application slug (`a001`) to client file reference (`FIN-DEMO-0001`). Only
 * applications with correspondence on file have a reference, and the two
 * numbering schemes diverge, so the mapping is read from the archive rather
 * than derived.
 */
const REFERENCE_BY_APPLICATION_SLUG: ReadonlyMap<string, FileReference> =
  new Map(RAW_THREADS.map((t) => [t.appId, fileReference(t.ref)]));

export const BRANCHES: readonly Branch[] = RAW_BRANCHES.map((b) => ({
  id: branchId(b.branchId),
  slug: b.id,
  name: b.name,
  state: b.state,
  address: b.address,
  position: { lat: b.lat, lon: b.lon },
  coverage: b.coverage,
  brokerCount: b.brokerCount,
}));

export const BROKERS: readonly Broker[] = RAW_BROKERS.map((b) => ({
  id: brokerId(b.brokerId),
  slug: b.id,
  name: b.name,
  firstName: b.firstName,
  lastName: b.lastName,
  email: b.email,
  phone: b.phone,
  branchId: branchId(b.branchCode),
  branchName: b.branch,
  officeAddress: b.officeAddress,
  position: { lat: b.lat, lon: b.lon },
}));

export const APPLICATIONS: readonly Application[] = RAW_APPLICATIONS.map(
  (a) => ({
    id: applicationId(a.applicationId),
    slug: a.id,
    clientId: clientId(a.clientId),
    customer: a.customer,
    brokerId: brokerId(a.brokerId),
    brokerName: a.broker,
    branchId: branchId(a.branchCode),
    branchName: a.branch,
    residentialAddress: a.residentialAddress,
    position: { lat: a.lat, lon: a.lon },
    type: a.type,
    amount: a.amount,
    lender: a.lender,
    stage: a.stage,
    status: a.status,
    fileReference: REFERENCE_BY_APPLICATION_SLUG.get(a.id) ?? null,
  }),
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

const branchesById: ReadonlyMap<BranchId, Branch> = new Map(
  BRANCHES.map((b) => [b.id, b]),
);
const branchesBySlug: ReadonlyMap<string, Branch> = new Map(
  BRANCHES.map((b) => [b.slug, b]),
);
const brokersById: ReadonlyMap<BrokerId, Broker> = new Map(
  BROKERS.map((b) => [b.id, b]),
);
const brokersBySlug: ReadonlyMap<string, Broker> = new Map(
  BROKERS.map((b) => [b.slug, b]),
);
const applicationsById: ReadonlyMap<ApplicationId, Application> = new Map(
  APPLICATIONS.map((a) => [a.id, a]),
);
const applicationsBySlug: ReadonlyMap<string, Application> = new Map(
  APPLICATIONS.map((a) => [a.slug, a]),
);
const applicationsByReference: ReadonlyMap<FileReference, Application> =
  new Map(
    APPLICATIONS.filter((a) => a.fileReference !== null).map((a) => [
      a.fileReference as FileReference,
      a,
    ]),
  );

export const findBranch = (id: BranchId): Branch | undefined =>
  branchesById.get(id);
export const findBroker = (id: BrokerId): Broker | undefined =>
  brokersById.get(id);
export const findApplication = (id: ApplicationId): Application | undefined =>
  applicationsById.get(id);

/** Resolve a URL segment back to a record. Returns undefined for unknown slugs. */
export const findBranchBySlug = (slug: string): Branch | undefined =>
  branchesBySlug.get(slug);
export const findBrokerBySlug = (slug: string): Broker | undefined =>
  brokersBySlug.get(slug);
export const findApplicationBySlug = (slug: string): Application | undefined =>
  applicationsBySlug.get(slug);

/** Resolve the file reference quoted in correspondence to its application. */
export const findApplicationByReference = (
  reference: FileReference,
): Application | undefined => applicationsByReference.get(reference);

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const ATTENTION = new Set(ATTENTION_STATUSES);
const WATCH = new Set(WATCH_STATUSES);

/**
 * Map a raw application status onto a traffic-light severity. This is an
 * indication that review may be required, never a compliance determination.
 */
export function severityOfStatus(status: string): Severity {
  if (ATTENTION.has(status)) return "attention";
  if (WATCH.has(status)) return "watch";
  return "ok";
}

/**
 * Roll a set of severities up to one severity for a group (branch, broker or
 * lender). Any group holding an `attention` item is `attention`, so a marker
 * colour can never contradict the assessment state of a record inside it.
 */
export function rollUpSeverity(severities: readonly Severity[]): Severity {
  if (severities.some((s) => s === "attention")) return "attention";
  if (severities.some((s) => s === "watch")) return "watch";
  return "ok";
}

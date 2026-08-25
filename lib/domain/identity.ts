/**
 * Identities and dataset scoping — `docs/DESIGN.md` §4.
 *
 * Switching identity changes the accessible dataset everywhere, not just the
 * displayed name. Every scoped read resolves through explicit relationships
 * (`BranchId` / `BrokerId`), never display names.
 *
 * The prototype applied scope by mutating module-level state, so the current
 * scope was ambient and a single value shared by every caller. Here `scopeFor`
 * returns an immutable value that callers pass explicitly. That makes scoping a
 * visible parameter at every call site and keeps concurrent readers isolated.
 */

import { APPLICATIONS, BRANCHES, BROKERS } from "@/lib/data/network";
import {
  branchId,
  brokerId,
  userId,
  type AccessLevel,
  type Application,
  type ApplicationId,
  type Branch,
  type BranchId,
  type Broker,
  type BrokerId,
  type Identity,
  type MapLayer,
  type UserId,
} from "./types";

export const IDENTITIES: readonly Identity[] = [
  {
    id: userId("USER-ORG-001"),
    name: "Brendan Chapman",
    role: "Finsure Organisation Admin",
    shortRole: "Organisation",
    accessLevel: "organisation",
    location: "Sydney CBD",
    branchId: null,
    brokerId: null,
    initials: "BC",
    scopeLabel:
      "All branches, brokers, clients and lenders across the network",
  },
  {
    id: userId("USER-BO-001"),
    name: "Leo Bell",
    role: "Branch Owner / Head Broker",
    shortRole: "Branch owner",
    accessLevel: "branch_owner",
    location: "Finsure · Brisbane South",
    branchId: branchId("BR-BRIS-SOUTH"),
    brokerId: brokerId("BROKER-LB-001"),
    initials: "LB",
    scopeLabel:
      "Finsure · Brisbane South — its brokers, clients and applications",
  },
  {
    id: userId("USER-BR-001"),
    name: "Rachael Nguyen",
    role: "Mortgage Broker",
    shortRole: "Broker",
    accessLevel: "broker",
    location: "Finsure · Brisbane South",
    branchId: branchId("BR-BRIS-SOUTH"),
    brokerId: brokerId("BROKER-RN-001"),
    initials: "RN",
    scopeLabel: "Your own clients and applications",
  },
];

export const DEFAULT_IDENTITY_ID = IDENTITIES[0].id;

const identitiesById: ReadonlyMap<UserId, Identity> = new Map(
  IDENTITIES.map((i) => [i.id, i]),
);

/** Falls back to the organisation identity so an unknown id cannot widen access. */
export const findIdentity = (id: UserId): Identity =>
  identitiesById.get(id) ?? IDENTITIES[0];

/**
 * Map layers each access level may see. A broker has no visibility of other
 * brokers or of the branch network, so those layers are withheld entirely.
 */
export const LAYERS_FOR: Record<AccessLevel, readonly MapLayer[]> = {
  organisation: ["lenders", "branches", "brokers", "clients"],
  branch_owner: ["lenders", "branches", "brokers", "clients"],
  broker: ["lenders", "clients"],
};

/**
 * The accessible dataset for one identity. Everything downstream — dashboard,
 * lists, search, chat retrieval, map markers, profiles, reports and compliance
 * findings — reads through this rather than the full record sets.
 */
export interface DataScope {
  readonly identity: Identity;
  readonly accessLevel: AccessLevel;
  readonly isOrganisation: boolean;
  readonly isBranchOwner: boolean;
  readonly isBroker: boolean;
  readonly branches: readonly Branch[];
  readonly brokers: readonly Broker[];
  readonly applications: readonly Application[];
  readonly layers: readonly MapLayer[];
  /** Lenders reachable through the applications this identity can see. */
  readonly lenderNames: readonly string[];
  readonly canSeeBranch: (id: BranchId) => boolean;
  readonly canSeeBroker: (id: BrokerId) => boolean;
  readonly canSeeApplication: (id: ApplicationId) => boolean;
  readonly canSeeLayer: (layer: MapLayer) => boolean;
}

export function scopeFor(id: UserId): DataScope {
  const identity = findIdentity(id);
  const level = identity.accessLevel;

  let branches: readonly Branch[];
  let brokers: readonly Broker[];
  let applications: readonly Application[];

  if (level === "organisation") {
    branches = BRANCHES;
    brokers = BROKERS;
    applications = APPLICATIONS;
  } else if (level === "branch_owner") {
    branches = BRANCHES.filter((b) => b.id === identity.branchId);
    brokers = BROKERS.filter((b) => b.branchId === identity.branchId);
    const ids = new Set(brokers.map((b) => b.id));
    applications = APPLICATIONS.filter((a) => ids.has(a.brokerId));
  } else {
    // An individual broker sees their own profile and their own clients only.
    // The branch network is withheld entirely rather than narrowed to one row.
    brokers = BROKERS.filter((b) => b.id === identity.brokerId);
    branches = [];
    applications = APPLICATIONS.filter((a) => a.brokerId === identity.brokerId);
  }

  const branchIds = new Set(branches.map((b) => b.id));
  const brokerIds = new Set(brokers.map((b) => b.id));
  const applicationIds = new Set(applications.map((a) => a.id));
  const layers = LAYERS_FOR[level];

  return {
    identity,
    accessLevel: level,
    isOrganisation: level === "organisation",
    isBranchOwner: level === "branch_owner",
    isBroker: level === "broker",
    branches,
    brokers,
    applications,
    layers,
    lenderNames: [...new Set(applications.map((a) => a.lender))],
    canSeeBranch: (branch) => branchIds.has(branch),
    canSeeBroker: (broker) => brokerIds.has(broker),
    canSeeApplication: (application) => applicationIds.has(application),
    canSeeLayer: (layer) => layers.includes(layer),
  };
}

/**
 * The branch an identity belongs to. A branch owner sees this as their own
 * branch; a broker sees it as context only, never as a map layer.
 */
export const homeBranchOf = (id: UserId): Branch | null => {
  const identity = findIdentity(id);
  if (!identity.branchId) return null;
  return BRANCHES.find((b) => b.id === identity.branchId) ?? null;
};

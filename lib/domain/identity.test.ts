import { describe, expect, it } from "vitest";

import { APPLICATIONS, BRANCHES, BROKERS } from "@/lib/data/network";
import { DEFAULT_IDENTITY_ID, IDENTITIES, scopeFor } from "./identity";
import { userId } from "./types";

const organisation = userId("USER-ORG-001");
const branchOwner = userId("USER-BO-001");
const broker = userId("USER-BR-001");

describe("identities", () => {
  it("defaults to the organisation identity", () => {
    expect(DEFAULT_IDENTITY_ID).toBe(organisation);
  });

  it("defines the three documented identities", () => {
    expect(IDENTITIES.map((i) => i.accessLevel)).toEqual([
      "organisation",
      "branch_owner",
      "broker",
    ]);
  });
});

describe("organisation scope", () => {
  it("sees the entire network", () => {
    const scope = scopeFor(organisation);
    expect(scope.branches).toHaveLength(BRANCHES.length);
    expect(scope.brokers).toHaveLength(BROKERS.length);
    expect(scope.applications).toHaveLength(APPLICATIONS.length);
    expect(scope.layers).toHaveLength(4);
  });
});

describe("branch owner scope", () => {
  const scope = scopeFor(branchOwner);

  it("sees one branch only", () => {
    expect(scope.branches).toHaveLength(1);
    expect(scope.branches[0].id).toBe(scope.identity.branchId);
  });

  it("sees only brokers in that branch", () => {
    expect(scope.brokers.length).toBeGreaterThan(0);
    for (const b of scope.brokers) {
      expect(b.branchId).toBe(scope.identity.branchId);
    }
  });

  it("sees only applications belonging to those brokers", () => {
    const permitted = new Set(scope.brokers.map((b) => b.id));
    expect(scope.applications.length).toBeGreaterThan(0);
    for (const a of scope.applications) {
      expect(permitted.has(a.brokerId)).toBe(true);
    }
  });
});

describe("broker scope", () => {
  const scope = scopeFor(broker);

  it("sees only their own broker record", () => {
    expect(scope.brokers).toHaveLength(1);
    expect(scope.brokers[0].id).toBe(scope.identity.brokerId);
  });

  it("withholds the branch network entirely", () => {
    // A broker has no visibility of the branch network — the layer is withheld
    // rather than narrowed to a single row. See docs/DESIGN.md §4.
    expect(scope.branches).toEqual([]);
    expect(scope.canSeeLayer("branches")).toBe(false);
    expect(scope.canSeeLayer("brokers")).toBe(false);
    expect(scope.canSeeLayer("clients")).toBe(true);
    expect(scope.canSeeLayer("lenders")).toBe(true);
  });

  it("sees only their own applications", () => {
    expect(scope.applications.length).toBeGreaterThan(0);
    for (const a of scope.applications) {
      expect(a.brokerId).toBe(scope.identity.brokerId);
    }
  });
});

describe("scope narrows monotonically", () => {
  it("gives each level no more than the level above", () => {
    const org = scopeFor(organisation);
    const owner = scopeFor(branchOwner);
    const own = scopeFor(broker);

    expect(owner.applications.length).toBeLessThan(org.applications.length);
    expect(own.applications.length).toBeLessThan(owner.applications.length);
  });

  it("never admits a record outside the scope through a membership test", () => {
    const own = scopeFor(broker);
    const outside = APPLICATIONS.find((a) => !own.canSeeApplication(a.id));
    expect(outside).toBeDefined();
    expect(own.applications).not.toContain(outside);
  });
});

describe("scope isolation", () => {
  it("returns independent values rather than mutating shared state", () => {
    // The prototype applied scope by mutating a module-level singleton, so the
    // most recent caller silently changed what every other caller could see.
    const first = scopeFor(organisation);
    const second = scopeFor(broker);

    expect(first.applications).toHaveLength(APPLICATIONS.length);
    expect(second.applications.length).toBeLessThan(APPLICATIONS.length);
  });
});

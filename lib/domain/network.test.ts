import { describe, expect, it } from "vitest";

import { scopeFor } from "./identity";
import {
  applicationsForBranch,
  branchRollup,
  distinctCustomers,
  lendersIn,
  networkTotals,
  resolveEntities,
  stagesIn,
} from "./network";
import { userId, type Application, type Severity } from "./types";

const organisation = scopeFor(userId("USER-ORG-001"));
const broker = scopeFor(userId("USER-BR-001"));

describe("network totals", () => {
  const totals = networkTotals(organisation);

  it("counts the whole network for the organisation identity", () => {
    expect(totals.branches).toBe(30);
    expect(totals.brokers).toBe(100);
    expect(totals.applications).toBe(200);
  });

  it("splits every application into exactly one severity tier", () => {
    const ok = totals.applications - totals.attention - totals.watch;
    expect(totals.attention).toBeGreaterThan(0);
    expect(totals.watch).toBeGreaterThan(0);
    expect(ok).toBeGreaterThanOrEqual(0);
  });

  it("derives the average from the total", () => {
    expect(totals.averageValue).toBe(
      Math.round(totals.value / totals.applications),
    );
  });

  it("reports coverage as a percentage", () => {
    expect(totals.coverage).toBeGreaterThanOrEqual(72);
    expect(totals.coverage).toBeLessThanOrEqual(100);
  });

  it("narrows with scope", () => {
    const scoped = networkTotals(broker);
    expect(scoped.applications).toBeLessThan(totals.applications);
    expect(scoped.value).toBeLessThan(totals.value);
  });
});

describe("branch roll-up", () => {
  const rollup = branchRollup(organisation);

  it("covers every branch in scope", () => {
    expect(rollup).toHaveLength(organisation.branches.length);
  });

  it("accounts for every application exactly once", () => {
    const counted = rollup.reduce((n, b) => n + b.applications, 0);
    expect(counted).toBe(organisation.applications.length);
  });

  it("sums each branch's value from its own applications", () => {
    for (const row of rollup) {
      const expected = applicationsForBranch(
        organisation,
        row.branch.id,
      ).reduce((total, a) => total + a.amount, 0);
      expect(row.value, row.branch.name).toBe(expected);
    }
  });

  it("never colours a branch less severe than a record inside it", () => {
    // A branch holding an application requiring attention must itself read as
    // attention, so a marker colour cannot contradict the record it contains.
    for (const row of rollup) {
      if (row.attention > 0)
        expect(row.severity, row.branch.name).toBe("attention");
      else if (row.watch > 0)
        expect(row.severity, row.branch.name).toBe("watch");
      else expect(row.severity, row.branch.name).toBe("ok");
    }
  });

  it("floors coverage at 72", () => {
    for (const row of rollup) {
      expect(row.coverage, row.branch.name).toBeGreaterThanOrEqual(72);
    }
  });
});

describe("injected severity resolver", () => {
  it("reaches roll-ups and totals alike", () => {
    const everythingNeedsAttention: (a: Application) => Severity = () =>
      "attention";

    const totals = networkTotals(organisation, {
      severityOf: everythingNeedsAttention,
    });
    const rollup = branchRollup(organisation, {
      severityOf: everythingNeedsAttention,
    });

    expect(totals.attention).toBe(organisation.applications.length);
    expect(totals.branchesNeedingAttention).toBe(rollup.length);
    expect(rollup.every((r) => r.severity === "attention")).toBe(true);
  });
});

describe("catalogues", () => {
  it("read the scope rather than the full dataset", () => {
    // The prototype froze these at module load, so an identity kept seeing
    // lenders and stages that were not in its own applications.
    const scopedLenders = lendersIn(broker);
    const allLenders = lendersIn(organisation);

    expect(scopedLenders.length).toBeLessThan(allLenders.length);
    for (const lender of scopedLenders) {
      expect(broker.applications.some((a) => a.lender === lender)).toBe(true);
    }
  });

  it("returns distinct values", () => {
    const stages = stagesIn(organisation);
    expect(new Set(stages).size).toBe(stages.length);
  });
});

describe("entity resolution", () => {
  it("returns nothing for empty input", () => {
    expect(resolveEntities(organisation, "").customers).toEqual([]);
    expect(resolveEntities(organisation, "   ").customers).toEqual([]);
  });

  it("ignores stop words so no record matches on filler alone", () => {
    const result = resolveEntities(
      organisation,
      "show me all the applications",
    );
    expect(result.customers).toEqual([]);
    expect(result.brokers).toEqual([]);
    expect(result.branches).toEqual([]);
  });

  it("finds a customer by surname", () => {
    const { customers } = resolveEntities(organisation, "Thompson");
    expect(customers.length).toBeGreaterThan(0);
    expect(customers[0].record.customer).toContain("Thompson");
  });

  it("ranks an exact name match above a partial one", () => {
    const { brokers } = resolveEntities(organisation, "Rachael Nguyen");
    expect(brokers[0].record.name).toBe("Rachael Nguyen");
    expect(brokers[0].score).toBeGreaterThanOrEqual(brokers.at(-1)!.score);
  });

  it("resolves a branch by name", () => {
    const { branches } = resolveEntities(organisation, "Townsville");
    expect(branches[0].record.name).toBe("Townsville");
  });

  it("cannot resolve records outside the scope", () => {
    const { customers } = resolveEntities(broker, "Thompson");
    for (const match of customers) {
      expect(match.record.brokerId).toBe(broker.identity.brokerId);
    }
  });

  it("preserves & in customer names", () => {
    const { customers } = resolveEntities(
      organisation,
      "Sarah & Michael Thompson",
    );
    expect(customers[0].record.customer).toBe("Sarah & Michael Thompson");
  });
});

describe("distinct customers", () => {
  it("keeps the same household under two brokers separate", () => {
    const { customers } = resolveEntities(organisation, "Smith");
    const distinct = distinctCustomers(customers);
    const keys = distinct.map((a) => `${a.customer}|${a.brokerId}`);
    expect(new Set(keys).size).toBe(distinct.length);
  });
});

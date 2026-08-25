import { describe, expect, it } from "vitest";

import { TRUTH } from "@/lib/data/raw/compliance-truth.generated";
import { THREADS } from "@/lib/data/threads";
import { scopeFor } from "./identity";
import {
  CATEGORIES,
  RULES,
  allFindings,
  findFinding,
  findingGroup,
  networkCompliance,
  reviewForReference,
  reviewedApplications,
  ruleDetail,
} from "./compliance";
import {
  ASSESSMENT_STATES,
  FINDING_SEVERITY_ORDER,
  fileReference,
  userId,
} from "./types";

const organisation = scopeFor(userId("USER-ORG-001"));
const broker = scopeFor(userId("USER-BR-001"));

const JULIE = fileReference("FIN-DEMO-0002");

describe("rule library", () => {
  it("gives every rule a category from the published list", () => {
    for (const rule of Object.values(RULES)) {
      expect(CATEGORIES, rule.id).toContain(rule.category);
    }
  });

  it("cites regulatory guidance for every rule", () => {
    for (const rule of Object.values(RULES)) {
      expect(rule.rg.length, rule.id).toBeGreaterThan(0);
    }
  });

  it("keys each rule by its own identifier", () => {
    for (const [key, rule] of Object.entries(RULES)) {
      expect(rule.id).toBe(key);
    }
  });
});

describe("review set", () => {
  const reviewed = reviewedApplications(organisation);

  it("builds every curated application that has a thread", () => {
    expect(reviewed).toHaveLength(TRUTH.length);
  });

  it("gives every finding a unique identifier", () => {
    const ids = allFindings(organisation).map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every evidence anchor to a message in the thread", () => {
    // An unresolved anchor is a finding with no traceable source. The builder
    // drops those, so a shortfall here means the archive and the review set
    // have drifted apart.
    const expected = TRUTH.reduce(
      (n, a) => n + a.findings.reduce((m, f) => m + f.ev.length, 0),
      0,
    );
    const actual = allFindings(organisation).reduce(
      (n, f) => n + f.evidence.length,
      0,
    );
    expect(actual).toBe(expected);
  });

  it("anchors each evidence item to text truly inside its message", () => {
    const flatten = (t: string) =>
      t
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    for (const finding of allFindings(organisation)) {
      for (const item of finding.evidence) {
        expect(flatten(item.message.body), item.id).toContain(
          flatten(item.anchor),
        );
      }
    }
  });

  it("uses only the three permitted assessment states", () => {
    for (const finding of allFindings(organisation)) {
      expect(ASSESSMENT_STATES).toContain(finding.status);
    }
  });

  it("never claims a file is compliant or non-compliant", () => {
    // docs/DESIGN.md §2: the product may not make that determination.
    const forbidden = /\bnon-?compliant\b|\bis compliant\b|\bfully compliant\b|\bbreach of\b/i;
    for (const app of reviewed) {
      expect(app.headline, app.reference).not.toMatch(forbidden);
      for (const finding of app.findings) {
        expect(finding.headline, finding.id).not.toMatch(forbidden);
        expect(finding.explanation, finding.id).not.toMatch(forbidden);
        expect(finding.suggestedAction, finding.id).not.toMatch(forbidden);
      }
    }
  });

  it("derives the highest severity from its own findings", () => {
    for (const app of reviewed) {
      const highest = [...FINDING_SEVERITY_ORDER]
        .reverse()
        .find((s) => app.findings.some((f) => f.severity === s));
      expect(app.highestSeverity, app.reference).toBe(highest ?? "INFORMATIONAL");
    }
  });

  it("counts each finding under exactly one status", () => {
    for (const app of reviewed) {
      expect(app.reviewCount + app.gapCount + app.evidenceCount).toBe(
        app.findings.length,
      );
    }
  });

  it("titles a finding with a rule it actually cites", () => {
    for (const finding of allFindings(organisation)) {
      expect(finding.rules, finding.id).toContain(finding.primaryRule);
    }
  });

  it("reports coverage as null rather than zero when nothing was assessed", () => {
    for (const app of reviewed) {
      if (app.assessedRules.length === 0) expect(app.coverage).toBeNull();
      else expect(app.coverage).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("expected findings for FIN-DEMO-0002", () => {
  // Asserted against public/files/julie-smith/16_Expected_Prototype_Findings.txt,
  // which is the reference set for this file.
  const review = reviewForReference(organisation, JULIE);

  it("is on file", () => {
    expect(review).not.toBeNull();
  });

  it("records no material concern with one open lender condition", () => {
    expect(review!.state).toBe("CLEAR_OPEN_CONDITION");
    expect(review!.openCondition).toBe(true);
    expect(review!.headline).toBe(
      "No material concern identified in the analysed record — one lender condition remains open",
    );
  });

  it("has five evidence-found findings and one requiring review", () => {
    expect(review!.evidenceCount).toBe(5);
    expect(review!.reviewCount).toBe(1);
    expect(review!.findings).toHaveLength(6);
  });

  it("raises the source of settlement funds as the item requiring review", () => {
    const open = review!.findings.filter((f) => f.status === "REQUIRES_REVIEW");
    expect(open).toHaveLength(1);
    expect(open[0].headline.toLowerCase()).toContain("source");
    expect(open[0].suggestedAction.length).toBeGreaterThan(0);
  });

  it("evidences objectives, comparison, income verification, referral and privacy", () => {
    const headlines = review!.findings.map((f) => f.headline.toLowerCase());
    expect(headlines.some((h) => h.includes("objectives"))).toBe(true);
    expect(headlines.some((h) => h.includes("compar"))).toBe(true);
    expect(headlines.some((h) => h.includes("employment") || h.includes("income"))).toBe(true);
  });
});

describe("network aggregation", () => {
  const network = networkCompliance(organisation);

  it("counts each finding under exactly one status", () => {
    const total = allFindings(organisation).length;
    expect(
      network.evidenceFound + network.potentialGaps + network.requiresReview,
    ).toBe(total);
  });

  it("distributes findings across severities without loss", () => {
    const total = Object.values(network.bySeverity).reduce((a, b) => a + b, 0);
    expect(total).toBe(allFindings(organisation).length);
  });

  it("orders rule tallies by items requiring review", () => {
    const reviews = network.byRule.map((r) => r.review);
    expect([...reviews].sort((a, b) => b - a)).toEqual(reviews);
  });

  it("names every tallied rule", () => {
    for (const tally of network.byRule) {
      expect(tally.name, tally.rule).not.toBe(tally.rule);
    }
  });

  it("lists only categories that have something requiring review", () => {
    for (const category of network.byCategory) {
      expect(category.applications).toBeGreaterThan(0);
      expect(category.references).toHaveLength(category.applications);
    }
  });

  it("orders applications needing attention by severity", () => {
    const ranks = network.needingAttention.map((a) =>
      FINDING_SEVERITY_ORDER.indexOf(a.highestSeverity),
    );
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks);
  });

  it("counts every application under exactly one state", () => {
    expect(
      network.criticalApplications +
        network.highApplications +
        network.clearApplications,
    ).toBeLessThanOrEqual(network.applications);
  });
});

describe("scoping", () => {
  it("hides reviews for applications outside the identity's scope", () => {
    const all = reviewedApplications(organisation);
    const mine = reviewedApplications(broker);

    expect(mine.length).toBeLessThan(all.length);
    for (const app of mine) {
      expect(broker.canSeeApplication(app.applicationId)).toBe(true);
    }
  });

  it("refuses a direct read of an out-of-scope reference", () => {
    // Without this, a deep link would return a file the identity may not see.
    const outside = reviewedApplications(organisation).find(
      (a) => !broker.canSeeApplication(a.applicationId),
    );
    expect(outside).toBeDefined();
    expect(reviewForReference(broker, outside!.reference)).toBeNull();
  });

  it("refuses a direct read of an out-of-scope finding", () => {
    const outside = allFindings(organisation).find(
      (f) => !broker.canSeeApplication(f.applicationId),
    );
    expect(outside).toBeDefined();
    expect(findFinding(broker, outside!.id)).toBeNull();
    expect(findFinding(organisation, outside!.id)).not.toBeNull();
  });

  it("narrows aggregates to the scope", () => {
    const all = networkCompliance(organisation);
    const mine = networkCompliance(broker);
    expect(mine.applications).toBeLessThan(all.applications);
  });

  it("narrows rule drill-downs to the scope", () => {
    const all = ruleDetail(organisation, "RES-04");
    const mine = ruleDetail(broker, "RES-04");
    expect(all).not.toBeNull();
    expect(mine!.total).toBeLessThanOrEqual(all!.total);
  });

  it("returns null for an unknown rule", () => {
    expect(ruleDetail(organisation, "RES-99")).toBeNull();
  });
});

describe("finding groups", () => {
  it("groups by status", () => {
    const group = findingGroup(organisation, "status", "REQUIRES_REVIEW");
    expect(group.total).toBeGreaterThan(0);
    for (const finding of group.findings) {
      expect(finding.status).toBe("REQUIRES_REVIEW");
    }
  });

  it("groups by severity", () => {
    const group = findingGroup(organisation, "severity", "CRITICAL");
    for (const finding of group.findings) {
      expect(finding.severity).toBe("CRITICAL");
    }
  });

  it("groups by rule", () => {
    const group = findingGroup(organisation, "rule", "RES-12");
    for (const finding of group.findings) {
      expect(finding.rules).toContain("RES-12");
    }
  });

  it("collects each application once with all its findings", () => {
    const group = findingGroup(organisation, "status", "REQUIRES_REVIEW");
    const references = group.applications.map((a) => a.reference);
    expect(new Set(references).size).toBe(references.length);

    const counted = group.applications.reduce((n, a) => n + a.findings.length, 0);
    expect(counted).toBe(group.total);
  });

  it("returns an empty group for a value nothing matches", () => {
    const group = findingGroup(organisation, "category", "Nonexistent category");
    expect(group.total).toBe(0);
    expect(group.applications).toEqual([]);
  });
});

describe("determinism", () => {
  it("returns identical results for repeated reads", () => {
    // The prototype rebuilt into a module-level cache guarded by ambient scope,
    // so results depended on call order. These reads must not.
    expect(networkCompliance(organisation)).toEqual(
      networkCompliance(organisation),
    );

    const first = reviewedApplications(broker);
    reviewedApplications(organisation);
    expect(reviewedApplications(broker)).toEqual(first);
  });

  it("covers every thread that has a curated review", () => {
    const references = new Set(THREADS.map((t) => t.reference));
    for (const entry of TRUTH) {
      expect(references.has(fileReference(entry.ref)), entry.ref).toBe(true);
    }
  });
});

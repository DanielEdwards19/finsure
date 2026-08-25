import { describe, expect, it } from "vitest";

import { reviewForApplication, severityResolverFor } from "./compliance";
import { DEFAULT_IDENTITY_ID, scopeFor } from "./identity";
import { lenderOffice } from "./lenders";
import { mapData } from "./map";

const organisation = scopeFor(DEFAULT_IDENTITY_ID);

describe("map markers", () => {
  it("covers every record in scope", () => {
    const data = mapData(organisation);

    expect(data.branches.length).toBe(organisation.branches.length);
    expect(data.brokers.length).toBe(organisation.brokers.length);
    expect(data.clients.length).toBe(organisation.applications.length);
  });

  /*
   * GUARDRAIL (`docs/DESIGN.md` §2): severity is a finding in analysed
   * correspondence, never a pipeline stage. Statuses such as "Waiting on
   * documents" describe where a file sits in the process, and colouring them
   * adversely would report a negative finding from an absence of analysis.
   *
   * This is the specific regression that put 26 of 30 branch markers in the
   * attention colour, so it is asserted rather than left to review.
   */
  it("never colours an application adversely without a finding", () => {
    const severityOf = severityResolverFor(organisation);

    for (const application of organisation.applications) {
      const review = reviewForApplication(organisation, application.id);
      if (review) continue;

      expect(severityOf(application)).toBe("ok");
    }
  });

  it("colours an application from its findings, not its status", () => {
    const severityOf = severityResolverFor(organisation);

    for (const application of organisation.applications) {
      const review = reviewForApplication(organisation, application.id);
      if (!review) continue;

      const expected =
        review.reviewCount > 0
          ? "attention"
          : review.gapCount > 0
            ? "watch"
            : "ok";

      expect(severityOf(application)).toBe(expected);
    }
  });

  it("leaves most branches clear, as only some files carry findings", () => {
    const attention = mapData(organisation).branches.filter(
      (m) => m.status === "attention",
    );

    // The assertion is the proportion, not an exact count: a marker set where
    // nearly every branch is adverse means severity has been wired to pipeline
    // status again.
    expect(attention.length).toBeLessThan(organisation.branches.length / 2);
  });

  it("says so when an application's emails were not analysed", () => {
    const unanalysed = organisation.applications.find(
      (a) => reviewForApplication(organisation, a.id) == null,
    )!;
    const marker = mapData(organisation).clients.find(
      (m) => m.key === unanalysed.id,
    )!;

    expect(marker.summary).toContain("emails not analysed");
    expect(marker.summary).not.toContain("Evidence found");
  });

  it("places lenders only where an office is known", () => {
    const markers = mapData(organisation).lenders;

    for (const marker of markers) {
      const office = lenderOffice(marker.name);
      expect(office).not.toBeNull();
      expect(marker.lat).toBe(office!.lat);
      expect(marker.address).toBe(office!.address);
    }
  });

  it("omits a lender with no recorded office rather than averaging one", () => {
    const withoutOffice = organisation.lenderNames.filter(
      (name) => !lenderOffice(name),
    );
    const names = mapData(organisation).lenders.map((m) => m.name);

    expect(withoutOffice.length).toBeGreaterThan(0);
    for (const name of withoutOffice) {
      expect(names).not.toContain(name);
    }
  });

  it("never reports a group as clearer than a record inside it", () => {
    const data = mapData(organisation);
    const severityOf = severityResolverFor(organisation);
    const rank = { ok: 0, watch: 1, attention: 2 } as const;

    for (const marker of data.branches) {
      const applications = organisation.applications.filter(
        (a) => a.branchId === marker.key,
      );
      const worst = applications.reduce(
        (highest, a) => Math.max(highest, rank[severityOf(a)]),
        0,
      );

      expect(rank[marker.status]).toBe(worst);
    }
  });
});

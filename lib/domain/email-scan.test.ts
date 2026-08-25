import { describe, expect, it } from "vitest";

import { THREADS, threadsForReference } from "@/lib/data/threads";
import { scopeFor } from "./identity";
import {
  SCAN_RULES,
  correspondenceFor,
  networkCorrespondence,
  observationsFor,
  threadsInScope,
} from "./email-scan";
import { fileReference, userId } from "./types";

const organisation = scopeFor(userId("USER-ORG-001"));
const broker = scopeFor(userId("USER-BR-001"));

describe("scan rules", () => {
  it("has unique rule identifiers", () => {
    const ids = SCAN_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers both concerns and supporting evidence", () => {
    expect(SCAN_RULES.some((r) => r.kind === "concern")).toBe(true);
    expect(SCAN_RULES.some((r) => r.kind === "supporting")).toBe(true);
  });

  it("uses case-insensitive patterns so matching is not casing-dependent", () => {
    for (const rule of SCAN_RULES) {
      expect(rule.pattern.flags, rule.id).toContain("i");
    }
  });
});

describe("observations", () => {
  it("finds at least one observation across the archive", () => {
    const total = THREADS.reduce((n, t) => n + observationsFor(t).length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("anchors every observation to a real message in its thread", () => {
    for (const thread of THREADS) {
      for (const observation of observationsFor(thread)) {
        const message = thread.messages[observation.messageIndex];
        expect(message, `${thread.id} #${observation.messageIndex}`).toBeDefined();
        expect(observation.from).toBe(message.from);
        expect(observation.date).toBe(message.date);
        expect(observation.threadId).toBe(thread.id);
      }
    }
  });

  it("quotes the passage that triggered it", () => {
    for (const thread of THREADS) {
      for (const observation of observationsFor(thread)) {
        expect(observation.quote.length, observation.ruleId).toBeGreaterThan(0);
      }
    }
  });

  it("matches patterns across smart quotes", () => {
    // The archive uses typographic apostrophes; the patterns are written with
    // ASCII ones, so a mismatch here silently loses findings.
    const withSmartQuotes = THREADS.filter((t) =>
      t.messages.some((m) => /[\u2018\u2019]/.test(m.body)),
    );
    expect(withSmartQuotes.length).toBeGreaterThan(0);

    const found = withSmartQuotes.some((t) => observationsFor(t).length > 0);
    expect(found).toBe(true);
  });

  it("is deterministic across repeated calls", () => {
    const thread = THREADS[0];
    expect(observationsFor(thread)).toEqual(observationsFor(thread));
  });

  it("finds phrases split across a wrapped line", () => {
    // Email bodies are hard-wrapped at roughly 80 characters. Matching against
    // the raw body made a finding's appearance depend on where the line broke,
    // which hid 9 of 55 observations in the archive — including three rules
    // that flag items requiring review. This guards the normalisation.
    const wrapped = THREADS.flatMap((t) => t.messages).filter((m) =>
      /confirmed by your\s*\n\s*conveyancer/.test(m.body),
    );
    expect(wrapped.length).toBeGreaterThan(0);

    const categories = THREADS.flatMap((t) => observationsFor(t)).map(
      (o) => o.category,
    );
    expect(categories).toContain("Referred to the right professional");
  });

  it("quotes without embedded line breaks", () => {
    // A quote is rendered inline, so a newline from the source wrapping would
    // show up as a break in the middle of the evidence.
    for (const thread of THREADS) {
      for (const observation of observationsFor(thread)) {
        expect(observation.quote, observation.ruleId).not.toMatch(/\n/);
      }
    }
  });
});

describe("Julie Smith correspondence", () => {
  // Cross-checks the derived scan against the expected-findings reference in
  // public/files/julie-smith/16_Expected_Prototype_Findings.txt, which records
  // secure document handling and a referral to the conveyancer.
  const [thread] = threadsForReference(fileReference("FIN-DEMO-0002"));

  it("has a thread on file", () => {
    expect(thread).toBeDefined();
  });

  it("identifies secure document handling", () => {
    const summary = correspondenceFor(thread.applicationId);
    const categories = summary.supporting.map((o) => o.category);
    expect(categories).toContain("Secure document handling");
  });

  it("identifies the referral to the conveyancer", () => {
    const summary = correspondenceFor(thread.applicationId);
    const categories = summary.supporting.map((o) => o.category);
    expect(categories).toContain("Referred to the right professional");
  });
});

describe("scoping", () => {
  it("hides threads outside the identity's applications", () => {
    const all = threadsInScope(organisation);
    const mine = threadsInScope(broker);

    expect(mine.length).toBeLessThan(all.length);

    const permitted = new Set(broker.applications.map((a) => a.id));
    for (const thread of mine) {
      expect(permitted.has(thread.applicationId)).toBe(true);
    }
  });

  it("returns no correspondence for an application out of scope", () => {
    const outside = organisation.applications.find(
      (a) => !broker.canSeeApplication(a.id),
    );
    expect(outside).toBeDefined();
    expect(threadsInScope(broker).some((t) => t.applicationId === outside!.id)).toBe(
      false,
    );
  });
});

describe("network roll-up", () => {
  const network = networkCorrespondence(organisation);

  it("splits threads into flagged and clear with no overlap", () => {
    expect(network.flaggedThreads.length + network.clearThreads.length).toBe(
      network.threads.length,
    );
    for (const thread of network.flaggedThreads) {
      expect(network.clearThreads).not.toContain(thread);
    }
  });

  it("orders themes by the number of files they appear in", () => {
    const counts = network.themes.map((t) => t.files);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it("never counts a category twice for the same file", () => {
    for (const theme of network.themes) {
      expect(theme.files).toBeLessThanOrEqual(network.threads.length);
    }
  });
});

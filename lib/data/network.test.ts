import { describe, expect, it } from "vitest";

import {
  APPLICATIONS,
  BRANCHES,
  BROKERS,
  findApplicationByReference,
  findBranch,
  findBroker,
  rollUpSeverity,
  severityOfStatus,
} from "./network";
import { THREADS, threadsForApplication } from "./threads";

describe("network record sets", () => {
  it("loads the documented record counts", () => {
    expect(BRANCHES).toHaveLength(30);
    expect(BROKERS).toHaveLength(100);
    expect(APPLICATIONS).toHaveLength(200);
  });

  it("gives every record a unique identifier", () => {
    expect(new Set(BRANCHES.map((b) => b.id)).size).toBe(BRANCHES.length);
    expect(new Set(BROKERS.map((b) => b.id)).size).toBe(BROKERS.length);
    expect(new Set(APPLICATIONS.map((a) => a.id)).size).toBe(
      APPLICATIONS.length,
    );
  });

  it("gives every record a unique URL slug", () => {
    expect(new Set(BRANCHES.map((b) => b.slug)).size).toBe(BRANCHES.length);
    expect(new Set(BROKERS.map((b) => b.slug)).size).toBe(BROKERS.length);
    expect(new Set(APPLICATIONS.map((a) => a.slug)).size).toBe(
      APPLICATIONS.length,
    );
  });
});

describe("referential integrity", () => {
  it("resolves every broker to a branch", () => {
    for (const broker of BROKERS) {
      expect(findBranch(broker.branchId), broker.id).toBeDefined();
    }
  });

  it("resolves every application to a broker and a branch", () => {
    for (const application of APPLICATIONS) {
      expect(findBroker(application.brokerId), application.id).toBeDefined();
      expect(findBranch(application.branchId), application.id).toBeDefined();
    }
  });

  it("places every application in the same branch as its broker", () => {
    for (const application of APPLICATIONS) {
      const broker = findBroker(application.brokerId);
      expect(broker?.branchId, application.id).toBe(application.branchId);
    }
  });
});

describe("correspondence", () => {
  it("loads the documented thread and message counts", () => {
    expect(THREADS).toHaveLength(18);
    const messages = THREADS.reduce((n, t) => n + t.messages.length, 0);
    expect(messages).toBe(77);
  });

  it("resolves every thread to an application in both directions", () => {
    for (const thread of THREADS) {
      const viaReference = findApplicationByReference(thread.reference);
      expect(viaReference?.id, thread.id).toBe(thread.applicationId);
      expect(threadsForApplication(thread.applicationId)).toContain(thread);
    }
  });

  it("keeps the reference and application numbering independent", () => {
    // FIN-DEMO-0019 belongs to a016, not a019 — the mapping must be read from
    // the archive rather than derived, and this guards that assumption.
    const application = findApplicationByReference(
      THREADS.find((t) => t.reference === "FIN-DEMO-0019")!.reference,
    );
    expect(application?.slug).toBe("a016");
  });

  it("only assigns a file reference to applications with correspondence", () => {
    const withReference = APPLICATIONS.filter((a) => a.fileReference !== null);
    expect(withReference).toHaveLength(THREADS.length);
  });
});

describe("severity", () => {
  it("maps statuses onto the documented tiers", () => {
    expect(severityOfStatus("Requires review")).toBe("attention");
    expect(severityOfStatus("Under assessment")).toBe("watch");
    expect(severityOfStatus("Settled")).toBe("ok");
  });

  it("rolls a group up to its most severe member", () => {
    expect(rollUpSeverity(["ok", "watch", "attention"])).toBe("attention");
    expect(rollUpSeverity(["ok", "watch"])).toBe("watch");
    expect(rollUpSeverity(["ok", "ok"])).toBe("ok");
    expect(rollUpSeverity([])).toBe("ok");
  });
});

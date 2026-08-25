import { describe, expect, it } from "vitest";

import { ask } from "./ask";
import { scopeFor } from "./identity";
import { userId } from "./types";

const organisation = scopeFor(userId("USER-ORG-001"));
const broker = scopeFor(userId("USER-BR-001"));

describe("ask", () => {
  it("routes network compliance questions to the compliance canvas", () => {
    const answer = ask(
      organisation,
      "Summarise the compliance review across the network",
    );
    expect(answer.view).toEqual({ kind: "compliance" });
    expect(answer.intro).toContain("review rules");
  });

  it("routes a network position question to the report", () => {
    const answer = ask(organisation, "Compile a network position report");
    expect(answer.view).toEqual({ kind: "networkReport" });
  });

  it("routes an attention question to the branches needing it", () => {
    const answer = ask(
      organisation,
      "Which branches need attention right now?",
    );
    expect(answer.view).toEqual({ kind: "networkReport" });
    expect(answer.intro).toContain("require attention");
  });

  it("resolves a named client to their application", () => {
    const answer = ask(organisation, "Julie Smith");
    expect(answer.view?.kind).toBe("application");
    expect(answer.intro).toContain("Julie Smith");
  });

  it("reads a client name with compliance wording as that file's findings", () => {
    const answer = ask(
      organisation,
      "What are the compliance findings for Julie Smith?",
    );
    expect(answer.view?.kind).toBe("application");
    expect(answer.findings?.length ?? 0).toBeGreaterThan(0);
  });

  it("reads a client name with email wording as their correspondence", () => {
    const answer = ask(organisation, "What did Julie Smith say in her emails?");
    expect(answer.view?.kind).toBe("thread");
  });

  /*
   * The guardrail that matters most here: a question about a real record that
   * this identity cannot see must not confirm the record exists.
   */
  it("does not reveal records outside the identity's scope", () => {
    /*
     * Mia Davis is another broker's client. The organisation sees her — as one
     * of several name matches, so the answer is a set of cards — while the
     * broker must find nothing at all.
     */
    const named = ask(organisation, "Mia Davis");
    const matched = [
      named.intro,
      ...(named.records ?? []).map((r) => r.name),
    ].join(" ");
    expect(matched).toContain("Mia Davis");

    const denied = ask(broker, "Mia Davis");
    expect(denied.intro).toContain("No record matching");
    expect(denied.outro).toContain("An absence of results is not a finding");
  });

  it("answers a broker about their own client", () => {
    const answer = ask(broker, "Julie Smith");
    expect(answer.intro).toContain("Julie Smith");
    expect(answer.view?.kind).toBe("application");
  });

  it("states what is in scope when nothing matches", () => {
    const answer = ask(organisation, "asdfghjkl");
    expect(answer.view).toBeNull();
    expect(answer.groups[0].points[0]).toContain("applications");
  });

  it("never returns an empty intro", () => {
    const questions = [
      "Julie Smith",
      "Which branches need attention right now?",
      "Compile a network position report",
      "Summarise the compliance review across the network",
      "Which branches have the lowest evidence coverage?",
      "asdfghjkl",
    ];
    for (const question of questions) {
      expect(
        ask(organisation, question).intro.length,
        question,
      ).toBeGreaterThan(0);
    }
  });
});

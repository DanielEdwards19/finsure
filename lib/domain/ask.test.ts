import { describe, expect, it } from "vitest";

import { ask, suggestions } from "./ask";
import { reviewForApplication } from "./compliance";
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
  /*
   * Every offered prompt must reach the answer it promises. These are the only
   * questions a reader is invited to click, so a prompt that lands on an
   * unrelated aggregate is a broken feature rather than a poor match.
   */
  describe("offered prompts", () => {
    it("answers each network prompt with the network", () => {
      const expected: Record<string, string> = {
        "Summarise the compliance review across the network": "compliance",
        "Which branches need attention right now?": "networkReport",
        "Generate a network compliance report across every branch":
          "networkReport",
      };

      for (const question of suggestions(organisation, { kind: "map" })) {
        expect(Object.keys(expected), question).toContain(question);
        expect(ask(organisation, question).view?.kind, question).toBe(
          expected[question],
        );
      }
    });

    it("answers each file prompt about the file on the canvas", () => {
      const focus = organisation.applications.find(
        (a) => reviewForApplication(organisation, a.id) != null,
      )!;

      for (const question of suggestions(organisation, {
        kind: "application",
        id: focus.id,
      })) {
        const answer = ask(organisation, question, { focus });

        expect(answer.intro, question).toContain(focus.customer);
        expect(["application", "thread"], question).toContain(
          answer.view?.kind,
        );
      }
    });

    it("offers file prompts for a broker, who has no branch network", () => {
      expect(suggestions(broker)).toContain(
        "What compliance findings are on this file?",
      );
    });
  });

  /*
   * Short lender names sit inside ordinary words: "ING" is in "findings" and
   * "waiting", and "right" is in "Wright". Matching on any substring answered
   * these questions with an unrelated lender or household, so the boundaries are
   * asserted directly.
   */
  describe("word boundaries", () => {
    it("does not read a lender out of an unrelated word", () => {
      const focus = organisation.applications.find(
        (a) => reviewForApplication(organisation, a.id) != null,
      )!;

      for (const question of [
        "What compliance findings are on this file?",
        "What information are we still waiting on?",
      ]) {
        const answer = ask(organisation, question, { focus });
        expect(answer.intro, question).not.toContain("are with ING");
      }
    });

    it("still answers a question that genuinely names a lender", () => {
      expect(
        ask(organisation, "How many applications are with ING?").intro,
      ).toContain("ING");
    });

    it("does not read a client name out of an unrelated word", () => {
      const answer = ask(
        organisation,
        "Which branches need attention right now?",
      );
      expect(answer.view?.kind).toBe("networkReport");
      expect(answer.intro).toContain("require attention");
    });

    it("prefers a broker over a client sharing the surname", () => {
      const answer = ask(organisation, "Show me Rachael Nguyen");
      expect(answer.view?.kind).toBe("broker");
      expect(answer.intro).toContain("Rachael Nguyen");
    });

    it("still resolves a partly typed name", () => {
      expect(ask(organisation, "Thomp").intro).toContain("Thompson");
    });
  });

  /*
   * GUARDRAIL: a file with no analysed correspondence has no findings either
   * way. The answer says so rather than returning an empty list, which would
   * read as a file with nothing outstanding.
   */
  it("says when a file has no analysed correspondence", () => {
    const unanalysed = organisation.applications.find(
      (a) => reviewForApplication(organisation, a.id) == null,
    )!;
    const answer = ask(
      organisation,
      "What compliance findings are on this file?",
      {
        focus: unanalysed,
      },
    );

    expect(answer.intro).toContain("no analysed correspondence");
    expect(answer.outro).toContain("Information required");
  });
});

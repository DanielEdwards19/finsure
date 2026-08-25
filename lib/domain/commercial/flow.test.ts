import { describe, expect, it } from "vitest";

import { VALUE_SOURCES } from "../types";
import {
  CHECKS,
  CONFIRMATIONS,
  DOCS,
  EFFECT_ORDER,
  FINDINGS,
  GATE,
  MATERIAL_QUESTIONS,
  PROGRESSION,
  QUESTIONS,
  SECTIONS,
  SOURCE_BROKER,
  SOURCE_CALC,
  SOURCE_EXISTING,
  findFlowDocument,
  findFlowFinding,
  type CheckContext,
} from "./flow";

const questions = Object.values(QUESTIONS);
const options = questions.flatMap((q) => q.options);

const documentIds = new Set(DOCS.map((d) => d.id));
const findingIds = new Set(FINDINGS.map((f) => f.id));
const sectionIds = new Set(SECTIONS.map((s) => s.id));

describe("catalogues", () => {
  it("gives every document a unique id", () => {
    expect(documentIds.size).toBe(DOCS.length);
  });

  it("gives every finding a unique id", () => {
    expect(findingIds.size).toBe(FINDINGS.length);
  });

  it("numbers sections consecutively from one", () => {
    expect(SECTIONS.map((s) => s.n)).toEqual(
      SECTIONS.map((_, index) => index + 1),
    );
  });

  it("files every document under a real section", () => {
    for (const doc of DOCS) {
      expect(sectionIds, doc.id).toContain(doc.section);
    }
  });

  it("files every finding under a real section", () => {
    for (const finding of FINDINGS) {
      expect(sectionIds, finding.id).toContain(finding.section);
    }
  });

  it("states why each document is required and who provides it", () => {
    for (const doc of DOCS) {
      expect(doc.why.length, doc.id).toBeGreaterThan(0);
      expect(doc.party.length, doc.id).toBeGreaterThan(0);
    }
  });

  it("gives every finding an explanation and a suggested action", () => {
    for (const finding of FINDINGS) {
      expect(finding.explanation.length, finding.id).toBeGreaterThan(0);
      expect(finding.action.length, finding.id).toBeGreaterThan(0);
      expect(EFFECT_ORDER, finding.id).toContain(finding.effect);
    }
  });

  it("resolves by id and returns null otherwise", () => {
    expect(findFlowDocument("doc-financials")?.section).toBe("financials");
    expect(findFlowDocument("doc-nope")).toBeNull();
    expect(findFlowFinding("fnd-smsf")?.effect).toBe("PAUSE");
    expect(findFlowFinding("fnd-nope")).toBeNull();
  });
});

describe("questions", () => {
  it("keys each question by its own id", () => {
    for (const [key, question] of Object.entries(QUESTIONS)) {
      expect(question.id).toBe(key);
    }
  });

  it("files every question under a real section", () => {
    for (const question of questions) {
      expect(sectionIds, question.id).toContain(question.section);
    }
  });

  it("gives every question text and at least one option", () => {
    for (const question of questions) {
      expect(question.text.length, question.id).toBeGreaterThan(0);
      expect(question.options.length, question.id).toBeGreaterThan(0);
    }
  });

  it("gives each option a unique value within its question", () => {
    for (const question of questions) {
      const values = question.options.map((o) => o.v);
      expect(new Set(values).size, question.id).toBe(values.length);
    }
  });

  it("asks for exactly eleven options to rank where ranking applies", () => {
    const ranked = questions.filter((q) => q.control === "rank3");
    expect(ranked.length).toBeGreaterThan(0);
    for (const question of ranked) {
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("decision matrix integrity", () => {
  // Typing the matrix catches shape errors; these catch dangling references.
  // A misspelt document id would otherwise drop a requirement in silence.
  it("only requires documents that exist", () => {
    for (const question of questions) {
      for (const doc of question.docs ?? []) {
        expect(documentIds, `${question.id} docs`).toContain(doc);
      }
      for (const option of question.options) {
        for (const doc of option.docs ?? []) {
          expect(documentIds, `${question.id}/${option.v}`).toContain(doc);
        }
        for (const doc of Object.keys(option.docStatus ?? {})) {
          expect(documentIds, `${question.id}/${option.v} docStatus`).toContain(
            doc,
          );
        }
      }
    }
  });

  it("only raises findings that exist", () => {
    for (const question of questions) {
      for (const finding of question.find ?? []) {
        expect(findingIds, `${question.id} find`).toContain(finding);
      }
      for (const option of question.options) {
        for (const finding of option.find ?? []) {
          expect(findingIds, `${question.id}/${option.v}`).toContain(finding);
        }
      }
    }
  });

  it("only clears findings that exist", () => {
    for (const question of questions) {
      for (const option of question.options) {
        for (const finding of option.clears ?? []) {
          expect(findingIds, `${question.id}/${option.v} clears`).toContain(
            finding,
          );
        }
      }
    }
  });

  it("only sets a document status from the permitted list", () => {
    const permitted = new Set([
      "Required",
      "Requested",
      "Obtained",
      "Not applicable",
      "Requires clarification",
    ]);
    for (const option of options) {
      for (const status of Object.values(option.docStatus ?? {})) {
        expect(permitted, option.v).toContain(status);
      }
    }
  });

  it("uses only the four progression effects", () => {
    for (const option of options) {
      if (option.prog) expect(EFFECT_ORDER).toContain(option.prog);
    }
  });

  /*
   * A few catalogue entries are raised by the engine from derived conditions
   * rather than by answering a question — an LVR above the policy threshold, a
   * working-capital shortfall, or a conflict between extracted values. They are
   * listed here so the orphan checks below stay meaningful: anything not
   * reachable from a question and not in these lists is genuinely unreachable.
   */
  const ENGINE_RAISED_DOCUMENTS = ["doc-bpd"];
  const ENGINE_RAISED_FINDINGS = [
    "fnd-wc-gap",
    "fnd-lvr-policy",
    "fnd-other-material",
    "fnd-extract-conflict",
    "fnd-extract-unconfirmed",
    "fnd-doc-gaps",
  ];

  it("reaches every document from a question or the engine", () => {
    // An unreachable document would never be requested of anyone.
    const reachable = new Set([
      ...ENGINE_RAISED_DOCUMENTS,
      ...questions.flatMap((q) => [
        ...(q.docs ?? []),
        ...q.options.flatMap((o) => [
          ...(o.docs ?? []),
          ...Object.keys(o.docStatus ?? {}),
        ]),
      ]),
    ]);
    const orphans = [...documentIds].filter((id) => !reachable.has(id));
    expect(orphans).toEqual([]);
  });

  it("reaches every finding from a question or the engine", () => {
    const reachable = new Set([
      ...ENGINE_RAISED_FINDINGS,
      ...questions.flatMap((q) => [
        ...(q.find ?? []),
        ...q.options.flatMap((o) => [...(o.find ?? []), ...(o.clears ?? [])]),
      ]),
    ]);
    const orphans = [...findingIds].filter((id) => !reachable.has(id));
    expect(orphans).toEqual([]);
  });

  it("clears a finding only where some option can raise it", () => {
    const raised = new Set(
      questions.flatMap((q) => [
        ...(q.find ?? []),
        ...q.options.flatMap((o) => o.find ?? []),
      ]),
    );
    for (const option of options) {
      for (const finding of option.clears ?? []) {
        expect(raised, `${option.v} clears`).toContain(finding);
      }
    }
  });

  it("marks an option exclusive only within a multi-select", () => {
    for (const question of questions) {
      for (const option of question.options) {
        if (option.exclusive) {
          expect(question.control, `${question.id}/${option.v}`).toBe("multi");
        }
      }
    }
  });

  it("requires prompted fields only where the question defines them", () => {
    for (const question of questions) {
      for (const option of question.options) {
        if (option.fieldsRequired) {
          expect(question.fields, `${question.id}/${option.v}`).toBeDefined();
          expect(question.fields!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("gives every prompted field a key, label and type", () => {
    for (const question of questions) {
      for (const field of question.fields ?? []) {
        expect(field.k.length, question.id).toBeGreaterThan(0);
        expect(field.label.length, `${question.id}/${field.k}`).toBeGreaterThan(
          0,
        );
        expect(["text", "num", "money"], `${question.id}/${field.k}`).toContain(
          field.type,
        );
      }
    }
  });

  it("names only real questions as material", () => {
    for (const id of MATERIAL_QUESTIONS) {
      expect(QUESTIONS[id], id).toBeDefined();
    }
  });
});

describe("provenance", () => {
  it("uses the permitted value sources", () => {
    // docs/DESIGN.md §2: every derived value carries one of four sources.
    expect(VALUE_SOURCES).toContain(SOURCE_BROKER);
    expect(VALUE_SOURCES).toContain(SOURCE_EXISTING);
    expect(VALUE_SOURCES).toContain(SOURCE_CALC);
  });
});

describe("progression", () => {
  it("maps every effect to a state and a tone", () => {
    for (const effect of EFFECT_ORDER) {
      const state = PROGRESSION[effect];
      expect(state, effect).toBeDefined();
      expect(["good", "warn", "bad", "muted"], effect).toContain(state.tone);
    }
  });

  it("reads a block as missing information rather than a refusal", () => {
    // docs/DESIGN.md §2: no credit decisions. "Blocked" describes the
    // comparison, not the application.
    expect(PROGRESSION.BLOCK.label).toBe("Comparison blocked");
    expect(PROGRESSION.OK.label).toBe("Comparison available");
    for (const state of Object.values(PROGRESSION)) {
      expect(state.label).not.toMatch(/declin|reject|approv|fail/i);
    }
  });
});

describe("checks and gate", () => {
  const empty: CheckContext = {
    fields: {},
    docs: [],
    comparisonOpened: false,
    recommendation: null,
    analysis: null,
    extracted: {},
    confirmations: {},
  };

  it("gives every check and gate item a unique id", () => {
    const ids = [...CHECKS, ...GATE].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves everything unmet on an empty application", () => {
    for (const check of CHECKS) {
      // Extraction passes vacuously: no analysis has run, so there is nothing
      // awaiting review.
      if (check.id === "chk-extraction") continue;
      expect(check.need(empty), check.id).toBe(false);
    }
    for (const item of GATE) {
      if (item.id === "g-extraction") continue;
      expect(item.need(empty), item.id).toBe(false);
    }
  });

  it("treats an unreviewed extracted value as outstanding", () => {
    const pending: CheckContext = {
      ...empty,
      analysis: { at: "2026-08-04T00:00:00.000Z" },
      extracted: { loanAmount: { status: "high_confidence" } },
    };
    expect(CHECKS.find((c) => c.id === "chk-extraction")!.need(pending)).toBe(
      false,
    );
    expect(GATE.find((c) => c.id === "g-extraction")!.need(pending)).toBe(
      false,
    );
  });

  it("accepts a confirmed or parked extracted value", () => {
    for (const status of [
      "broker_confirmed",
      "broker_edited",
      "requires_review",
      "heads_of_agreement_missing",
      "normalisation_evidence_required",
    ]) {
      const context: CheckContext = {
        ...empty,
        analysis: { at: "2026-08-04T00:00:00.000Z" },
        extracted: { loanAmount: { status } },
      };
      expect(
        CHECKS.find((c) => c.id === "chk-extraction")!.need(context),
        status,
      ).toBe(true);
    }
  });

  it("requires every confirmation before the final check passes", () => {
    const all = Object.fromEntries(CONFIRMATIONS.map((c) => [c.id, true]));
    const check = CHECKS.find((c) => c.id === "chk-brokerconfirm")!;

    expect(check.need({ ...empty, confirmations: all })).toBe(true);

    const missingOne = { ...all };
    delete missingOne[CONFIRMATIONS[0].id];
    expect(check.need({ ...empty, confirmations: missingOne })).toBe(false);
  });

  it("accepts recorded or pending authority, and nothing else", () => {
    const item = GATE.find((g) => g.id === "g-authority")!;
    expect(
      item.need({ ...empty, fields: { authorityStatus: "Recorded" } }),
    ).toBe(true);
    expect(
      item.need({ ...empty, fields: { authorityStatus: "Pending evidence" } }),
    ).toBe(true);
    expect(
      item.need({ ...empty, fields: { authorityStatus: "Not recorded" } }),
    ).toBe(false);
    expect(
      item.need({ ...empty, fields: { authorityStatus: "Client declined" } }),
    ).toBe(false);
  });

  it("requires exactly three ranked priorities", () => {
    const item = GATE.find((g) => g.id === "g-needs")!;
    expect(
      item.need({ ...empty, fields: { priorities: ["cost", "speed"] } }),
    ).toBe(false);
    expect(
      item.need({
        ...empty,
        fields: { priorities: ["cost", "speed", "flexibility"] },
      }),
    ).toBe(true);
    expect(
      item.need({
        ...empty,
        fields: { priorities: ["cost", "speed", "flexibility", "extra"] },
      }),
    ).toBe(false);
  });

  it("does not treat an unidentified client as identified", () => {
    const item = GATE.find((g) => g.id === "g-entity")!;
    expect(
      item.need({
        ...empty,
        fields: { entityType: "Company", clientStatus: "Not identified" },
      }),
    ).toBe(false);
    expect(
      item.need({
        ...empty,
        fields: {
          entityType: "Company",
          clientStatus: "Existing client record",
        },
      }),
    ).toBe(true);
  });
});

describe("confirmations", () => {
  it("gives every confirmation a unique id and a first-person label", () => {
    const ids = CONFIRMATIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const confirmation of CONFIRMATIONS) {
      expect(confirmation.label, confirmation.id).toMatch(/^I /);
    }
  });

  it("records that the product does not replace broker judgement", () => {
    const judgement = CONFIRMATIONS.find((c) => c.id === "cnf-judgement");
    expect(judgement).toBeDefined();
    expect(judgement!.label).toContain("does not provide legal advice");
  });
});

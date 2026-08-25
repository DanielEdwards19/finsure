import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/domain/clock";
import { VALUE_SOURCES } from "@/lib/domain/types";
import { currentQuestionId, extractionRows } from "./derive";
import { QUESTIONS } from "./flow";
import { reduce } from "./reducer";
import { createApplication, type CommercialState } from "./state";

const clock = fixedClock("2026-08-04T09:00:00.000Z");
const blank = (): CommercialState => createApplication(clock.now());

const answer = (
  state: CommercialState,
  qid: string,
  values: readonly string[],
  fields?: Readonly<Record<string, string>>,
): CommercialState =>
  reduce(state, { type: "answer", qid, payload: { values, fields } }, clock);

/**
 * Walks the guided flow, taking the first option of each question, until the
 * named question has been answered. The flow gates each question on the ones
 * before it, so a later question cannot be answered in isolation.
 */
function upTo(
  target: string,
  fields: Readonly<Record<string, string>> = {},
): CommercialState {
  let state = blank();

  for (let step = 0; step < 200; step += 1) {
    const qid = currentQuestionId(state);
    if (qid == null) break;

    const question = QUESTIONS[qid];
    const filled = Object.fromEntries(
      (question.fields ?? []).map((f) => [f.k, fields[f.k] ?? "1"]),
    );
    state = answer(state, qid, [question.options[0].v], {
      ...filled,
      ...fields,
    });

    if (qid === target) break;
  }

  return state;
}

/** Advances the file to the point where documents may be read. */
function withDocuments(): CommercialState {
  let state = blank();
  state = answer(state, "C01", ["existing"]);
  state = answer(state, "C03", ["recorded"]);
  state = answer(state, "I01", ["most"]);
  state = reduce(state, { type: "attachAll" }, clock);
  state = reduce(state, { type: "startAnalysis" }, clock);
  return reduce(state, { type: "completeAnalysis" }, clock);
}

describe("canvasSections", () => {
  it("opens with no rows and no section claiming progress", async () => {
    const { canvasSections } = await import("./sections");
    const sections = canvasSections(blank());

    expect(sections).toHaveLength(6);
    for (const section of sections) {
      expect(section.rows).toHaveLength(0);
      expect(section.state).toBe("Not started");
    }
  });

  it("grows a section as its questions are answered", async () => {
    const { canvasSections } = await import("./sections");
    const before = canvasSections(blank());
    const after = canvasSections(answer(blank(), "C02", ["company"]));

    const entitiesBefore = before.find((s) => s.id === "entities")!;
    const entitiesAfter = after.find((s) => s.id === "entities")!;

    expect(entitiesAfter.rows.length).toBeGreaterThan(
      entitiesBefore.rows.length,
    );
    expect(entitiesAfter.state).not.toBe("Not started");
  });

  it("withdraws the rows an answer produced when that answer is changed", async () => {
    const { canvasSections } = await import("./sections");
    const company = answer(blank(), "C02", ["company"]);
    const trust = answer(company, "C02", ["trust"]);

    const rowsOf = (state: CommercialState) =>
      canvasSections(state)
        .find((s) => s.id === "entities")!
        .rows.map((r) => `${r.label}=${r.value}`);

    expect(rowsOf(trust)).not.toEqual(rowsOf(company));
  });

  // GUARDRAIL: docs/DESIGN.md §2 — every derived value carries its source.
  it("gives every row one of the four permitted sources", async () => {
    const { canvasSections } = await import("./sections");
    const state = withDocuments();

    for (const section of canvasSections(state)) {
      for (const row of section.rows) {
        expect(VALUE_SOURCES).toContain(row.source);
      }
    }
  });

  // GUARDRAIL: docs/DESIGN.md §2 — no section ever reads as compliant.
  it("never labels a section compliant, verified or approved", async () => {
    const { canvasSections } = await import("./sections");
    const forbidden = /complian|verified|approved|guarantee|suitable/i;

    for (const section of canvasSections(withDocuments())) {
      expect(section.state).not.toMatch(forbidden);
    }
  });

  it("carries the formula behind every calculated figure", async () => {
    const { canvasSections } = await import("./sections");
    const state = upTo("T01", {
      purchasePrice: "1800000",
      loanAmount: "1350000",
      contribution: "450000",
    });

    const request = canvasSections(state).find((s) => s.id === "request")!;
    const lvr = request.rows.find((r) => r.label.startsWith("Requested LVR"));

    expect(lvr).toBeDefined();
    expect(lvr!.source).toBe("System calculation — indicative");
    expect(lvr!.basis).toBeTruthy();
    expect(request.formulas.length).toBeGreaterThan(0);
  });
});

describe("extractionRows", () => {
  it("is empty until documents have been analysed", () => {
    expect(extractionRows(blank())).toHaveLength(0);
  });

  // GUARDRAIL: nothing read from a document confirms itself.
  it("marks every extracted value as unconfirmed until the broker acts", () => {
    const rows = extractionRows(withDocuments());

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => !r.confirmed)).toBe(true);
  });

  it("cites the document and page behind every value", () => {
    for (const row of extractionRows(withDocuments())) {
      expect(row.citation).toMatch(/page \d+/);
    }
  });

  it("records the broker's confirmation against the value they confirmed", () => {
    const state = withDocuments();
    const first = extractionRows(state)[0];
    const confirmed = reduce(
      state,
      { type: "confirmExtracted", key: first.key },
      clock,
    );

    const row = extractionRows(confirmed).find((r) => r.key === first.key)!;
    expect(row.confirmed).toBe(true);
    expect(row.value).toBe(first.value);
  });

  it("keeps the original value on the record when the broker corrects one", () => {
    const state = withDocuments();
    const first = extractionRows(state)[0];
    const edited = reduce(
      state,
      { type: "editExtracted", key: first.key, value: "Corrected by hand" },
      clock,
    );

    const row = extractionRows(edited).find((r) => r.key === first.key)!;
    expect(row.value).toBe("Corrected by hand");
    expect(row.editedFrom).toBe(first.value);
    expect(row.confirmed).toBe(true);
  });
});

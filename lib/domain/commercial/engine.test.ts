import { describe, expect, it } from "vitest";

import { fixedClock, steppingClock } from "../clock";
import {
  activeFindings,
  calcs,
  currentQuestionId,
  deriveFields,
  docRegister,
  docSummary,
  gateItems,
  modulesActive,
  plan,
  progression,
  uploadStage,
} from "./derive";
import { CONFIRMATIONS, QUESTIONS } from "./flow";
import { DOC_PACK, INTENTIONAL_GAPS, SOURCE_MAP } from "./document-pack";
import { reduce, type CommercialAction } from "./reducer";
import { createApplication, type CommercialState } from "./state";

const AT = "2026-08-05T00:30:00.000Z";
const clock = fixedClock(AT);

const fresh = () => createApplication(AT);

const run = (
  actions: readonly CommercialAction[],
  state: CommercialState = fresh(),
  at = clock,
): CommercialState => actions.reduce((s, a) => reduce(s, a, at), state);

const answer = (
  qid: string,
  values: readonly string[],
  extra: Record<string, unknown> = {},
): CommercialAction => ({
  type: "answer",
  qid,
  payload: { values, ...extra },
});

/** Answers up to and including the borrowing entity. */
const OPENING_ANSWERS: readonly CommercialAction[] = [
  answer("I01", ["none"]),
  answer("C03", ["recorded"]),
  answer("C01", ["existing"], { clientId: "CLI-HARB-001" }),
  answer("C02", ["company"]),
];

describe("a new application", () => {
  it("records nothing derived", () => {
    const state = fresh();
    expect(state.answers).toEqual({});
    expect(state.audit).toEqual([]);
    expect(
      docRegister(state).filter((r) => r.status !== "Not applicable"),
    ).toEqual([]);
    expect(activeFindings(state)).toEqual([]);
  });

  it("takes its timestamps from the injected clock", () => {
    // The prototype called new Date() here, so the server and the browser
    // produced different markup for the same application.
    expect(fresh().createdAt).toBe(AT);
    expect(fresh()).toEqual(fresh());
  });

  it("opens on the document question", () => {
    expect(currentQuestionId(fresh())).toBe("I01");
  });

  it("cannot compare anything yet", () => {
    const prog = progression(fresh());
    expect(prog.canCompare).toBe(false);
    expect(prog.label).toBe("Comparison not yet available");
    expect(prog.outstanding.length).toBeGreaterThan(0);
  });
});

describe("determinism", () => {
  it("replays an action sequence to the same state", () => {
    // This is what makes server rendering safe and the engine testable.
    expect(run(OPENING_ANSWERS)).toEqual(run(OPENING_ANSWERS));
  });

  it("numbers audit entries sequentially rather than by time", () => {
    const state = run(OPENING_ANSWERS);
    expect(state.audit.map((a) => a.id)).toEqual([
      "AUD-001",
      "AUD-002",
      "AUD-003",
      "AUD-004",
    ]);
  });

  it("orders entries by the clock when it advances", () => {
    const state = run(OPENING_ANSWERS, fresh(), steppingClock(AT, 1000));
    const times = state.audit.map((a) => new Date(a.at).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("the question plan", () => {
  it("stops at authority when the client declines", () => {
    // Nothing further may be collected, so nothing further is asked.
    const state = run([answer("I01", ["none"]), answer("C03", ["declined"])]);
    expect(plan(state)).toEqual(["I01", "C03"]);
    expect(state.halted).toBe("Cannot continue without authority");
    expect(currentQuestionId(state)).toBeNull();
  });

  it("stops when authority has not yet been recorded", () => {
    const state = run([answer("I01", ["none"]), answer("C03", ["notyet"])]);
    expect(plan(state)).toEqual(["I01", "C03"]);
  });

  it("asks about the trustee only for a trust borrower", () => {
    const company = run([...OPENING_ANSWERS]);
    expect(plan(company)).not.toContain("C02A");

    const trust = run([
      answer("I01", ["none"]),
      answer("C03", ["recorded"]),
      answer("C01", ["existing"], { clientId: "CLI-HARB-001" }),
      answer("C02", ["trust"]),
    ]);
    expect(plan(trust)).toContain("C02A");
  });

  it("adds a specialist module when its purpose is selected", () => {
    const state = run([
      ...OPENING_ANSWERS,
      answer("C04", ["no"]),
      answer("P01", ["development"]),
    ]);
    expect(modulesActive(state).development).toBe(true);
    expect(plan(state)).toContain("D01");
  });

  it("withdraws a module's questions when its purpose is deselected", () => {
    const withModule = run([
      ...OPENING_ANSWERS,
      answer("C04", ["no"]),
      answer("P01", ["development"]),
    ]);
    expect(plan(withModule)).toContain("D01");

    const changed = reduce(withModule, answer("P01", ["purchase"]), clock);
    expect(plan(changed)).not.toContain("D01");
    expect(modulesActive(changed).development).toBe(false);
  });

  it("names only real questions in every reachable plan", () => {
    for (const qid of plan(run(OPENING_ANSWERS))) {
      expect(QUESTIONS[qid], qid).toBeDefined();
    }
  });
});

describe("withdrawing an answer withdraws its effects", () => {
  // The central property: nothing derived is stored, so a corrected answer
  // cannot leave a requirement or a finding behind.
  const asTrust = run([
    answer("I01", ["none"]),
    answer("C03", ["recorded"]),
    answer("C01", ["existing"], { clientId: "CLI-HARB-001" }),
    answer("C02", ["trust"]),
  ]);

  it("requires the trust deed while the borrower is a trust", () => {
    const deed = docRegister(asTrust).find((r) => r.id === "doc-trustdeed")!;
    expect(deed.status).toBe("Required");
    expect(activeFindings(asTrust).map((f) => f.id)).toContain(
      "fnd-entity-trust",
    );
  });

  it("drops the trust finding and requirement when the entity changes", () => {
    const asCompany = reduce(asTrust, answer("C02", ["company"]), clock);

    expect(activeFindings(asCompany).map((f) => f.id)).not.toContain(
      "fnd-entity-trust",
    );
    const deed = docRegister(asCompany).find((r) => r.id === "doc-trustdeed")!;
    expect(deed.status).toBe("Not applicable");
  });

  it("keeps the trust deed visible as not applicable rather than hiding it", () => {
    // Omitting it would leave no sign the question was considered.
    const deed = docRegister(fresh()).find((r) => r.id === "doc-trustdeed");
    expect(deed).toBeDefined();
    expect(deed!.status).toBe("Not applicable");
  });

  it("records what an answer actually changed in the audit", () => {
    const asCompany = reduce(asTrust, answer("C02", ["company"]), clock);
    const entry = asCompany.audit.at(-1)!;

    expect(entry.changed).toBe(true);
    expect(entry.from).toBe("Trust");
    expect(entry.to).toBe("Company");
    expect(entry.findingsResolved).toContain(
      "Entity structure requires review",
    );
  });

  it("raises a finding for an SMSF rather than assessing it", () => {
    const smsf = run([
      answer("I01", ["none"]),
      answer("C03", ["recorded"]),
      answer("C01", ["existing"], { clientId: "CLI-HARB-001" }),
      answer("C02", ["smsf"]),
    ]);
    const finding = activeFindings(smsf).find((f) => f.id === "fnd-smsf")!;
    expect(finding.effect).toBe("PAUSE");
    expect(finding.action).toMatch(/refer/i);
    expect(progression(smsf).canCompare).toBe(false);
  });
});

describe("fields", () => {
  it("fills entity details from an existing client record", () => {
    const state = run(OPENING_ANSWERS);
    const fields = deriveFields(state);
    expect(fields.legalName).toBe("Harbourview Allied Health Pty Ltd");
    expect(fields.abn).toBe("51 234 567 890");
  });

  it("holds money fields as numbers, not formatted strings", () => {
    const state = run([
      ...OPENING_ANSWERS,
      answer("C04", ["no"]),
      answer("P01", ["purchase"]),
      { type: "editField", key: "loanAmount", value: "$1,350,000" },
    ]);
    expect(deriveFields(state).loanAmount).toBe(1350000);
  });

  it("lets a canvas edit win over a value an answer set", () => {
    const state = run([
      ...OPENING_ANSWERS,
      { type: "editField", key: "legalName", value: "Corrected Name Pty Ltd" },
    ]);
    expect(deriveFields(state).legalName).toBe("Corrected Name Pty Ltd");
  });

  it("records a canvas edit in the audit with its previous value", () => {
    const state = run([
      ...OPENING_ANSWERS,
      {
        type: "editField",
        key: "legalName",
        value: "Corrected Name Pty Ltd",
        label: "Legal name",
      },
    ]);
    const entry = state.audit.at(-1)!;
    expect(entry.question).toBe("Canvas edit — Legal name");
    expect(entry.from).toBe("Harbourview Allied Health Pty Ltd");
    expect(entry.to).toBe("Corrected Name Pty Ltd");
  });
});

describe("indicative calculations", () => {
  const withFigures = run([
    ...OPENING_ANSWERS,
    { type: "editField", key: "purchasePrice", value: 1_850_000 },
    { type: "editField", key: "loanAmount", value: 1_350_000 },
    { type: "editField", key: "contribution", value: 500_000 },
    { type: "editField", key: "acqCosts", value: 74_000 },
    { type: "editField", key: "cashAvailable", value: 640_000 },
    { type: "editField", key: "ebitdaReported", value: 438_000 },
    { type: "editField", key: "existingDebt", value: 48_000 },
  ]);

  it("computes LVR from the requested loan and the price", () => {
    const c = calcs(withFigures);
    expect(c.lvr).toBeCloseTo(72.97, 2);
  });

  it("exposes the formula behind every figure", () => {
    // docs/DESIGN.md §2: a figure without its derivation is not renderable.
    const c = calcs(withFigures);
    expect(c.lvrFormula).toContain("÷");
    expect(c.totalFundsFormula).toContain("+");
    expect(c.workingCapitalFormula).toContain("−");
  });

  it("reports a shortfall as a negative position", () => {
    const c = calcs(withFigures);
    expect(c.totalFunds).toBe(1_924_000);
    expect(c.position).toBe(-74_000);
  });

  it("returns null rather than zero for a ratio it cannot compute", () => {
    const c = calcs(withFigures);
    expect(c.dscr).toBeNull();
    expect(c.dscrFormula).toBeNull();
  });

  it("excludes an unevidenced adjustment from normalised earnings", () => {
    // An add-back with no evidence must not raise the earnings an assessment
    // relies on, so it stays proposed rather than accepted.
    const withAdjustment = run(
      [
        answer("F02A", ["record"], {
          fields: {
            adjLabel: "One-off refurbishment",
            adjAmount: 24_000,
            adjEvidence: "Not available",
          },
        }),
      ],
      withFigures,
    );

    const c = calcs(withAdjustment);
    expect(withAdjustment.adjustments).toHaveLength(1);
    expect(withAdjustment.adjustments[0].accepted).toBe(false);
    expect(c.proposedAdjustments).toBe(24_000);
    expect(c.acceptedAdjustments).toBe(0);
    expect(c.normalisedEbitda).toBe(438_000);
  });

  it("includes an adjustment once evidence is held", () => {
    const withAdjustment = run(
      [
        answer("F02A", ["record"], {
          fields: {
            adjLabel: "One-off refurbishment",
            adjAmount: 24_000,
            adjEvidence: "Held on file",
          },
        }),
      ],
      withFigures,
    );
    expect(calcs(withAdjustment).normalisedEbitda).toBe(462_000);
  });

  it("raises a policy finding once the requested LVR passes the threshold", () => {
    expect(activeFindings(withFigures).map((f) => f.id)).toContain(
      "fnd-lvr-policy",
    );
  });
});

describe("material changes", () => {
  const confirmed = run([
    ...OPENING_ANSWERS,
    {
      type: "recommend",
      productId: "PROD-ANZ-BL",
      rationale: "Aligns with the recorded priorities.",
    },
    { type: "confirmRecommendation" },
    {
      type: "recordChoice",
      productId: "PROD-ANZ-BL",
      discussedVia: "Telephone",
      note: "Client selected.",
    },
    ...CONFIRMATIONS.map((c): CommercialAction => ({
      type: "setConfirmation",
      id: c.id,
      given: true,
    })),
  ]);

  it("holds every confirmation before the change", () => {
    expect(Object.keys(confirmed.confirmations)).toHaveLength(
      CONFIRMATIONS.length,
    );
    expect(confirmed.recommendation!.confirmed).toBe(true);
  });

  it("clears confirmations when a material fact is re-answered", () => {
    // A confirmation given against different information is not a confirmation
    // of what is now on file.
    const changed = reduce(confirmed, answer("C02", ["trust"]), clock);
    expect(changed.confirmations).toEqual({});
  });

  it("marks the recommendation and choice for reconfirmation, not deletion", () => {
    const changed = reduce(confirmed, answer("C02", ["trust"]), clock);
    expect(changed.recommendation).not.toBeNull();
    expect(changed.recommendation!.needsReconfirmation).toBe(true);
    expect(changed.choice!.needsReconfirmation).toBe(true);
  });

  it("reopens a finalised application", () => {
    const finalised = reduce(confirmed, { type: "finalise" }, clock);
    expect(finalised.finalised).toBe(AT);

    const changed = reduce(finalised, answer("C02", ["trust"]), clock);
    expect(changed.finalised).toBeNull();
  });

  it("clears confirmations when a material figure is edited on the canvas", () => {
    const changed = reduce(
      confirmed,
      { type: "editField", key: "loanAmount", value: 1_500_000 },
      clock,
    );
    expect(changed.confirmations).toEqual({});
    expect(changed.recommendation!.needsReconfirmation).toBe(true);
  });

  it("leaves confirmations alone for a non-material edit", () => {
    const changed = reduce(
      confirmed,
      { type: "editField", key: "operatingAccount", value: "Account 1234" },
      clock,
    );
    expect(Object.keys(changed.confirmations)).toHaveLength(
      CONFIRMATIONS.length,
    );
  });

  it("does not clear confirmations for a first-time answer", () => {
    // Answering something new is not changing a fact previously confirmed.
    const changed = reduce(confirmed, answer("N03", ["yes"]), clock);
    expect(Object.keys(changed.confirmations)).toHaveLength(
      CONFIRMATIONS.length,
    );
  });

  it("retains a replaced recommendation in the history", () => {
    const replaced = reduce(
      confirmed,
      { type: "recommend", productId: "PROD-CBA-BBL", rationale: "Revised." },
      clock,
    );
    expect(replaced.superseded).toHaveLength(1);
    expect(replaced.superseded[0].productId).toBe("PROD-ANZ-BL");
    expect(replaced.recommendation!.confirmed).toBe(false);
  });
});

describe("document intake", () => {
  const attached = run([
    answer("I01", ["most"]),
    answer("C03", ["recorded"]),
    { type: "attachAll" },
  ]);

  it("offers the upload step only once authority is recorded", () => {
    const beforeAuthority = run([answer("I01", ["most"])]);
    expect(uploadStage(beforeAuthority)).toBeNull();

    const authorised = run([
      answer("I01", ["most"]),
      answer("C03", ["recorded"]),
    ]);
    expect(uploadStage(authorised)).toBe("offer");
  });

  it("skips the upload step when the broker holds no documents", () => {
    expect(uploadStage(run(OPENING_ANSWERS))).toBeNull();
  });

  it("attaches the whole pack and audits each file", () => {
    expect(attached.attachments).toHaveLength(DOC_PACK.length);
    expect(uploadStage(attached)).toBe("attached");

    const attachEntries = attached.audit.filter(
      (a) => a.question === "Document attached",
    );
    expect(attachEntries).toHaveLength(DOC_PACK.length);
    for (const entry of attachEntries) {
      expect(entry.source).toContain("no upload occurred");
    }
  });

  it("gives every audit entry a unique id across mixed actions", () => {
    const ids = attached.audit.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const analysed = reduce(attached, { type: "completeAnalysis" }, clock);

  it("extracts every value the attached documents supply", () => {
    expect(Object.keys(analysed.extracted)).toHaveLength(
      Object.keys(SOURCE_MAP).length,
    );
    expect(uploadStage(analysed)).toBe("review");
  });

  it("leaves every extracted value awaiting the broker", () => {
    for (const [key, record] of Object.entries(analysed.extracted)) {
      expect(record.status, key).not.toBe("broker_confirmed");
      expect(record.status, key).not.toBe("broker_edited");
    }
  });

  it("populates the canvas from the extracted values", () => {
    const fields = deriveFields(analysed);
    expect(fields.purchasePrice).toBe(1_850_000);
    expect(fields.ebitdaReported).toBe(438_000);
    expect(fields.propertyAddress).toBe(
      "18 Riverstone Road, West End QLD 4101",
    );
  });

  it("answers questions the documents establish, with a citation each", () => {
    const fromDocuments = Object.values(analysed.answers).filter(
      (a) => a.fromDocuments,
    );
    expect(fromDocuments.length).toBeGreaterThan(0);

    for (const answered of fromDocuments) {
      const citation = analysed.docAnswers[answered.questionId];
      expect(citation, answered.questionId).toBeDefined();
      expect(citation.basis.length).toBeGreaterThan(20);
      expect(citation.page).toBeGreaterThan(0);
    }
  });

  it("does not echo a document answer as though the broker said it", () => {
    const brokerMessages = analysed.chat.filter((m) => m.role === "user");
    const documentQuestions = Object.values(analysed.answers)
      .filter((a) => a.fromDocuments)
      .map((a) => a.questionId);

    for (const qid of documentQuestions) {
      expect(
        brokerMessages.some((m) => m.qid === qid),
        qid,
      ).toBe(false);
    }
  });

  it("records the pack's known gaps as outstanding, not as adverse findings", () => {
    // docs/DESIGN.md §2: absence of a document is never proof of absence of a
    // fact.
    for (const gap of INTENTIONAL_GAPS) {
      const row = docRegister(analysed).find((r) => r.id === gap.docId)!;
      expect(row, gap.id).toBeDefined();
      expect(["Required", "Requires clarification"], gap.id).toContain(
        row.status,
      );
      expect(row.note, gap.id).toContain(
        "not evidence that the underlying fact does not exist",
      );
    }
  });

  it("does not mark a partly satisfied requirement as obtained", () => {
    // The FY2025 return is held; two years of returns are not.
    const taxReturns = docRegister(analysed).find(
      (r) => r.id === "doc-taxreturns",
    )!;
    expect(taxReturns.status).toBe("Requires clarification");

    const lease = docRegister(analysed).find(
      (r) => r.id === "doc-lease-radiology",
    )!;
    expect(lease.status).toBe("Requires clarification");
    expect(lease.note).toContain("draft occupancy plan");
  });

  it("marks fully supplied documents as obtained", () => {
    const financials = docRegister(analysed).find(
      (r) => r.id === "doc-financials",
    )!;
    expect(financials.status).toBe("Obtained");
    expect(financials.review).toBe("Not reviewed");
  });

  it("reports what it did without claiming an assessment", () => {
    const summary = analysed.chat.find((m) => m.kind === "analysis")!;
    expect(summary.text).toContain("Nothing here is an assessment");
    expect(summary.text).not.toMatch(/compliant|approved|suitable|verified/i);
  });

  it("holds a normalised figure for review rather than relying on it", () => {
    expect(analysed.extracted.normalisedEbitda.status).toBe(
      "normalisation_evidence_required",
    );
    expect(activeFindings(analysed).map((f) => f.id)).toContain(
      "fnd-adj-requested",
    );
  });

  it("keeps the occupancy matter on the file as a condition", () => {
    /*
     * The occupancy plan records the tenant, the area and that no lease exists,
     * and rent stays out of serviceability. That supersedes the general
     * "needs clarification" finding with the narrower one — the matter is not
     * dropped, it becomes a condition requiring lender confirmation.
     */
    const ids = activeFindings(analysed).map((f) => f.id);
    expect(ids).not.toContain("fnd-occupancy-thirdparty");
    expect(ids).toContain("fnd-occupancy-thirdparty-resolved");

    const finding = activeFindings(analysed).find(
      (f) => f.id === "fnd-occupancy-thirdparty-resolved",
    )!;
    expect(finding.effect).toBe("COND");
    expect(deriveFields(analysed).rentTreatment).toBe(
      "Excluded from serviceability until verified",
    );
  });

  it("flags that extracted values are unconfirmed", () => {
    expect(activeFindings(analysed).map((f) => f.id)).toContain(
      "fnd-extract-unconfirmed",
    );
  });
});

describe("confirming extracted values", () => {
  const analysed = run([
    answer("I01", ["most"]),
    answer("C03", ["recorded"]),
    { type: "attachAll" },
    { type: "completeAnalysis" },
  ]);

  it("records a confirmation against the broker", () => {
    const confirmed = reduce(
      analysed,
      { type: "confirmExtracted", key: "purchasePrice" },
      clock,
    );
    expect(confirmed.extracted.purchasePrice.status).toBe("broker_confirmed");
    expect(confirmed.audit.at(-1)!.source).toContain("Broker confirmed");
  });

  it("keeps the original when the broker edits a value", () => {
    const edited = reduce(
      analysed,
      { type: "editExtracted", key: "purchasePrice", value: 1_860_000 },
      clock,
    );
    expect(edited.extracted.purchasePrice.value).toBe(1_860_000);
    expect(edited.extracted.purchasePrice.editedFrom).toBe(1_850_000);
    expect(deriveFields(edited).purchasePrice).toBe(1_860_000);
  });

  it("does not bulk-confirm values held for review", () => {
    // Those need a decision, not an acknowledgement.
    const bulk = reduce(analysed, { type: "confirmAllExtracted" }, clock);
    expect(bulk.extracted.normalisedEbitda.status).toBe(
      "normalisation_evidence_required",
    );
    expect(bulk.extracted.proposedTenant.status).toBe(
      "heads_of_agreement_missing",
    );
    expect(bulk.extracted.purchasePrice.status).toBe("broker_confirmed");
  });

  it("leaves the review stage once the broker finishes", () => {
    const done = reduce(analysed, { type: "finishExtractionReview" }, clock);
    expect(uploadStage(done)).toBeNull();
  });
});

describe("removing a document after analysis", () => {
  const analysed = run([
    answer("I01", ["most"]),
    answer("C03", ["recorded"]),
    { type: "attachAll" },
    { type: "completeAnalysis" },
  ]);

  const removed = reduce(
    analysed,
    { type: "removeAttachment", id: "DOC-007" },
    clock,
  );

  it("withdraws the values that document supplied", () => {
    expect(analysed.extracted.purchasePrice).toBeDefined();
    expect(removed.extracted.purchasePrice).toBeUndefined();
    expect(removed.extracted.propertyAddress).toBeUndefined();
  });

  it("returns the questions it answered to the questionnaire", () => {
    expect(analysed.answers.T01).toBeDefined();
    expect(removed.answers.T01).toBeUndefined();
    expect(removed.docAnswers.T01).toBeUndefined();
  });

  it("clears confirmations, because the evidence changed", () => {
    expect(removed.confirmations).toEqual({});
  });

  it("says in the audit that the fields are outstanding again", () => {
    const notes = removed.audit.map((a) => a.to);
    expect(notes.some((n) => n.includes("outstanding again"))).toBe(true);
  });

  it("leaves other documents' values in place", () => {
    expect(
      removed.extracted.ebitdaReported ?? removed.extracted.normalisedEbitda,
    ).toBeDefined();
    expect(removed.extracted.legalEntityName).toBeDefined();
  });
});

describe("progression", () => {
  it("blocks while the client is unidentified", () => {
    const state = run([
      answer("I01", ["none"]),
      answer("C03", ["recorded"]),
      answer("C01", ["check"]),
    ]);
    const prog = progression(state);
    expect(prog.level).toBe("BLOCK");
    expect(prog.canCompare).toBe(false);
    expect(prog.canExplore).toBe(false);
    expect(prog.reasons.length).toBeGreaterThan(0);
  });

  it("describes the comparison, never the application's merits", () => {
    // docs/DESIGN.md §2: no credit decisions, no suitability statements.
    const state = run([
      answer("I01", ["none"]),
      answer("C03", ["recorded"]),
      answer("C01", ["check"]),
    ]);
    const prog = progression(state);
    expect(prog.label).toBe("Comparison blocked");
    expect(prog.label).not.toMatch(/declin|reject|approv|unsuitable/i);
  });

  it("reports gathering rather than available while the gate is incomplete", () => {
    // Saying "available" here would overstate what is known.
    const state = run(OPENING_ANSWERS);
    const prog = progression(state);
    expect(prog.level).toBe("OK");
    expect(prog.gateOk).toBe(false);
    expect(prog.label).toBe("Comparison not yet available");
    expect(prog.canCompare).toBe(false);
  });

  it("keeps a resolved finding on the file as a condition", () => {
    const trust = run([
      answer("I01", ["none"]),
      answer("C03", ["recorded"]),
      answer("C01", ["existing"], { clientId: "CLI-HARB-001" }),
      answer("C02", ["trust"]),
    ]);
    const resolved = reduce(
      trust,
      {
        type: "resolveFinding",
        id: "fnd-entity-trust",
        note: "Deed and trustee details recorded.",
      },
      clock,
    );

    const finding = activeFindings(resolved).find(
      (f) => f.id === "fnd-entity-trust",
    )!;
    expect(finding.resolved).toBe(true);
    expect(finding.effect).toBe("COND");
    expect(finding.resolutionNote).toBe("Deed and trustee details recorded.");
  });

  it("orders findings most restrictive first", () => {
    const state = run([
      answer("I01", ["none"]),
      answer("C03", ["pending"]),
      answer("C01", ["check"]),
      answer("C02", ["trust"]),
    ]);
    const effects = activeFindings(state).map((f) => f.effect);
    const rank = { BLOCK: 0, PAUSE: 1, COND: 2, INFO: 3 };
    const ranks = effects.map((e) => rank[e]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe("the evidence register", () => {
  it("summarises outstanding items", () => {
    const analysed = run([
      answer("I01", ["most"]),
      answer("C03", ["recorded"]),
      { type: "attachAll" },
      { type: "completeAnalysis" },
    ]);
    const summary = docSummary(analysed);
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.obtained).toBeGreaterThan(0);
    expect(summary.clarification).toBeGreaterThan(0);
    expect(summary.total).toBe(docRegister(analysed).length);
  });

  it("records a broker-created requirement as theirs", () => {
    const state = run([
      ...OPENING_ANSWERS,
      {
        type: "addDocRequirement",
        doc: {
          name: "Specialist tax opinion",
          why: "The client's adviser raised a residency question.",
          party: "Client adviser",
          period: "Before submission",
          section: "financials",
          status: "Required",
          note: "",
        },
      },
    ]);
    const row = docRegister(state).find((r) => r.broker)!;
    expect(row.name).toBe("Specialist tax opinion");
    expect(row.origins).toEqual(["Broker-created"]);
  });

  it("keeps a broker's status override over the derived one", () => {
    const state = run([
      ...OPENING_ANSWERS,
      {
        type: "setDocState",
        id: "doc-companyextract",
        patch: { status: "Obtained", note: "Search completed." },
      },
    ]);
    const row = docRegister(state).find((r) => r.id === "doc-companyextract")!;
    expect(row.status).toBe("Obtained");
    expect(row.note).toBe("Search completed.");
  });

  it("lists outstanding items before satisfied ones", () => {
    const analysed = run([
      answer("I01", ["most"]),
      answer("C03", ["recorded"]),
      { type: "attachAll" },
      { type: "completeAnalysis" },
    ]);
    const order = [
      "Requires clarification",
      "Required",
      "Requested",
      "Obtained",
      "Not applicable",
    ];
    const positions = docRegister(analysed).map((r) => order.indexOf(r.status));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe("the comparison", () => {
  const ready = run([
    ...OPENING_ANSWERS,
    { type: "openComparison" },
    { type: "runCalculator" },
  ]);

  it("records that panel limitations were disclosed when opened", () => {
    expect(ready.comparisonOpened).toBe(true);
    const entry = ready.audit.find(
      (a) => a.question === "Lender comparison opened",
    )!;
    expect(entry.to).toContain("Panel limitations");
  });

  it("keeps every calculator run, so earlier figures stay reconstructable", () => {
    const again = reduce(
      ready,
      { type: "runCalculator", inputs: { ...ready.calcInputs!, years: 20 } },
      clock,
    );
    expect(again.calcRuns).toHaveLength(2);
    expect(again.calcRuns[0].id).not.toBe(again.calcRuns[1].id);
    expect(again.calcRuns[0].inputs.years).toBe(15);
  });

  it("records the reason a product was set aside", () => {
    const excluded = reduce(
      ready,
      {
        type: "excludeProduct",
        productId: "PROD-NAB-BOL",
        reason: "Customer margin unknown.",
      },
      clock,
    );
    expect(excluded.excluded["PROD-NAB-BOL"].reason).toBe(
      "Customer margin unknown.",
    );
  });

  it("proposes a recommendation as unconfirmed until the broker confirms it", () => {
    const proposed = reduce(
      ready,
      {
        type: "recommend",
        productId: "PROD-ANZ-BL",
        rationale: "Aligns with the priorities.",
      },
      clock,
    );
    expect(proposed.recommendation!.confirmed).toBe(false);

    const confirmed = reduce(
      proposed,
      { type: "confirmRecommendation" },
      clock,
    );
    expect(confirmed.recommendation!.confirmed).toBe(true);
  });

  it("computes DSCR once a recommendation supplies a repayment", () => {
    const recommended = run(
      [
        { type: "editField", key: "ebitdaReported", value: 438_000 },
        { type: "editField", key: "existingDebt", value: 48_000 },
        { type: "recommend", productId: "PROD-ANZ-BL", rationale: "Aligns." },
      ],
      ready,
    );
    const c = calcs(recommended);
    expect(c.dscr).toBeCloseTo(2.573, 2);
    expect(c.dscrFormula).toContain("÷");
  });
});

describe("the gate", () => {
  it("names what is still outstanding rather than only refusing", () => {
    const items = gateItems(fresh());
    const unmet = items.filter((i) => !i.met);
    expect(unmet.length).toBeGreaterThan(0);
    for (const item of unmet) {
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("satisfies the authority item once authority is recorded", () => {
    const state = run([answer("I01", ["none"]), answer("C03", ["recorded"])]);
    const authority = gateItems(state).find((g) => g.id === "g-authority")!;
    expect(authority.met).toBe(true);
  });
});

/**
 * Commercial application — state transitions.
 *
 * One reducer, one action union. Every transition is a pure function of the
 * previous state, the action and an injected clock, which means a sequence of
 * actions replays to the same state on the server and in the browser.
 *
 * Two properties are deliberate and load-bearing:
 *
 *  - **Nothing derived is stored.** A transition records what the broker did,
 *    never its consequences. Documents, findings and figures are recomputed by
 *    `derive.ts`, so withdrawing an answer withdraws its effects.
 *  - **Every transition is audited.** The audit entry records what actually
 *    changed, by diffing the derived state before and after, rather than what
 *    the rule declared would change.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - Changing a material fact clears the broker's confirmations and marks the
 *    recommendation and the client's choice as needing reconfirmation. A
 *    confirmation given against different information is not a confirmation of
 *    what is now on file.
 *  - No transition sets a reviewer state on the broker's behalf.
 */

import type { Clock } from "../clock";
import {
  DOC_ANSWERS,
  DOC_PACK,
  FIELD_META,
  INTENTIONAL_GAPS,
  SOURCE_MAP,
  findPackDocument,
} from "./document-pack";
import {
  MATERIAL_QUESTIONS,
  QUESTIONS,
  SECTIONS,
  findFlowDocument,
  findFlowFinding,
  type Question,
} from "./flow";
import {
  activeFindings,
  deriveFields,
  docRegister,
  progression,
} from "./derive";
import {
  DEFAULT_CALC_INPUTS,
  findProduct,
  nextCalculatorRunId,
  runCalculator,
  type CalculatorInputs,
} from "./products";
import {
  SOURCE_DOCUMENTS,
  nextAuditId,
  type Adjustment,
  type Answer,
  type AuditEntry,
  type ChatMessage,
  type CommercialState,
  type DocState,
  type DocumentCitation,
  type ExtraDocument,
  type FieldInput,
} from "./state";
import { longDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface AnswerPayload {
  readonly values: readonly string[];
  readonly other?: string;
  readonly fields?: Readonly<Record<string, FieldInput>>;
  readonly clientId?: string;
  /** Set when the answer was read from a document rather than given. */
  readonly fromDocuments?: boolean;
  readonly citation?: DocumentCitation;
}

export type CommercialAction =
  | {
      readonly type: "answer";
      readonly qid: string;
      readonly payload: AnswerPayload;
    }
  | { readonly type: "revisit"; readonly qid: string | null }
  | {
      readonly type: "editField";
      readonly key: string;
      readonly value: FieldInput;
      readonly label?: string;
    }
  | {
      readonly type: "setDocState";
      readonly id: string;
      readonly patch: DocState;
    }
  | {
      readonly type: "addDocRequirement";
      readonly doc: Omit<ExtraDocument, "id" | "review">;
    }
  | {
      readonly type: "resolveFinding";
      readonly id: string;
      readonly note: string;
    }
  | { readonly type: "attachAll" }
  | { readonly type: "removeAttachment"; readonly id: string }
  | { readonly type: "startAnalysis" }
  | { readonly type: "completeAnalysis" }
  | { readonly type: "confirmExtracted"; readonly key: string }
  | {
      readonly type: "editExtracted";
      readonly key: string;
      readonly value: FieldInput;
    }
  | { readonly type: "confirmAllExtracted" }
  | { readonly type: "finishExtractionReview" }
  | { readonly type: "openSource"; readonly key: string }
  | { readonly type: "openComparison" }
  | { readonly type: "runCalculator"; readonly inputs?: CalculatorInputs }
  | {
      readonly type: "excludeProduct";
      readonly productId: string;
      readonly reason: string;
    }
  | {
      readonly type: "addManualOption";
      readonly lender: string;
      readonly product: string;
      readonly note: string;
    }
  | {
      readonly type: "recommend";
      readonly productId: string;
      readonly rationale: string;
    }
  | { readonly type: "confirmRecommendation" }
  | { readonly type: "recordDiscussion"; readonly note: string }
  | {
      readonly type: "recordChoice";
      readonly productId: string;
      readonly discussedVia: string;
      readonly note: string;
    }
  | {
      readonly type: "setConfirmation";
      readonly id: string;
      readonly given: boolean;
    }
  | { readonly type: "addNote"; readonly text: string }
  | { readonly type: "finalise" }
  | { readonly type: "advanceLenderStage" }
  | { readonly type: "confirmLenderItem"; readonly id: string };

// ---------------------------------------------------------------------------
// Audit helpers
// ---------------------------------------------------------------------------

const BLANK_DIFF = {
  fields: [] as readonly string[],
  docsAdded: [] as readonly string[],
  docsRemoved: [] as readonly string[],
  findingsAdded: [] as readonly string[],
  findingsResolved: [] as readonly string[],
};

/** An audit entry for an action with no question behind it. */
function event(
  state: CommercialState,
  clock: Clock,
  questionId: string,
  question: string,
  to: string,
  source: string,
  from: string | null = null,
): AuditEntry {
  return {
    id: nextAuditId(state),
    at: clock.now(),
    by: state.broker,
    questionId,
    question,
    from,
    to,
    changed: from != null,
    ...BLANK_DIFF,
    progression: progression(state).label,
    source,
  };
}

const append = (
  state: CommercialState,
  entry: AuditEntry,
): readonly AuditEntry[] => [...state.audit, entry];

const say = (
  state: CommercialState,
  text: string,
  kind: ChatMessage["kind"] = "effect",
): readonly ChatMessage[] => [...state.chat, { role: "assistant", text, kind }];

const documentNames = (ids: readonly string[]): readonly string[] =>
  ids.map((id) => findFlowDocument(id)?.name ?? id);

const findingHeadlines = (ids: readonly string[]): readonly string[] =>
  ids.map((id) => findFlowFinding(id)?.headline ?? id);

/** Fields whose value changes the figures a confirmation was given against. */
const MATERIAL_FIELDS = new Set([
  "loanAmount",
  "purchasePrice",
  "contribution",
  "ebitdaReported",
  "existingDebt",
  "term",
]);

/**
 * Withdraw the broker's confirmations and flag the recommendation and choice for
 * reconfirmation. Neither is deleted: the record of what was decided, and that
 * it now needs revisiting, are both part of the file.
 */
function invalidateConfirmations(state: CommercialState): CommercialState {
  return {
    ...state,
    confirmations: {},
    recommendation: state.recommendation
      ? { ...state.recommendation, needsReconfirmation: true }
      : null,
    choice: state.choice
      ? { ...state.choice, needsReconfirmation: true }
      : null,
    finalised: null,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function reduce(
  state: CommercialState,
  action: CommercialAction,
  clock: Clock,
): CommercialState {
  const now = clock.now();

  switch (action.type) {
    case "answer":
      return recordAnswer(state, action.qid, action.payload, clock);

    case "revisit":
      return { ...state, cursor: action.qid };

    case "editField": {
      const label = action.label ?? action.key;
      const before = deriveFields(state)[action.key];

      let next: CommercialState = {
        ...state,
        fieldEdits: { ...state.fieldEdits, [action.key]: action.value },
        updatedAt: now,
      };

      if (MATERIAL_FIELDS.has(action.key)) next = invalidateConfirmations(next);

      const entry: AuditEntry = {
        ...event(
          state,
          clock,
          "canvas-edit",
          `Canvas edit — ${label}`,
          String(action.value),
          "Broker edit on the application canvas",
          before == null ? "—" : String(before),
        ),
        progression: progression(next).label,
      };

      return {
        ...next,
        audit: append(state, entry),
        chat: say(
          state,
          `I have picked up your canvas edit to ${label} and recalculated the dependent figures. The change is in the audit history.`,
        ),
      };
    }

    case "setDocState": {
      const doc =
        findFlowDocument(action.id) ??
        state.extraDocs.find((d) => d.id === action.id);
      const summary = Object.entries(action.patch)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      return {
        ...state,
        docState: {
          ...state.docState,
          [action.id]: { ...state.docState[action.id], ...action.patch },
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "document-register",
            `Evidence register — ${doc?.name ?? action.id}`,
            summary,
            "Broker maintained the evidence register",
          ),
        ),
        updatedAt: now,
      };
    }

    case "addDocRequirement": {
      const record: ExtraDocument = {
        ...action.doc,
        id: `doc-broker-${state.extraDocs.length + 1}`,
        review: "Not reviewed",
      };
      return {
        ...state,
        extraDocs: [...state.extraDocs, record],
        audit: append(
          state,
          event(
            state,
            clock,
            "document-register",
            "Evidence register — item added",
            record.name,
            "Broker-created requirement",
          ),
        ),
        updatedAt: now,
      };
    }

    case "resolveFinding": {
      const finding = findFlowFinding(action.id);
      const next: CommercialState = {
        ...state,
        resolvedFindings: {
          ...state.resolvedFindings,
          [action.id]: action.note,
        },
        updatedAt: now,
      };
      const entry: AuditEntry = {
        ...event(
          state,
          clock,
          "finding",
          `Finding — ${finding?.headline ?? action.id}`,
          "Policy confirmation required",
          "Broker recorded the clarification",
          finding?.effect ?? null,
        ),
        findingsResolved: findingHeadlines([action.id]),
        progression: progression(next).label,
      };
      return { ...next, audit: append(state, entry) };
    }

    case "attachAll": {
      const ids = DOC_PACK.map((d) => d.documentId);
      const entries = ids.map((id, index) => {
        const doc = findPackDocument(id)!;
        return {
          ...event(
            state,
            clock,
            "documents",
            "Document attached",
            `${doc.displayName} (${doc.typeLabel}, ${doc.sizeLabel})`,
            "Attached from the bundled prototype pack — no upload occurred",
          ),
          id: `AUD-${String(state.audit.length + 1 + index).padStart(3, "0")}`,
          progression: "—",
        };
      });

      return {
        ...state,
        attachments: ids,
        audit: [...state.audit, ...entries],
        chat: say(
          state,
          `I have attached the ${ids.length} documents held for this application. Open any of them before analysis, or remove anything that should not be included.`,
        ),
        updatedAt: now,
      };
    }

    case "removeAttachment":
      return removeAttachment(state, action.id, clock);

    case "startAnalysis":
      return { ...state, analysing: true, updatedAt: now };

    case "completeAnalysis":
      return completeAnalysis(state, clock);

    case "confirmExtracted": {
      const record = state.extracted[action.key];
      if (!record) return state;
      const meta = FIELD_META[action.key];

      return {
        ...state,
        extracted: {
          ...state.extracted,
          [action.key]: {
            ...record,
            status: "broker_confirmed",
            confirmedAt: now,
          },
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "extraction",
            `Extracted value confirmed — ${meta?.label ?? action.key}`,
            String(record.value),
            "Broker confirmed the extracted value",
          ),
        ),
        updatedAt: now,
      };
    }

    case "editExtracted": {
      const record = state.extracted[action.key];
      if (!record) return state;
      const meta = FIELD_META[action.key];

      return {
        ...state,
        extracted: {
          ...state.extracted,
          [action.key]: {
            ...record,
            status: "broker_edited",
            value: action.value,
            editedFrom: record.editedFrom ?? record.value,
            confirmedAt: now,
          },
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "extraction",
            `Extracted value edited — ${meta?.label ?? action.key}`,
            String(action.value),
            "Broker edited the extracted value",
            String(record.value),
          ),
        ),
        updatedAt: now,
      };
    }

    case "confirmAllExtracted": {
      /*
       * Bulk confirmation applies only to values that are simply awaiting
       * confirmation. Anything held for review — an unevidenced normalisation, a
       * missing heads of agreement, a conflict — is deliberately left, because
       * those need a decision rather than an acknowledgement.
       */
      const CONFIRMABLE = new Set([
        "needs_broker_confirmation",
        "confirmed_by_two_documents",
      ]);

      const extracted = Object.fromEntries(
        Object.entries(state.extracted).map(([key, record]) =>
          CONFIRMABLE.has(record.status)
            ? [
                key,
                {
                  ...record,
                  status: "broker_confirmed" as const,
                  confirmedAt: now,
                },
              ]
            : [key, record],
        ),
      );

      const count = Object.values(extracted).filter(
        (r) => r.status === "broker_confirmed",
      ).length;

      return {
        ...state,
        extracted,
        audit: append(
          state,
          event(
            state,
            clock,
            "extraction",
            "Extracted values confirmed",
            `${count} values confirmed. Values held for review were not included.`,
            "Broker confirmed the extracted values",
          ),
        ),
        updatedAt: now,
      };
    }

    case "finishExtractionReview":
      return {
        ...state,
        extractionReviewed: true,
        audit: append(
          state,
          event(
            state,
            clock,
            "extraction",
            "Extraction review completed",
            "The broker finished reviewing the extracted values",
            "Broker completed the extraction review",
          ),
        ),
        updatedAt: now,
      };

    case "openSource": {
      const entry = SOURCE_MAP[action.key];
      if (!entry) return state;
      return {
        ...state,
        sourceOpens: [
          ...state.sourceOpens,
          { key: action.key, docId: entry.source, page: entry.page, at: now },
        ],
        updatedAt: now,
      };
    }

    case "openComparison": {
      if (state.comparisonOpened) return state;
      return {
        ...state,
        comparisonOpened: true,
        audit: append(
          state,
          event(
            state,
            clock,
            "comparison",
            "Lender comparison opened",
            "Panel limitations, fees and conflicts disclosed",
            "System calculation — indicative",
          ),
        ),
        updatedAt: now,
      };
    }

    case "runCalculator": {
      const inputs = action.inputs ?? state.calcInputs ?? DEFAULT_CALC_INPUTS;
      const run = runCalculator(inputs, {
        id: nextCalculatorRunId(state.calcRuns),
        clock,
      });

      return {
        ...state,
        calcInputs: inputs,
        calcRuns: [...state.calcRuns, run],
        audit: append(
          state,
          event(
            state,
            clock,
            "comparison",
            `Indicative calculation — ${run.id}`,
            `${run.rows.length} products calculated on the recorded assumptions`,
            "System calculation — indicative",
          ),
        ),
        updatedAt: now,
      };
    }

    case "excludeProduct": {
      const product = findProduct(action.productId);
      return {
        ...state,
        excluded: {
          ...state.excluded,
          [action.productId]: {
            productId: action.productId,
            reason: action.reason,
            at: now,
          },
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "comparison",
            `Product set aside — ${product?.product ?? action.productId}`,
            action.reason,
            "Broker recorded the reason",
          ),
        ),
        updatedAt: now,
      };
    }

    case "addManualOption": {
      const record = {
        id: `MAN-${state.manualOptions.length + 1}`,
        lender: action.lender,
        product: action.product,
        note: action.note,
      };
      return {
        ...state,
        manualOptions: [...state.manualOptions, record],
        audit: append(
          state,
          event(
            state,
            clock,
            "comparison",
            "Option added outside the panel",
            `${record.lender} — ${record.product}`,
            "Broker-created option",
          ),
        ),
        updatedAt: now,
      };
    }

    case "recommend": {
      const product = findProduct(action.productId);
      // A replaced recommendation is retained, so the history shows what was
      // proposed before and that it changed.
      const superseded = state.recommendation
        ? [...state.superseded, state.recommendation]
        : state.superseded;

      return {
        ...state,
        superseded,
        recommendation: {
          productId: action.productId,
          rationale: action.rationale,
          confirmed: false,
          at: now,
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "recommendation",
            "Proposed recommendation recorded",
            `${product?.product ?? action.productId} — awaiting broker confirmation`,
            "Broker recorded the rationale",
          ),
        ),
        updatedAt: now,
      };
    }

    case "confirmRecommendation": {
      if (!state.recommendation) return state;
      return {
        ...state,
        recommendation: {
          ...state.recommendation,
          confirmed: true,
          needsReconfirmation: false,
          at: now,
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "recommendation",
            "Recommendation confirmed by the broker",
            state.recommendation.rationale,
            "Broker confirmation",
          ),
        ),
        updatedAt: now,
      };
    }

    case "recordDiscussion":
      return {
        ...state,
        discussion: action.note,
        audit: append(
          state,
          event(
            state,
            clock,
            "recommendation",
            "Options discussed with the client",
            action.note,
            "Broker recorded the discussion",
          ),
        ),
        updatedAt: now,
      };

    case "recordChoice": {
      const product = findProduct(action.productId);
      return {
        ...state,
        choice: {
          productId: action.productId,
          recordedAt: now,
          discussedVia: action.discussedVia,
          note: action.note,
        },
        audit: append(
          state,
          event(
            state,
            clock,
            "recommendation",
            "Client choice recorded",
            `${product?.product ?? action.productId} — ${action.discussedVia}`,
            "Broker recorded the client's decision",
          ),
        ),
        updatedAt: now,
      };
    }

    case "setConfirmation": {
      const confirmations = { ...state.confirmations };
      if (action.given) confirmations[action.id] = now;
      else delete confirmations[action.id];
      return { ...state, confirmations, updatedAt: now };
    }

    case "addNote":
      return {
        ...state,
        notes: [...state.notes, action.text],
        updatedAt: now,
      };

    case "finalise":
      return {
        ...state,
        finalised: now,
        audit: append(
          state,
          event(
            state,
            clock,
            "final",
            "Application finalised for lender submission",
            "Broker confirmed the application is ready to submit",
            "Broker confirmation",
          ),
        ),
        updatedAt: now,
      };

    case "advanceLenderStage":
      return { ...state, lenderStage: state.lenderStage + 1, updatedAt: now };

    case "confirmLenderItem":
      return {
        ...state,
        lenderConfirmed: { ...state.lenderConfirmed, [action.id]: true },
        updatedAt: now,
      };
  }
}

// ---------------------------------------------------------------------------
// Answering a question
// ---------------------------------------------------------------------------

const labelsFor = (
  question: Question,
  values: readonly string[],
): readonly string[] =>
  values.map(
    (value) => question.options.find((o) => o.v === value)?.label ?? value,
  );

function recordAnswer(
  state: CommercialState,
  qid: string,
  payload: AnswerPayload,
  clock: Clock,
): CommercialState {
  const question = QUESTIONS[qid];
  if (!question) return state;

  const now = clock.now();
  const previous = state.answers[qid];
  const values = payload.values;

  const record: Answer = {
    questionId: qid,
    values,
    labels: labelsFor(question, values),
    other: payload.other ?? "",
    fields: payload.fields ?? {},
    at: now,
    by: state.broker,
    source: payload.fromDocuments
      ? SOURCE_DOCUMENTS
      : "Broker-provided during guided setup",
    fromDocuments: !!payload.fromDocuments,
  };

  let next: CommercialState = {
    ...state,
    answers: { ...state.answers, [qid]: record },
    updatedAt: now,
  };

  const chosen = question.options.filter((o) => values.includes(o.v));

  for (const option of chosen) {
    if (option.picker === "client" && payload.clientId) {
      next = { ...next, clientId: payload.clientId };
    }
    if (option.halt) next = { ...next, halted: option.halt };
    if (option.docStatus) {
      const docState = { ...next.docState };
      for (const [id, status] of Object.entries(option.docStatus)) {
        docState[id] = { ...docState[id], status };
      }
      next = { ...next, docState };
    }
  }
  if (payload.clientId) next = { ...next, clientId: payload.clientId };

  if (payload.citation) {
    next = {
      ...next,
      docAnswers: { ...next.docAnswers, [qid]: payload.citation },
    };
  }

  next = recordAdjustment(next, qid, values, payload);

  // The broker's selection reads back as their own message. An answer read from
  // a document is not echoed as if the broker had said it.
  let chat = next.chat;
  if (!payload.fromDocuments) {
    const shown =
      record.labels.join(", ") + (record.other ? ` — ${record.other}` : "");
    chat = [
      ...chat,
      { role: "user", text: shown || record.other || "Recorded", qid },
    ];
  }

  /*
   * The audit records what the answer actually changed, found by comparing the
   * derived state before and after. A declared effect that did not apply — a
   * document already required, a finding another answer cleared — does not
   * appear, because it did not happen.
   */
  const docsBefore = docRegister(state).map((d) => d.id);
  const docsAfter = docRegister(next).map((d) => d.id);
  const findsBefore = activeFindings(state).map((f) => f.id);
  const findsAfter = activeFindings(next).map((f) => f.id);

  const diff = {
    docsAdded: docsAfter.filter((d) => !docsBefore.includes(d)),
    docsRemoved: docsBefore.filter((d) => !docsAfter.includes(d)),
    findingsAdded: findsAfter.filter((f) => !findsBefore.includes(f)),
    findingsResolved: findsBefore.filter((f) => !findsAfter.includes(f)),
  };

  const progBefore = progression(state);
  const progAfter = progression(next);

  const entry: AuditEntry = {
    id: nextAuditId(state),
    at: now,
    by: state.broker,
    questionId: qid,
    question:
      (payload.fromDocuments ? "Answered from documents — " : "") +
      question.text,
    from: previous ? previous.labels.join(", ") : null,
    to: record.labels.join(", ") + (record.other ? ` — ${record.other}` : ""),
    changed: !!previous,
    fields: Object.entries(record.fields)
      .filter(([, value]) => value !== "" && value != null)
      .map(([key]) => key),
    docsAdded: documentNames(diff.docsAdded),
    docsRemoved: documentNames(diff.docsRemoved),
    findingsAdded: findingHeadlines(diff.findingsAdded),
    findingsResolved: findingHeadlines(diff.findingsResolved),
    progression: progAfter.label,
    source: payload.fromDocuments
      ? `${SOURCE_DOCUMENTS} — ${payload.citation?.docId ?? "prototype pack"}`
      : "Broker-provided during guided setup",
  };

  next = { ...next, audit: append(state, entry) };

  // Re-answering a material question withdraws the confirmations given against
  // the earlier information.
  if (previous && MATERIAL_QUESTIONS.includes(qid)) {
    next = invalidateConfirmations(next);
  }

  if (!payload.fromDocuments) {
    const explanation = explainEffect(question, {
      ...diff,
      changed: !!previous,
      progBefore: progBefore.label,
      progAfter: progAfter.label,
    });
    if (explanation) {
      chat = [
        ...chat,
        { role: "assistant", text: explanation, kind: "effect" },
      ];
    }
  }

  // Some options keep the question open, so the broker can revise in place.
  const stay = chosen.some((o) => o.stay);

  return { ...next, chat, cursor: stay ? qid : null };
}

/**
 * A structured normalisation adjustment, recorded from the F02A answer.
 *
 * `accepted` turns on whether evidence is held or being obtained. An adjustment
 * with no evidence is retained as proposed but excluded from the normalised
 * figure, so an unevidenced add-back cannot raise assessed earnings.
 */
function recordAdjustment(
  state: CommercialState,
  qid: string,
  values: readonly string[],
  payload: AnswerPayload,
): CommercialState {
  if (qid !== "F02A" || !values.includes("record")) return state;

  const fields = payload.fields ?? {};
  const label = fields.adjLabel;
  if (!label) return state;

  const evidence = String(fields.adjEvidence ?? "").toLowerCase();
  const adjustment: Adjustment = {
    id: `ADJ-${state.adjustments.length + 1}`,
    label: String(label),
    amount: Number(fields.adjAmount) || 0,
    period: String(fields.adjPeriod ?? ""),
    reason: String(fields.adjReason ?? ""),
    recurring: String(fields.adjRecurring ?? ""),
    evidence: String(fields.adjEvidence ?? ""),
    accepted:
      evidence.includes("obtain") ||
      evidence.includes("held") ||
      evidence.includes("review"),
  };

  return { ...state, adjustments: [...state.adjustments, adjustment] };
}

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

const lower = (text: string): string =>
  text ? text.charAt(0).toLowerCase() + text.slice(1) : text;

const sectionName = (id: string): string =>
  SECTIONS.find((s) => s.id === id)?.title ?? "the application";

const PROGRESSION_PHRASE: Record<string, string> = {
  "Comparison blocked": "blocked until that is resolved",
  "Comparison paused": "paused until that is reviewed or clarified",
  "Available with conditions": "available with conditions",
  "Comparison available": "available",
  "Comparison not yet available": "not yet available",
};

export interface EffectSummary {
  readonly changed: boolean;
  readonly docsAdded: readonly string[];
  readonly docsRemoved: readonly string[];
  readonly findingsAdded: readonly string[];
  readonly findingsResolved: readonly string[];
  readonly progBefore: string;
  readonly progAfter: string;
}

/**
 * Describe what an answer changed, in plain terms. States what happened and
 * what it means for the comparison; makes no assessment and offers no
 * reassurance.
 */
export function explainEffect(
  question: Question,
  effect: EffectSummary,
): string {
  const parts: string[] = [];

  if (effect.changed) {
    const section =
      question.section === "security"
        ? "the security and property record"
        : sectionName(question.section);
    parts.push(`I have updated ${lower(section)}.`);
  }

  const raised = effect.findingsAdded[0];
  if (raised) parts.push(`${findFlowFinding(raised)?.headline ?? raised}.`);

  const resolved = effect.findingsResolved[0];
  if (resolved) {
    parts.push(
      `Resolved: ${lower(findFlowFinding(resolved)?.headline ?? resolved)}.`,
    );
  }

  if (effect.docsAdded.length) {
    const shown = effect.docsAdded.slice(0, 3);
    const extra = effect.docsAdded.length - shown.length;
    parts.push(
      `Added to the evidence register: ${shown.join("; ")}${extra > 0 ? ` and ${extra} more` : ""}.`,
    );
  }

  if (effect.docsRemoved.length) {
    const count = effect.docsRemoved.length;
    parts.push(
      `Removed ${count} requirement${count > 1 ? "s" : ""} that only applied to the previous answer.`,
    );
  }

  if (effect.progAfter !== effect.progBefore) {
    const phrase =
      PROGRESSION_PHRASE[effect.progAfter] ?? lower(effect.progAfter);
    parts.push(`Lender comparison is now ${phrase}.`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Document intake
// ---------------------------------------------------------------------------

/** Pack documents that satisfy a register requirement. */
const PACK_TO_REGISTER: readonly { docId: string; registerId: string }[] = [
  { docId: "DOC-001", registerId: "doc-companyextract" },
  { docId: "DOC-002", registerId: "doc-financials" },
  { docId: "DOC-003", registerId: "doc-taxreturns" },
  { docId: "DOC-004", registerId: "doc-mgmt" },
  { docId: "DOC-005", registerId: "doc-bank" },
  { docId: "DOC-006", registerId: "doc-debtsched" },
  { docId: "DOC-007", registerId: "doc-contract" },
  { docId: "DOC-008", registerId: "doc-deposit" },
  { docId: "DOC-009", registerId: "doc-dirpal" },
  { docId: "DOC-010", registerId: "doc-id" },
  { docId: "DOC-011", registerId: "doc-lease-radiology" },
];

/**
 * Requirements a pack document only partly satisfies. Marking these obtained
 * would overstate what is held — the FY2025 return is not two years of returns,
 * and a draft occupancy plan is not a lease.
 */
const PACK_PARTIAL: Readonly<Record<string, DocState>> = {
  "doc-taxreturns": {
    status: "Requires clarification",
    review: "Further information required",
    note: "The FY2025 return is held. The FY2026 return is outstanding, so the two-year requirement is only partly met.",
  },
  "doc-lease-radiology": {
    status: "Requires clarification",
    review: "Further information required",
    note: "A draft occupancy plan is held. No lease or heads of agreement is in the pack.",
  },
  "doc-deposit": {
    status: "Obtained",
    review: "Not reviewed",
    note: "The receipt evidences the deposit. Evidence of the balance of the contribution is outstanding.",
  },
};

/** Gaps needing clarification rather than simply being outstanding. */
const CLARIFICATION_GAPS = new Set(["gap-lease", "gap-fy26tax"]);

function completeAnalysis(
  state: CommercialState,
  clock: Clock,
): CommercialState {
  const now = clock.now();
  const ids = state.attachments;

  const extracted = { ...state.extracted };
  const docState = { ...state.docState };
  const entries: AuditEntry[] = [];
  const fields = deriveFields(state);
  let conflicts = 0;

  const addEntry = (question: string, to: string, source: string) => {
    entries.push({
      id: `AUD-${String(state.audit.length + entries.length + 1).padStart(3, "0")}`,
      at: now,
      by: state.broker,
      questionId: "documents",
      question,
      from: null,
      to,
      changed: false,
      ...BLANK_DIFF,
      progression: "—",
      source,
    });
  };

  for (const [key, entry] of Object.entries(SOURCE_MAP)) {
    if (!ids.includes(entry.source)) continue;

    const meta = FIELD_META[key];
    const existing = meta ? fields[meta.appKey] : null;

    /*
     * A conflict is a recorded value that disagrees with the document. It is
     * flagged for the broker rather than overwritten in either direction: the
     * document is not automatically right, and neither is the earlier entry.
     */
    const agrees =
      existing == null ||
      existing === "" ||
      String(existing) === String(entry.value) ||
      (typeof existing === "number" && Number(entry.value) === existing);

    if (!agrees) conflicts++;

    extracted[key] = {
      status: agrees ? entry.reviewStatus : "conflicting",
      value: entry.value,
      priorValue: agrees ? null : (existing as FieldInput),
      at: now,
    };

    const source = findPackDocument(entry.source);
    addEntry(
      agrees ? "Field extracted" : "Conflict or gap identified",
      `${meta?.label ?? key}: ${entry.value}${
        agrees ? "" : ` — conflicts with the recorded value ${existing}`
      }`,
      `Hardcoded prototype extraction — ${source?.displayName ?? entry.source}, page ${entry.page}`,
    );
  }

  for (const { docId, registerId } of PACK_TO_REGISTER) {
    if (!ids.includes(docId)) continue;
    const partial = PACK_PARTIAL[registerId];
    const attachedOn = longDate(new Date(now));

    docState[registerId] = partial
      ? { ...partial, requested: "Attached at intake", obtained: attachedOn }
      : {
          status: "Obtained",
          review: "Not reviewed",
          requested: "Attached at intake",
          obtained: attachedOn,
          note: `Sourced from ${findPackDocument(docId)?.displayName ?? docId} (prototype pack).`,
        };
  }

  /*
   * GUARDRAIL: the pack does not contain these. Each becomes an outstanding
   * requirement with the reason recorded — never a finding that the underlying
   * fact is absent.
   */
  for (const gap of INTENTIONAL_GAPS) {
    const current = docState[gap.docId] ?? {};
    if (current.status === "Obtained") continue;

    docState[gap.docId] = {
      ...current,
      status: CLARIFICATION_GAPS.has(gap.id)
        ? "Requires clarification"
        : "Required",
      review: "Further information required",
      note: `${current.note ? `${current.note} ` : ""}${gap.why} The absence of the document is not evidence that the underlying fact does not exist.`,
    };
  }

  let next: CommercialState = {
    ...state,
    analysing: false,
    analysis: { at: now, docIds: [...ids] },
    extracted,
    docState,
    audit: [...state.audit, ...entries],
    updatedAt: now,
  };

  next = applyDocumentAnswers(next, clock);

  const summary = `${ids.length} documents analysed · ${Object.keys(extracted).length} fields extracted · ${conflicts} conflicting · ${INTENTIONAL_GAPS.length} documents still outstanding`;

  return {
    ...next,
    audit: [
      ...next.audit,
      {
        id: `AUD-${String(next.audit.length + 1).padStart(3, "0")}`,
        at: now,
        by: state.broker,
        questionId: "documents",
        question: "Mock analysis completed",
        from: null,
        to: summary,
        changed: false,
        ...BLANK_DIFF,
        progression: progression(next).label,
        source:
          "Hardcoded prototype analysis. No upload, transfer, OCR, storage or lender integration takes place.",
      },
    ],
    chat: say(next, analysisSummary(next, conflicts), "analysis"),
  };
}

/**
 * Record the answers the documents establish on their face, each with its
 * citation. Anything requiring judgement, classification or a regulatory
 * conclusion is left as a question for the broker.
 */
function applyDocumentAnswers(
  state: CommercialState,
  clock: Clock,
): CommercialState {
  let next = state;

  for (const answer of DOC_ANSWERS) {
    if (!state.attachments.includes(answer.docId)) continue;
    if (next.answers[answer.qid]) continue;

    next = recordAnswer(
      next,
      answer.qid,
      {
        values: answer.values,
        fields: answer.fields,
        fromDocuments: true,
        citation: {
          docId: answer.docId,
          page: answer.page,
          section: answer.section,
          basis: answer.basis,
          confidence: answer.confidence,
        },
      },
      clock,
    );
  }

  return next;
}

function analysisSummary(state: CommercialState, conflicts: number): string {
  const extracted = Object.keys(state.extracted).length;
  const answered = Object.values(state.answers).filter(
    (a) => a.fromDocuments,
  ).length;

  const parts = [
    `I have read the ${state.attachments.length} attached documents and populated the application with ${extracted} values.`,
    `${answered} question${answered === 1 ? "" : "s"} are answered from the documents, each with the page and the wording it relies on.`,
  ];

  if (conflicts) {
    parts.push(
      `${conflicts} value${conflicts === 1 ? "" : "s"} disagree with what was already recorded and are marked for your decision.`,
    );
  }

  parts.push(
    `${INTENTIONAL_GAPS.length} documents are not in the pack and remain outstanding. Their absence is not evidence that the underlying facts do not exist.`,
    "Every extracted value is awaiting your confirmation and stays linked to its source. Nothing here is an assessment.",
  );

  return parts.join(" ");
}

/**
 * Remove an attached document.
 *
 * After analysis this withdraws what the document supplied: its extracted
 * values, and the answers read from it. An answer the broker had already
 * confirmed is kept — they own it now — but is flagged as having lost its
 * supporting evidence, so the file does not imply evidence that is gone.
 */
function removeAttachment(
  state: CommercialState,
  id: string,
  clock: Clock,
): CommercialState {
  const now = clock.now();
  const doc = findPackDocument(id);
  const name = doc?.displayName ?? id;

  let next: CommercialState = {
    ...state,
    attachments: state.attachments.filter((a) => a !== id),
    audit: append(
      state,
      event(
        state,
        clock,
        "documents",
        "Document removed",
        name,
        "Broker-provided during guided setup",
      ),
    ),
    updatedAt: now,
  };

  if (!state.analysis) return next;

  const extracted = { ...next.extracted };
  for (const [key, entry] of Object.entries(SOURCE_MAP)) {
    if (entry.source === id) delete extracted[key];
  }

  const docAnswers = { ...next.docAnswers };
  const answers = { ...next.answers };
  const withdrawn: string[] = [];
  const kept: string[] = [];
  let clientId = next.clientId;

  for (const [qid, citation] of Object.entries(docAnswers)) {
    if (citation.docId !== id) continue;

    if (citation.status === "confirmed") {
      docAnswers[qid] = { ...citation, evidenceWithdrawn: true };
      kept.push(qid);
      continue;
    }

    delete docAnswers[qid];
    delete answers[qid];
    withdrawn.push(qid);
    if (qid === "C01") clientId = null;
  }

  next = invalidateConfirmations({
    ...next,
    extracted,
    answers,
    docAnswers,
    clientId,
    analysis: { ...state.analysis, docIds: [...next.attachments] },
  });

  const notes: string[] = [
    `Fields supplied by ${name} were withdrawn and are outstanding again`,
  ];
  if (withdrawn.length) {
    notes.push(
      `${withdrawn.length} question${withdrawn.length > 1 ? "s" : ""} answered from that document returned to the questionnaire${
        withdrawn.includes("C01") ? ", including the client identification" : ""
      }`,
    );
  }
  if (kept.length) {
    notes.push(
      `${kept.length} broker-confirmed answer${kept.length > 1 ? "s" : ""} from that document kept, with the supporting evidence now missing`,
    );
  }

  const entries = notes.map((note, index) => ({
    id: `AUD-${String(next.audit.length + index + 1).padStart(3, "0")}`,
    at: now,
    by: state.broker,
    questionId: "documents",
    question: "Conflict or gap identified",
    from: null,
    to: note,
    changed: false,
    ...BLANK_DIFF,
    progression: "—",
    source: "Recalculated from the central application state",
  }));

  return { ...next, audit: [...next.audit, ...entries] };
}

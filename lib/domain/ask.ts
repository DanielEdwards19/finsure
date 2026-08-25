/**
 * Question routing.
 *
 * There is no language model here. A question is matched against the records
 * the current identity can see, and against a small set of intent patterns, and
 * the answer is built from the data. That is the honest behaviour for a
 * prototype: every figure on screen is traceable to a record, and a question
 * about something outside the identity's scope finds nothing rather than
 * leaking a name.
 *
 * Order matters. More specific readings are tried first — a named customer plus
 * compliance wording means that file's findings, not a network summary.
 */

import { recordDocumentsFor } from "./client-files";
import { reviewForApplication } from "./compliance";
import {
  applicationFindingsAnswer,
  attentionAnswer,
  branchAnswer,
  brokerAnswer,
  complianceAnswer,
  coverageAnswer,
  customerAnswer,
  emailsAnswer,
  lenderAnswer,
  networkReportAnswer,
  stageAnswer,
  type Answer,
  type CanvasView,
} from "./answers";
import {
  applicationTypesIn,
  lendersIn,
  resolveEntities,
  stagesIn,
} from "./network";
import type { DataScope } from "./identity";
import type { Application } from "./types";

/** Wording that scopes a question to the whole network rather than one record. */
const NETWORK =
  /network|group|org.?wide|all branches|every branch|whole|across|all |which|any|summar|overview/;

const COMPLIANCE = /complian|conduct|review|breach|misconduct|poor practice/;
const FINDINGS = /complian|finding|review|evidence|gap|risk|conduct|rule/;
const EMAIL =
  /email|correspond|wrote|said|told|message|thread|reply|replied|communicat/;

/**
 * Document wording. "Client file" and "the file for X" mean the application
 * overview, so they are excluded — otherwise asking for someone's file returns a
 * list of attachments instead of their application.
 */
const DOCUMENTS =
  /\bfiles\b|document|attachment|paperwork|statement|records?\b/;
const CLIENT_FILE = /client file|customer file|the file for\b/;

const REPORT = /report|snapshot|compil|summar|position|picture|update/;

/**
 * A request for the report itself, rather than any wording that merely reads as
 * summarising. "Summarise the compliance review" asks for the review; "generate
 * a network compliance report" asks for the report, and both contain compliance
 * wording, so the noun is what separates them.
 */
const EXPLICIT_REPORT = /\breports?\b|\bsnapshot\b/;

/** Asking what is not yet held, rather than what was found. */
const OUTSTANDING =
  /waiting on|still (need|waiting|outstanding)|outstanding|information required|what.*(do we|are we) (need|missing)/;

/**
 * Whether a question names a term, as a word rather than as a substring.
 *
 * Plain `includes` matched a lender inside an unrelated word: "ING" appears in
 * "findings" and "waiting", so "What compliance findings are on this file?"
 * answered with ING's loan book. Short lender names make this the rule rather
 * than an edge case, so matching is anchored to word boundaries.
 */
const mentions = (text: string, term: string): boolean => {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text);
};
const COVERAGE =
  /lowest (evidence )?coverage|worst coverage|coverage.*(low|by branch|tracking)/;
const ATTENTION =
  /need(s)? attention|requires attention|attention right now|which branch(es)?|at risk|flagged/;

/**
 * Wording that points at whatever the canvas already has open rather than naming
 * a record — "this file", "this client", "we", "still waiting on".
 */
const DEICTIC =
  /\bthis (file|client|application|customer|one)\b|\bwe\b|\bour\b/;

export interface AskContext {
  /** The application the canvas currently has open, if any. */
  readonly focus?: Application;
}

/**
 * The application a canvas view is about, where it is about one. Views showing
 * the network as a whole have no focused file, so a question pointing at "this
 * file" from there is left unresolved rather than attached to an arbitrary
 * record.
 */
export function focusedApplication(
  scope: DataScope,
  view: CanvasView,
): Application | undefined {
  const id =
    view.kind === "application"
      ? view.id
      : view.kind === "thread" || view.kind === "document"
        ? view.applicationId
        : null;

  return id ? scope.applications.find((a) => a.id === id) : undefined;
}

export function ask(
  scope: DataScope,
  question: string,
  { focus }: AskContext = {},
): Answer {
  const text = question.toLowerCase();
  const entities = resolveEntities(scope, question);

  /*
   * A question can name a client, or point at the one already on the canvas.
   * Resolving the open record means "What compliance findings are on this file?"
   * answers about the file in front of the reader instead of reporting that no
   * record matched — the phrase names a record, just not by name.
   *
   * A named client is only treated as the subject when it outranks any broker or
   * branch the same words matched. Households and brokers share surnames, so
   * "Rachael Nguyen" must reach the broker rather than a client called Nguyen.
   */
  const named = entities.customers[0];
  const rivalScore = Math.max(
    entities.brokers[0]?.score ?? 0,
    entities.branches[0]?.score ?? 0,
  );
  const customer =
    named && named.score >= rivalScore
      ? named
      : focus && DEICTIC.test(text)
        ? { record: focus, score: 1 }
        : undefined;

  // A named customer takes precedence: the question is about their file.
  if (customer) {
    const application = customer.record;

    if (DOCUMENTS.test(text) && !CLIENT_FILE.test(text)) {
      const review = reviewForApplication(scope, application.id);
      const documents = review ? recordDocumentsFor(review.reference) : [];

      if (documents.length) {
        const systems = new Set(documents.map((d) => d.source));
        return {
          intro: `${documents.length} documents are on file for ${application.customer}, collected from ${systems.size} source systems.`,
          groups: [],
          outro: "Select a document to open the record.",
          records: documents.map((d) => ({
            name: d.name,
            documentId: d.id,
            meta: `${d.source} · ${d.date}${
              d.restricted
                ? "\nPreview restricted — request access under policy"
                : ""
            }`,
          })),
          view: { kind: "application", id: application.id },
        };
      }
    }

    if (FINDINGS.test(text) || OUTSTANDING.test(text)) {
      const findings = applicationFindingsAnswer(scope, application);
      if (findings) return findings;

      /*
       * GUARDRAIL: no analysed correspondence is not the same as nothing
       * outstanding. Saying so is the answer — reporting an empty list would
       * read as a clear file, and falling through to a network aggregate would
       * answer a question nobody asked.
       */
      return {
        intro: `${application.customer} (${application.id}) has no analysed correspondence on file, so no findings have been recorded either way.`,
        groups: [],
        outro:
          "Information required: the email archive for this file has not been analysed. Human assessment required.",
        view: { kind: "application", id: application.id },
      };
    }

    if (EMAIL.test(text)) return emailsAnswer(scope, application);

    /*
     * The question named a file, so it is answered about that file. Continuing
     * to the network checks below would answer with an unrelated aggregate,
     * which is how "What compliance findings are on this file?" came back with a
     * lender's loan book.
     */
    return customerAnswer([application]);
  }

  /*
   * A report is asked for by name, so it is resolved before the compliance
   * review: "generate a network compliance report" reads as both, and the
   * report is the more specific request of the two.
   */
  if (NETWORK.test(text) && EXPLICIT_REPORT.test(text))
    return networkReportAnswer(scope);

  // Network-level compliance review.
  if (COMPLIANCE.test(text) && NETWORK.test(text))
    return complianceAnswer(scope);

  // Network-level position.
  if (NETWORK.test(text) && REPORT.test(text))
    return networkReportAnswer(scope);
  if (COVERAGE.test(text)) return coverageAnswer(scope);
  if (ATTENTION.test(text)) return attentionAnswer(scope);

  // Aggregates over a named stage, lender or application type.
  for (const stage of stagesIn(scope)) {
    if (mentions(text, stage)) return stageAnswer(scope, stage);
  }
  for (const lender of lendersIn(scope)) {
    if (mentions(text, lender)) return lenderAnswer(scope, lender);
  }
  for (const type of applicationTypesIn(scope)) {
    if (mentions(text, type)) {
      const applications = scope.applications.filter((a) => a.type === type);
      return {
        intro: `${applications.length} applications are of type "${type}".`,
        groups: [
          {
            heading: "Examples",
            points: applications
              .slice(0, 6)
              .map(
                (a) =>
                  `${a.customer} — ${a.brokerName}, Finsure ${a.branchName} · ${a.stage}`,
              ),
          },
        ],
        outro: "",
        view: { kind: "networkReport" },
      };
    }
  }

  /*
   * Whichever entity kind matched most strongly. A customer is not considered
   * here: naming one is handled above and answers about that file directly.
   */
  const best = Math.max(
    entities.brokers[0]?.score ?? 0,
    entities.branches[0]?.score ?? 0,
  );

  if (best > 0) {
    if (entities.brokers[0]?.score === best) {
      return brokerAnswer(scope, entities.brokers[0].record);
    }
    return branchAnswer(scope, entities.branches[0].record);
  }

  return notFound(scope, question);
}

/**
 * Nothing matched.
 *
 * GUARDRAIL: this says what was searched and that no record was found. It never
 * implies the record does not exist — the identity may simply have no access to
 * it, and an absence of results is not evidence of absence.
 */
function notFound(scope: DataScope, question: string): Answer {
  return {
    intro: `No record matching "${question.trim()}" was found in the data available to you.`,
    groups: [
      {
        heading: "What is available",
        points: [
          `${scope.applications.length} applications, ${scope.brokers.length} brokers and ${scope.branches.length} branches are in scope for ${scope.identity.name}.`,
          "Try a client name, a broker name, a branch, a lender, or an application stage.",
        ],
      },
    ],
    outro:
      "An absence of results is not a finding. Records outside your access are not searched.",
    view: null,
  };
}

/** Prompts offered on an empty conversation, adapted to the access level. */
/** Prompts offered while a client or their file is on the canvas. */
const FILE_SUGGESTIONS: readonly string[] = [
  "What compliance findings are on this file?",
  "What was the last email sent to this client?",
  "What information are we still waiting on?",
];

/** Prompts offered while the network is on the canvas. */
const NETWORK_SUGGESTIONS: readonly string[] = [
  "Summarise the compliance review across the network",
  "Which branches need attention right now?",
  "Generate a network compliance report across every branch",
];

/**
 * Prompts to offer, following whatever the canvas has open.
 *
 * The set is contextual because the canvas is the subject of the conversation:
 * with a file open the useful questions are about that file, and a broker only
 * ever has files, having no branch network to ask about.
 */
export function suggestions(
  scope: DataScope,
  view?: CanvasView,
): readonly string[] {
  const onFile =
    view != null &&
    (view.kind === "application" ||
      view.kind === "thread" ||
      view.kind === "document" ||
      view.kind === "compliance");

  return onFile || scope.isBroker ? FILE_SUGGESTIONS : NETWORK_SUGGESTIONS;
}

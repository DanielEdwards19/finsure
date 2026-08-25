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

import { documentsForReference } from "./client-files";
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
} from "./answers";
import { applicationTypesIn, lendersIn, resolveEntities, stagesIn } from "./network";
import type { DataScope } from "./identity";

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
const DOCUMENTS = /\bfiles\b|document|attachment|paperwork|statement|records?\b/;
const CLIENT_FILE = /client file|customer file|the file for\b/;

const REPORT = /report|snapshot|compil|summar|position|picture|update/;
const COVERAGE = /lowest (evidence )?coverage|worst coverage|coverage.*(low|by branch|tracking)/;
const ATTENTION =
  /need(s)? attention|requires attention|attention right now|which branch(es)?|at risk|flagged/;

export function ask(scope: DataScope, question: string): Answer {
  const text = question.toLowerCase();
  const entities = resolveEntities(scope, question);
  const customer = entities.customers[0];

  // A named customer takes precedence: the question is about their file.
  if (customer) {
    const application = customer.record;

    if (DOCUMENTS.test(text) && !CLIENT_FILE.test(text)) {
      const review = reviewForApplication(scope, application.id);
      const documents = review
        ? documentsForReference(review.reference).filter(
            (d) =>
              d.source !== "Prototype logic" && d.source !== "Prototype package",
          )
        : [];

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

    if (FINDINGS.test(text)) {
      const findings = applicationFindingsAnswer(scope, application);
      if (findings) return findings;
    }

    if (EMAIL.test(text)) return emailsAnswer(scope, application);
  }

  // Network-level compliance review.
  if (COMPLIANCE.test(text) && NETWORK.test(text)) return complianceAnswer(scope);

  // Network-level position.
  if (NETWORK.test(text) && REPORT.test(text)) return networkReportAnswer(scope);
  if (COVERAGE.test(text)) return coverageAnswer(scope);
  if (ATTENTION.test(text)) return attentionAnswer(scope);

  // Aggregates over a named stage, lender or application type.
  for (const stage of stagesIn(scope)) {
    if (text.includes(stage.toLowerCase())) return stageAnswer(scope, stage);
  }
  for (const lender of lendersIn(scope)) {
    if (text.includes(lender.toLowerCase())) return lenderAnswer(scope, lender);
  }
  for (const type of applicationTypesIn(scope)) {
    if (text.includes(type.toLowerCase())) {
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

  // Whichever entity kind matched most strongly.
  const best = Math.max(
    customer?.score ?? 0,
    entities.brokers[0]?.score ?? 0,
    entities.branches[0]?.score ?? 0,
  );

  if (best > 0) {
    if (customer && customer.score === best) {
      return customerAnswer(entities.customers.map((m) => m.record));
    }
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
export function suggestions(scope: DataScope): readonly string[] {
  if (scope.isBroker) {
    return [
      "Summarise my applications",
      "Which of my applications need attention?",
      "Show me the compliance review for my files",
    ];
  }

  return [
    "Compile a network position report",
    "Which branches need attention right now?",
    "Summarise the compliance review across the network",
    "Which branches have the lowest evidence coverage?",
  ];
}

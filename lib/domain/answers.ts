/**
 * Chat answers.
 *
 * An answer is structured rather than prose: an opening line, headed groups of
 * points, and a closing line. That shape is what lets every figure keep its
 * source and every finding stay reviewable — the renderer cannot flatten it into
 * a paragraph that hides where a number came from.
 *
 * Each answer also names the canvas view that belongs beside it, so opening a
 * branch from the map moves the chat and the canvas together.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2): closing lines state that human assessment is
 * required and that no compliance determination is made. Nothing here approves,
 * declines or recommends.
 */

import { money, plural, shortMoney } from "@/lib/format";
import {
  networkCompliance,
  reviewForApplication,
  RULES,
  type GroupKind,
} from "./compliance";
import { severityOfStatus } from "@/lib/data/network";
import { threadsForApplication } from "@/lib/data/threads";
import {
  applicationsForBranch,
  applicationsForBroker,
  branchRollup,
  networkTotals,
} from "./network";
import type { Finding } from "./compliance";
import type { DataScope } from "./identity";
import type {
  Application,
  ApplicationId,
  Branch,
  BranchId,
  Broker,
  BrokerId,
  ThreadId,
} from "./types";

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

/**
 * What the canvas shows beside an answer.
 *
 * A single discriminated value rather than a view name plus separate "focused
 * branch / broker / application" fields, so the canvas can never be asked to
 * show a branch while holding the identifier of a broker.
 */
export type CanvasView =
  | { readonly kind: "map" }
  | { readonly kind: "networkReport" }
  | { readonly kind: "branch"; readonly id: BranchId }
  | { readonly kind: "broker"; readonly id: BrokerId }
  | { readonly kind: "application"; readonly id: ApplicationId }
  | {
      readonly kind: "thread";
      readonly applicationId: ApplicationId;
      readonly threadId: ThreadId;
    }
  | { readonly kind: "compliance" }
  | {
      readonly kind: "findingGroup";
      readonly group: GroupKind;
      readonly value: string;
    }
  | {
      readonly kind: "document";
      readonly id: string;
      readonly applicationId: ApplicationId;
    };

export interface AnswerGroup {
  readonly heading: string;
  readonly points: readonly string[];
}

/** A selectable card: a disambiguation choice, or a document on a file. */
export interface AnswerRecord {
  readonly name: string;
  /** Newline-separated detail lines. */
  readonly meta: string;
  readonly applicationId?: ApplicationId;
  readonly documentId?: string;
}

export interface Answer {
  readonly intro: string;
  readonly groups: readonly AnswerGroup[];
  readonly outro: string;
  readonly records?: readonly AnswerRecord[];
  /**
   * Findings rendered as the same interactive cards the canvas uses, so a
   * finding raised in chat can be reviewed without leaving it.
   */
  readonly findings?: readonly Finding[];
  /** Canvas view to open. `null` keeps the canvas as it is. */
  readonly view: CanvasView | null;
}

const HUMAN_REVIEW =
  "Presented for human review — no compliance determination is made.";

const severityOf = (application: Application) =>
  severityOfStatus(application.status);

const needsAttention = (applications: readonly Application[]) =>
  applications.filter((a) => severityOf(a) === "attention");

const appLine = (a: Application) =>
  `${a.type} · ${money(a.amount)} · ${a.lender} · ${a.stage}`;

// ---------------------------------------------------------------------------
// Entity answers
// ---------------------------------------------------------------------------

/**
 * One customer, or a choice between several.
 *
 * Two people with the same name are a real case in a network this size, so the
 * ambiguity is surfaced as a choice rather than resolved by guessing.
 */
export function customerAnswer(applications: readonly Application[]): Answer {
  const distinct: Application[] = [];
  const seen = new Set<string>();
  for (const a of applications) {
    const key = `${a.customer}|${a.brokerName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(a);
  }

  if (distinct.length > 1) {
    return {
      intro: `There are ${distinct.length} records that match that name.`,
      groups: [],
      outro: "",
      records: distinct.slice(0, 6).map((a) => ({
        name: a.customer,
        meta: `Broker: ${a.brokerName}\nBranch: Finsure ${a.branchName}`,
        applicationId: a.id,
      })),
      view: null,
    };
  }

  const a = distinct[0];
  return {
    intro: `Here's what we have for ${a.customer}.`,
    groups: [
      { heading: "Application", points: [appLine(a)] },
      {
        heading: "Broker",
        points: [`${a.brokerName} · Finsure ${a.branchName}`],
      },
    ],
    outro:
      severityOf(a) === "attention"
        ? "This application is flagged as requiring attention — human review required."
        : "",
    view: { kind: "application", id: a.id },
  };
}

export function brokerAnswer(scope: DataScope, broker: Broker): Answer {
  const applications = applicationsForBroker(scope, broker.id);
  const attention = needsAttention(applications);
  const value = applications.reduce((total, a) => total + a.amount, 0);

  return {
    intro: `${broker.name} is based at Finsure ${broker.branchName} and has ${plural(applications.length, "application")} on file.`,
    groups: [
      { heading: "Contact", points: [`${broker.email} · ${broker.phone}`] },
      {
        heading: "Portfolio",
        points: [
          `${applications.length} applications totalling ${money(value)}.`,
        ],
      },
      ...(attention.length
        ? [
            {
              heading: "Requiring attention",
              points: attention.map(
                (a) => `${a.customer} — ${a.status} (${a.stage})`,
              ),
            },
          ]
        : []),
    ],
    outro: attention.length
      ? ""
      : "No applications currently require attention.",
    view: { kind: "broker", id: broker.id },
  };
}

export function branchAnswer(scope: DataScope, branch: Branch): Answer {
  const rollup = branchRollup(scope).find((b) => b.branch.id === branch.id);
  const applications = applicationsForBranch(scope, branch.id);
  const attention = needsAttention(applications);

  return {
    intro: `Finsure ${branch.name} (${branch.state}) has ${plural(rollup?.brokers ?? 0, "broker")} and ${plural(applications.length, "application")}.`,
    groups: [
      {
        heading: "Position",
        points: [
          `${money(rollup?.value ?? 0)} in applications · ${rollup?.coverage ?? 0}% evidence coverage.`,
        ],
      },
      ...(attention.length
        ? [
            {
              heading: "Requiring attention",
              points: attention
                .slice(0, 6)
                .map((a) => `${a.customer} — ${a.status} · ${a.brokerName}`),
            },
          ]
        : []),
    ],
    outro: attention.length
      ? HUMAN_REVIEW
      : "All applications within normal range.",
    view: { kind: "branch", id: branch.id },
  };
}

// ---------------------------------------------------------------------------
// Network answers
// ---------------------------------------------------------------------------

export function networkReportAnswer(scope: DataScope): Answer {
  const totals = networkTotals(scope);

  return {
    intro: `Compiled a network compliance snapshot across all ${totals.brokers} brokers and ${totals.branches} branches — every connected system — in a few seconds. It's open on the canvas.`,
    groups: [
      {
        heading: "Highlights",
        points: [
          `${totals.applications} applications totalling ${shortMoney(totals.value)}; average ${shortMoney(totals.averageValue)}.`,
          `${totals.attention} requiring attention across ${totals.branchesNeedingAttention} branches; network coverage ${totals.coverage ?? "—"}%.`,
        ],
      },
    ],
    outro:
      "Assembling this by hand across every toolset would normally take the best part of a day. Figures require human review.",
    view: { kind: "networkReport" },
  };
}

export function attentionAnswer(scope: DataScope): Answer {
  const rollup = branchRollup(scope)
    .filter((b) => b.severity === "attention")
    .sort((a, b) => b.attention - a.attention);
  const totals = networkTotals(scope);

  return {
    intro: `${totals.attention} applications across ${rollup.length} branches currently require attention.`,
    groups: rollup.slice(0, 5).map((b) => ({
      heading: `${b.branch.name}, ${b.branch.state}`,
      points: [
        `${b.attention} requiring attention of ${b.applications} applications · ${b.coverage}% coverage · ${b.brokers} brokers.`,
      ],
    })),
    outro: "Highlighted in red on the network map. Requires human review.",
    view: { kind: "networkReport" },
  };
}

export function coverageAnswer(scope: DataScope): Answer {
  const lowest = branchRollup(scope)
    .slice()
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 5);
  const totals = networkTotals(scope);

  return {
    intro: "Branches with the lowest evidence coverage:",
    groups: [
      {
        heading: "Lowest first",
        points: lowest.map(
          (b) =>
            `${b.branch.name}, ${b.branch.state} — ${b.coverage}% (${b.attention} requiring attention).`,
        ),
      },
    ],
    outro: `Network average is ${totals.coverage ?? "—"}%.`,
    view: { kind: "networkReport" },
  };
}

export function stageAnswer(scope: DataScope, stage: string): Answer {
  const applications = scope.applications.filter((a) => a.stage === stage);

  return {
    intro: `${applications.length} applications are at "${stage}".`,
    groups: [
      {
        heading: "Examples",
        points: applications
          .slice(0, 6)
          .map(
            (a) =>
              `${a.customer} — ${a.brokerName}, Finsure ${a.branchName} · ${money(a.amount)}`,
          ),
      },
    ],
    outro:
      applications.length > 6 ? `Showing 6 of ${applications.length}.` : "",
    view: { kind: "networkReport" },
  };
}

export function lenderAnswer(scope: DataScope, lender: string): Answer {
  const applications = scope.applications.filter((a) => a.lender === lender);
  const value = applications.reduce((total, a) => total + a.amount, 0);

  return {
    intro: `${applications.length} applications are with ${lender}, totalling ${money(value)}.`,
    groups: [
      {
        heading: "Examples",
        points: applications
          .slice(0, 6)
          .map((a) => `${a.customer} — ${a.type} · ${a.stage}`),
      },
    ],
    outro: "",
    view: { kind: "networkReport" },
  };
}

// ---------------------------------------------------------------------------
// Correspondence and compliance
// ---------------------------------------------------------------------------

export function emailsAnswer(
  scope: DataScope,
  application: Application,
): Answer {
  const threads = threadsForApplication(application.id);

  if (!threads.length) {
    return {
      intro: `No email correspondence is on file for ${application.customer}.`,
      groups: [],
      outro: "",
      view: { kind: "application", id: application.id },
    };
  }

  const messages = threads.flatMap((t) =>
    t.messages.map((m) => ({ ...m, subject: t.subject })),
  );
  const last = messages[messages.length - 1];
  const review = reviewForApplication(scope, application.id);
  const requiresReview =
    review?.findings.filter((f) => f.status !== "EVIDENCE_FOUND") ?? [];
  const categories = [...new Set(requiresReview.map((f) => f.category))];
  const evidence =
    review?.findings.filter((f) => f.status === "EVIDENCE_FOUND") ?? [];

  return {
    intro: `${plural(threads.length, "thread")} with ${messages.length} messages on file for ${application.customer}. The most recent is "${last.subject}" from ${last.from} on ${last.short}.`,
    groups: categories.length
      ? [
          {
            heading: "Requires review",
            points: categories.map((category) => {
              const n = requiresReview.filter(
                (f) => f.category === category,
              ).length;
              return `${category} — ${plural(n, "passage")} identified.`;
            }),
          },
        ]
      : [],
    outro: categories.length
      ? "Identified from the correspondence and presented for human review — no compliance determination is made."
      : evidence.length
        ? `${evidence.length} items of supporting good practice identified in the correspondence.`
        : "",
    view: {
      kind: "thread",
      applicationId: application.id,
      threadId: threads[0].id,
    },
  };
}

export function complianceAnswer(scope: DataScope): Answer {
  const network = networkCompliance(scope);

  return {
    intro: `Analysed ${network.applications} residential applications from the email archive against ${Object.keys(RULES).length} review rules. ${network.requiresReview} items require review, ${network.evidenceFound} show evidence found. It's open on the canvas.`,
    groups: [
      {
        heading: "Applications by outcome",
        points: [
          `${network.criticalApplications} with a critical matter requiring review; ${network.highApplications} high-priority; ${network.clearApplications} with no material concern identified in analysed emails.`,
          `${network.byCategory
            .slice(0, 3)
            .map((c) => `${c.category} (${c.applications})`)
            .join("; ")}.`,
        ],
      },
    ],
    outro:
      "Automated evidence review. Human assessment required. Results are based on the email archive currently available. No compliance determination is made.",
    view: { kind: "compliance" },
  };
}

/** One application's findings, rendered as reviewable cards in the chat. */
export function applicationFindingsAnswer(
  scope: DataScope,
  application: Application,
): Answer | null {
  const review = reviewForApplication(scope, application.id);
  if (!review) return null;

  return {
    intro: `${review.customer} (${review.reference}) — ${review.headline}.`,
    groups: [],
    findings: review.findings,
    outro: `${review.evidenceCount} evidence found · ${review.gapCount} potential gaps · ${review.reviewCount} requiring review · ${review.coverage == null ? "—" : `${review.coverage}%`} email evidence coverage. Human assessment required.`,
    view: { kind: "application", id: application.id },
  };
}

/**
 * Derived email observations.
 *
 * Findings here are derived from the message text by the rules below — nothing
 * is hand-labelled per thread, so a thread added to the archive is scanned on
 * the same terms. This is distinct from `lib/domain/compliance.ts`, which holds
 * the curated, regulator-referenced review set.
 *
 * GUARDRAIL: an observation records that a passage matched a pattern and quotes
 * it. It is not a determination that a file is compliant or non-compliant, and
 * `concern` never means "breach of law" — see `docs/DESIGN.md` §2.
 */

import { THREADS, threadsForApplication } from "@/lib/data/threads";
import type { ApplicationId, Thread, ThreadId } from "./types";
import type { DataScope } from "./identity";

/**
 * `concern` marks a passage a reviewer should look at; `supporting` marks
 * evidence of good practice. Deliberately not "breach" and "pass".
 */
export type ObservationKind = "concern" | "supporting";

export interface ScanRule {
  readonly id: string;
  readonly kind: ObservationKind;
  readonly category: string;
  readonly pattern: RegExp;
  readonly why: string;
}

export const SCAN_RULES: readonly ScanRule[] = [
  // ---- passages requiring review ----
  {
    id: "purpose_misstated",
    kind: "concern",
    category: "Loan purpose misstated",
    pattern:
      /put the purpose down as|cleaner as one purpose|blank purpose or account fields/i,
    why: "Broker proposes recording a loan purpose that differs from the purpose the client described.",
  },
  {
    id: "coach_to_mislead",
    kind: "concern",
    category: "Client coached to withhold information",
    pattern:
      /if anyone asks|don't volunteer the |we don't need to draw attention|keep the new contract off email/i,
    why: "Broker instructs the client to withhold or shape information provided to the lender.",
  },
  {
    id: "conceal_liability",
    kind: "concern",
    category: "Liability treated as not disclosable",
    pattern:
      /if they don't appear on the credit report|zero balance means it doesn't count|don't worry about it\. they're small/i,
    why: "A known debt or facility is treated as not requiring disclosure to the lender.",
  },
  {
    id: "benchmark_expenses",
    kind: "concern",
    category: "Expenses not verified",
    pattern: /entered your expenses at the benchmark/i,
    why: "Benchmark figures used in place of the client’s actual disclosed expenses.",
  },
  {
    id: "valuation_unverified",
    kind: "concern",
    category: "Valuation unverified",
    pattern: /sort out a formal valuation later|estimate for now/i,
    why: "Application progressed on an unverified value estimate.",
  },
  {
    id: "timing_manipulation",
    kind: "concern",
    category: "Submission timed to avoid disclosure",
    pattern:
      /lodge it before the final payslip|deal with it only if boq asks|don't change jobs until after formal approval/i,
    why: "Submission timing used to avoid disclosing a known material change.",
  },
  {
    id: "signing_irregularity",
    kind: "concern",
    category: "Signing irregularity",
    pattern:
      /leave any blank|don't need to read the standard terms|just sign all the yellow tabs|just sign where marked|sign it today/i,
    why: "Client directed to sign without review, or documents left incomplete at signing.",
  },
  {
    id: "guarantor_understated",
    kind: "concern",
    category: "Guarantor risk understated",
    pattern:
      /mainly a formality|nothing for them to worry about|heaps of equity/i,
    why: "Guarantor obligations or risks presented as lower than they are.",
  },
  {
    id: "conflict_undisclosed",
    kind: "concern",
    category: "Conflict of interest not addressed",
    pattern: /broker campaign|i know their assessor|all lenders pay brokers/i,
    why: "Lender selection linked to broker benefit without a clear conflict disclosure.",
  },
  {
    id: "comparison_refused",
    kind: "concern",
    category: "Product comparison refused",
    pattern: /comparisons just confuse/i,
    why: "Client request for a product comparison declined.",
  },
  {
    id: "costs_minimised",
    kind: "concern",
    category: "Costs minimised",
    pattern: /only a couple of grand|you don't feel them|no-brainer/i,
    why: "Fees or long-term cost consequences downplayed rather than quantified.",
  },
  {
    id: "privacy_breach",
    kind: "concern",
    category: "Privacy concern",
    pattern:
      /copied the builder's accounts team|alternate gmail address|password is your date of birth/i,
    why: "Client financial information disclosed to unauthorised recipients or weakly protected.",
  },

  // ---- evidence of good practice ----
  {
    id: "submission_paused",
    kind: "supporting",
    category: "Submission paused pending verification",
    pattern:
      /paused submission|i won't submit|will not submit the application|no application will be submitted|not to submit another application/i,
    why: "Broker withheld submission until information was verified.",
  },
  {
    id: "costs_disclosed",
    kind: "supporting",
    category: "Costs disclosed",
    pattern:
      /switching costs are|estimated break cost|discharge and application costs|refinancing and discharge costs/i,
    why: "Costs quantified and disclosed to the client in writing.",
  },
  {
    id: "comparison_provided",
    kind: "supporting",
    category: "Product comparison provided",
    pattern:
      /i've attached a comparison|product comparison|attached is the revised funds-to-complete|i'll also compare/i,
    why: "Alternatives compared and provided to the client.",
  },
  {
    id: "risk_explained",
    kind: "supporting",
    category: "Risks explained",
    pattern:
      /none is guaranteed|not guaranteed|can change before settlement|puts the home at risk|may increase the total interest|is not a guarantee of final approval/i,
    why: "Material risks and limits of certainty explained.",
  },
  {
    id: "verification_first",
    kind: "supporting",
    category: "Verification before reliance",
    pattern:
      /until your parents confirm|verified commitments|should not describe|do not ask them to sign/i,
    why: "Broker required evidence before relying on a client statement.",
  },
  {
    id: "instruction_recorded",
    kind: "supporting",
    category: "Instruction recorded",
    pattern:
      /i've recorded that instruction|updated the needs and objectives record|confirm if the note accurately records/i,
    why: "Client instruction or discussion recorded on file.",
  },
  {
    id: "scope_respected",
    kind: "supporting",
    category: "Referred to the right professional",
    pattern:
      /confirmed by your conveyancer|cannot provide tax advice|can't advise you on the contract|ask your tax adviser|speak with your solicitor/i,
    why: "Broker referred a matter outside their scope to the appropriate adviser.",
  },
  {
    id: "secure_handling",
    kind: "supporting",
    category: "Secure document handling",
    pattern:
      /secure broker portal|secure link|don't email any further unredacted|upload these through the secure/i,
    why: "Client documents routed through secure channels.",
  },
  {
    id: "source_of_funds",
    kind: "supporting",
    category: "Source of funds checked",
    pattern:
      /evidence of the source|record that accurately|requires a gift declaration|non-repayable gift/i,
    why: "Source of a material credit or contribution verified.",
  },
];

export interface Observation {
  readonly ruleId: string;
  readonly kind: ObservationKind;
  readonly category: string;
  readonly why: string;
  /** Index of the message within the thread, for scroll-to-evidence. */
  readonly messageIndex: number;
  readonly from: string;
  readonly date: string;
  readonly short: string;
  readonly subject: string;
  /** The exact sentence that matched, so the finding is always traceable. */
  readonly quote: string;
  readonly threadId: ThreadId;
}

/**
 * Prepare a message body for matching.
 *
 * Two normalisations, both required for the patterns to behave predictably:
 *
 *  - Typographic apostrophes become ASCII, because the patterns are written
 *    with ASCII ones while the archive uses typographic.
 *  - All runs of whitespace, including newlines, collapse to single spaces.
 *    Email bodies are hard-wrapped at roughly 80 characters, so without this
 *    any multi-word pattern fails whenever a line break happens to land inside
 *    the phrase. The prototype matched against the raw body and silently lost
 *    findings that way — "confirmed by your\nconveyancer" never matched
 *    `/confirmed by your conveyancer/`. Matching on wrapped text made a
 *    finding's appearance depend on where the line broke, which is not a
 *    property anyone intended.
 */
const searchable = (text: string): string =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/**
 * The sentence containing the match, falling back to the matched fragment. The
 * quote is what a reviewer reads, so a whole sentence is preferable to a
 * fragment torn out of context.
 */
function quoteFor(body: string, pattern: RegExp): string {
  const text = searchable(body);

  for (const sentence of text.split(/(?<=[.;:])\s+/)) {
    if (pattern.test(sentence)) return sentence.trim();
  }

  return text.match(pattern)?.[0] ?? "";
}

/** Scan one thread, returning the passages that matched with their evidence. */
export function scanThread(thread: Thread): readonly Observation[] {
  return thread.messages.flatMap((message, messageIndex) => {
    const body = searchable(message.body);

    return SCAN_RULES.filter((rule) => rule.pattern.test(body)).map((rule) => ({
      ruleId: rule.id,
      kind: rule.kind,
      category: rule.category,
      why: rule.why,
      messageIndex,
      from: message.from,
      date: message.date,
      short: message.short,
      subject: message.subject,
      quote: quoteFor(message.body, rule.pattern),
      threadId: thread.id,
    }));
  });
}

/*
 * Scan results are cached because scanning is pure and the archive is static.
 * The prototype cached in an unbounded map keyed by thread id; this is bounded
 * by construction because it is built once from a fixed record set.
 */
const observationsByThread: ReadonlyMap<ThreadId, readonly Observation[]> =
  new Map(THREADS.map((thread) => [thread.id, scanThread(thread)]));

export const observationsFor = (thread: Thread): readonly Observation[] =>
  observationsByThread.get(thread.id) ?? scanThread(thread);

export interface CorrespondenceSummary {
  readonly threads: readonly Thread[];
  readonly observations: readonly Observation[];
  readonly concerns: readonly Observation[];
  readonly supporting: readonly Observation[];
  /** Distinct concern categories, for a themes list. */
  readonly concernCategories: readonly string[];
}

const summarise = (threads: readonly Thread[]): CorrespondenceSummary => {
  const observations = threads.flatMap((t) => observationsFor(t));
  const concerns = observations.filter((o) => o.kind === "concern");

  return {
    threads,
    observations,
    concerns,
    supporting: observations.filter((o) => o.kind === "supporting"),
    concernCategories: [...new Set(concerns.map((o) => o.category))],
  };
};

/** Correspondence on file for one application. */
export const correspondenceFor = (
  applicationId: ApplicationId,
): CorrespondenceSummary => summarise(threadsForApplication(applicationId));

/** Every thread an identity may see. */
export const threadsInScope = (scope: DataScope): readonly Thread[] => {
  const permitted = new Set(scope.applications.map((a) => a.id));
  return THREADS.filter((t) => permitted.has(t.applicationId));
};

export interface NetworkCorrespondence extends CorrespondenceSummary {
  /** Threads containing at least one passage requiring review. */
  readonly flaggedThreads: readonly Thread[];
  readonly clearThreads: readonly Thread[];
  /** Concern category to the number of files it appears in, most common first. */
  readonly themes: readonly {
    readonly category: string;
    readonly files: number;
  }[];
}

/** Correspondence roll-up across everything an identity may see. */
export function networkCorrespondence(scope: DataScope): NetworkCorrespondence {
  const threads = threadsInScope(scope);
  const summary = summarise(threads);

  const flaggedThreads = threads.filter((t) =>
    observationsFor(t).some((o) => o.kind === "concern"),
  );

  const fileCounts = new Map<string, number>();
  for (const thread of threads) {
    const categories = new Set(
      observationsFor(thread)
        .filter((o) => o.kind === "concern")
        .map((o) => o.category),
    );
    for (const category of categories) {
      fileCounts.set(category, (fileCounts.get(category) ?? 0) + 1);
    }
  }

  return {
    ...summary,
    flaggedThreads,
    clearThreads: threads.filter((t) => !flaggedThreads.includes(t)),
    themes: [...fileCounts.entries()]
      .map(([category, files]) => ({ category, files }))
      .sort((a, b) => b.files - a.files),
  };
}

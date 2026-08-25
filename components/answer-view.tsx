"use client";

import {
  ASSESSMENT_STATE_LABEL,
  CONFIDENCE_LABEL,
  FINDING_SEVERITY_LABEL,
} from "@/lib/domain/types";
import type { Answer, AnswerRecord } from "@/lib/domain/answers";
import type { Finding } from "@/lib/domain/compliance";
import type { AssessmentState } from "@/lib/domain/types";
import type { Tone } from "@/lib/design/tokens";

/** Renders one assistant answer: opening line, headed groups, closing line. */
export function AnswerView({
  answer,
  onPickRecord,
}: {
  answer: Answer;
  onPickRecord?: (record: AnswerRecord) => void;
}) {
  return (
    <div className="w-full animate-rise self-start">
      <p className="m-0 mb-4 text-base leading-6">{answer.intro}</p>

      {answer.groups.map((group) => (
        <div key={group.heading} className="mb-4">
          <div className="mb-0.5 text-base leading-6 font-medium">
            {group.heading}
          </div>
          {group.points.map((point) => (
            <div
              key={point}
              className="min-w-0 text-base leading-6 [overflow-wrap:anywhere]"
            >
              {point}
            </div>
          ))}
        </div>
      ))}

      {answer.records && answer.records.length > 0 && (
        <div className="mb-4 flex flex-col gap-4">
          {answer.records.map((record) => (
            <button
              key={record.name + record.meta}
              type="button"
              onClick={() => onPickRecord?.(record)}
              className="flex cursor-pointer flex-col gap-2 rounded-2xl bg-surface p-4 text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/5"
            >
              <span className="text-base leading-none font-medium">
                {record.name}
              </span>
              <span className="text-base leading-[19px] font-medium whitespace-pre-line text-secondary">
                {record.meta}
              </span>
            </button>
          ))}
        </div>
      )}

      {answer.findings && answer.findings.length > 0 && (
        <div className="mb-4 flex flex-col gap-2.5">
          {answer.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}

      {answer.outro && (
        <p className="m-0 text-base leading-6 text-secondary">{answer.outro}</p>
      )}
    </div>
  );
}

/**
 * The tone for an assessment state.
 *
 * GUARDRAIL: `EVIDENCE_FOUND` is deliberately neutral rather than green. Finding
 * evidence is not a pass — it means the record contains something relevant, and
 * a human still has to read it.
 */
const TONE_FOR: Record<AssessmentState, Tone> = {
  EVIDENCE_FOUND: "good",
  POTENTIAL_GAP: "warn",
  REQUIRES_REVIEW: "bad",
};

const TONE_CLASS: Record<Tone, string> = {
  good: "bg-good-fill text-good-text",
  warn: "bg-warn-fill text-warn-text",
  bad: "bg-bad-fill text-bad-text",
  muted: "bg-muted-fill text-muted-text",
};

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-[11px] py-[7px] text-meta font-medium shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * A finding, with its evidence and the reviewer's options.
 *
 * The review state is always shown, and always starts unreviewed — nothing here
 * is resolved automatically. The suggested action is a prompt for the reviewer,
 * not a step the product has taken.
 */
function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
      <span className="flex flex-wrap items-center gap-2">
        <Pill tone={TONE_FOR[finding.status]}>
          {ASSESSMENT_STATE_LABEL[finding.status]}
        </Pill>
        <Pill>{FINDING_SEVERITY_LABEL[finding.severity]}</Pill>
        <Pill>{CONFIDENCE_LABEL[finding.confidence]}</Pill>
      </span>

      <span className="text-[15px] leading-5 font-medium">
        {finding.headline}
      </span>

      <span className="text-xs leading-none text-secondary">
        {finding.primaryRuleName} · {finding.category}
      </span>

      <span className="text-sm leading-5 text-secondary">
        {finding.explanation}
      </span>

      {finding.suggestedAction && (
        <span className="rounded-[10px] bg-white/5 px-3 py-2.5 text-sm leading-5">
          Suggested action: {finding.suggestedAction}
        </span>
      )}

      {finding.evidence.length > 0 && (
        <span className="flex flex-col gap-1.5">
          <span className="text-xs leading-none font-medium text-secondary">
            Supporting email evidence
          </span>
          {finding.evidence.map((item) => (
            <span
              key={item.id}
              className="rounded-[10px] bg-white/6 px-3 py-2.5 text-[13px] leading-relaxed shadow-[inset_0_0_0_1px_var(--color-hairline)]"
            >
              “{item.anchor}”
              <span className="mt-1.5 block text-meta text-secondary">
                {item.message.from} · {item.message.short}
              </span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

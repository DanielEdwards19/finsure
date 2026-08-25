"use client";

import { findThread } from "@/lib/data/threads";
import { reviewForApplication } from "@/lib/domain/compliance";
import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
import type { ApplicationId, ThreadId } from "@/lib/domain/types";
import { Card, CanvasTitle, Caveat, Pill, Section } from "./ui";

/**
 * An email thread, with the passages a finding was anchored to marked in place.
 *
 * Showing the evidence inside its original message is the point: a quoted
 * fragment on its own can read very differently from the same words in context,
 * and the reviewer is being asked to judge the correspondence, not the quote.
 */
export function ThreadView({
  scope,
  applicationId,
  threadId,
  onOpen,
}: {
  scope: DataScope;
  applicationId: ApplicationId;
  threadId: ThreadId;
  onOpen: (view: CanvasView) => void;
}) {
  const thread = findThread(threadId);
  if (!thread) return null;

  const review = reviewForApplication(scope, applicationId);

  // Which findings anchored to each message, so evidence appears beside the text
  // it came from.
  const findingsByMessage = new Map<number, string[]>();
  for (const finding of review?.findings ?? []) {
    for (const evidence of finding.evidence) {
      const existing = findingsByMessage.get(evidence.messageIndex) ?? [];
      findingsByMessage.set(evidence.messageIndex, [
        ...existing,
        evidence.anchor,
      ]);
    }
  }

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title={thread.subject}>
        <Pill>{thread.messages.length} messages</Pill>
      </CanvasTitle>

      <button
        type="button"
        onClick={() => onOpen({ kind: "application", id: applicationId })}
        className="w-fit cursor-pointer rounded-card border border-hairline bg-white/6 px-3.5 py-2 text-[13px] font-medium hover:bg-white/10"
      >
        ← Back to the application
      </button>

      <Section label="Correspondence">
        <div className="flex flex-col gap-4">
          {thread.messages.map((message, index) => {
            const anchors = findingsByMessage.get(index) ?? [];
            return (
              <Card key={`${message.iso}-${index}`}>
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="text-base leading-[19px] font-medium">
                    {message.from}
                  </span>
                  <span className="text-meta text-secondary">
                    {message.fromEmail}
                  </span>
                  <span className="text-meta text-secondary">
                    · {message.date}
                  </span>
                </span>

                <span className="text-meta text-secondary [overflow-wrap:anywhere]">
                  To: {message.to}
                  {message.cc && ` · Cc: ${message.cc}`}
                </span>

                <p className="m-0 text-sm leading-6 whitespace-pre-line [overflow-wrap:anywhere]">
                  {message.body}
                </p>

                {message.attachments.length > 0 && (
                  <span className="flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <Pill key={attachment}>{attachment}</Pill>
                    ))}
                  </span>
                )}

                {anchors.length > 0 && (
                  <span className="flex flex-col gap-1.5 rounded-card bg-accent/7 px-4 py-3 shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.28)]">
                    <span className="text-meta font-medium text-secondary">
                      Passages identified in this message
                    </span>
                    {anchors.map((anchor) => (
                      <span
                        key={anchor}
                        className="text-[13px] leading-5 [overflow-wrap:anywhere]"
                      >
                        “{anchor}”
                      </span>
                    ))}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      </Section>

      <Caveat>
        Passages are identified from the correspondence and presented for human
        review. No compliance determination is made.
      </Caveat>
    </div>
  );
}

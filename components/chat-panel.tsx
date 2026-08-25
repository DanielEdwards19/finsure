"use client";

import { useEffect, useRef } from "react";

import { suggestions } from "@/lib/domain/ask";
import type { DataScope } from "@/lib/domain/identity";
import type { Chat } from "@/lib/use-conversations";
import { AnswerView } from "./answer-view";
import { BackGlyph } from "./glyph";

export function ChatPanel({
  chat,
  scope,
  onBack,
}: {
  chat: Chat;
  scope: DataScope;
  onBack: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const messages = chat.active?.messages ?? [];

  // Follow the conversation as it grows, but only when the reader is already at
  // the bottom — otherwise scrolling back to re-read an answer fights the app.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance > 4) el.scrollTop = el.scrollHeight;
  }, [messages.length, chat.working]);

  const empty = messages.length === 0 && !chat.working;

  return (
    <>
      <div className="flex flex-none items-center gap-4 px-6 pt-6">
        <button
          type="button"
          onClick={onBack}
          title="Back"
          className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-white/5 p-0"
        >
          <BackGlyph />
        </button>
      </div>

      <div
        ref={scroller}
        className="flex min-h-0 scrollbar-thin flex-1 flex-col gap-6 overflow-auto px-6 pt-4 pb-2"
      >
        {empty && (
          <p className="m-0 px-0.5 py-1.5 text-[13px] leading-relaxed text-secondary">
            Ask anything about the client or the network. Answers are grounded
            only in the record, with source citations you can open. The canvas
            on the left responds.
          </p>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div
              key={index}
              className="w-[348px] max-w-full self-end rounded-2xl bg-white/10 p-4 text-base leading-[19px] font-medium"
            >
              {message.text}
            </div>
          ) : (
            <AnswerView key={index} answer={message.answer} />
          ),
        )}

        {chat.working && <Working {...chat.working} />}
      </div>

      {empty && (
        <div className="flex-none px-[18px] pt-3 pb-1">
          <div className="mb-2.5 flex flex-col gap-1.5">
            {suggestions(scope, chat.view).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => chat.askQuestion(question)}
                className="cursor-pointer rounded-2xl border border-hairline bg-surface/60 px-3 py-2 text-left text-xs leading-[1.4] text-[#c4c6ca] hover:bg-surface"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** The systems being read, revealed one at a time as the answer is assembled. */
function Working({ steps, at }: { steps: readonly string[]; at: number }) {
  return (
    <div className="w-full animate-rise self-start rounded-[3px_14px_14px_14px] border border-hairline bg-surface px-4 py-3.5">
      <div className="mb-[11px] flex items-center gap-2">
        <span className="block size-3.5 flex-none animate-spin-slow rounded-full border-[1.6px] border-white/20 border-t-white" />
        <span className="text-xs font-medium">Working through the record…</span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-[7px] p-0">
        {steps.map((step, index) => {
          const done = index < at;
          const current = index === at;
          return (
            <li key={step} className="flex items-center gap-[9px]">
              <span
                className={`block size-1.5 flex-none rounded-full ${
                  done
                    ? "bg-good-text"
                    : current
                      ? "animate-shimmer bg-accent"
                      : "bg-white/20"
                }`}
              />
              <span
                className={`text-xs ${
                  current
                    ? "font-medium text-primary"
                    : done
                      ? "text-secondary"
                      : "text-tertiary"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

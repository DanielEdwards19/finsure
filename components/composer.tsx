"use client";

import { Glyph } from "./glyph";
import { useState } from "react";

/**
 * The question bar. Voice input is shown because the product is designed for
 * brokers working between appointments, but it is not wired up in the prototype.
 */
export function Composer({
  onAsk,
  busy,
}: {
  onAsk: (question: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");
  const hasInput = value.trim().length > 0;

  const submit = () => {
    if (!hasInput || busy) return;
    onAsk(value);
    setValue("");
  };

  return (
    <div className="flex h-[77px] flex-none items-center justify-center rounded-b-[20px] bg-[rgb(7_13_26_/_0.1)] px-3 pb-[19px]">
      <form
        className="flex h-[58px] w-full items-center gap-2.5 rounded-full bg-white/10 py-1 pr-1 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="composer">
          Ask anything about Finsure
        </label>
        <input
          id="composer"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything about Finsure"
          autoComplete="off"
          className="h-[50px] min-w-0 flex-1 border-0 bg-transparent p-0 text-base leading-none font-medium outline-none"
        />

        <div className="flex h-[50px] flex-none items-center gap-1">
          <button
            type="button"
            title="Voice input is not available in the prototype"
            disabled
            className="flex size-[50px] flex-none items-center justify-center rounded-full border-0 bg-transparent p-0 opacity-60"
          >
            <Glyph
              src="/assets/ic-mic.svg"
              className="bg-primary"
              size={{ width: 18, height: 24 }}
            />
          </button>

          <button
            type="submit"
            title={hasInput ? "Send" : "Ask a question"}
            disabled={!hasInput || busy}
            className="flex size-[50px] flex-none items-center justify-center rounded-full border-0 bg-white p-0 disabled:opacity-70"
          >
            {busy ? (
              <span className="block size-[18px] animate-spin-slow rounded-full border-2 border-black/20 border-t-black" />
            ) : hasInput ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="black"
                aria-hidden
                className="block -rotate-90"
              >
                <path d="M 12 24 L 9.862 21.9 L 18.262 13.5 L 0 13.5 L 0 10.5 L 18.262 10.5 L 9.862 2.1 L 12 0 L 24 12 L 12 24 Z" />
              </svg>
            ) : (
              <Glyph
                src="/assets/ic-voice.svg"
                className="bg-surface"
                size={{ width: 27.625, height: 25 }}
              />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

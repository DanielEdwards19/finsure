"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ask } from "@/lib/domain/ask";
import type { Answer, CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";

export interface UserMessage {
  readonly role: "user";
  readonly text: string;
}

export interface AssistantMessage {
  readonly role: "assistant";
  readonly answer: Answer;
}

export type ChatMessage = UserMessage | AssistantMessage;

export interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly ChatMessage[];
  /** Canvas view this conversation left open, restored when it is reopened. */
  readonly view: CanvasView;
}

/**
 * Steps shown while an answer is being assembled.
 *
 * These are not decoration: they name the systems being read, which is what
 * makes the eventual answer's provenance legible. A network question reads the
 * whole broker network; a client question opens one file.
 */
const STEPS = {
  network: [
    "Reading your request",
    "Querying Infynity across the broker network",
    "Scanning Microsoft 365, SharePoint & Outlook",
    "Reconciling evidence by branch",
    "Compiling the snapshot",
  ],
  client: [
    "Reading your request",
    "Opening the client record",
    "Reviewing payslips, statements & file notes",
    "Reconciling evidence and citations",
    "Preparing the answer",
  ],
  short: [
    "Reading your request",
    "Searching the record",
    "Preparing the answer",
  ],
} as const;

const STEP_MS = 620;

const stepsFor = (answer: Answer): readonly string[] => {
  const kind = answer.view?.kind;
  if (kind === "application" || kind === "thread" || answer.records) {
    return STEPS.client;
  }
  if (kind === "networkReport" || kind === "compliance" || kind === "branch") {
    return STEPS.network;
  }
  return STEPS.short;
};

export interface Chat {
  readonly conversations: readonly Conversation[];
  readonly active: Conversation | null;
  readonly view: CanvasView;
  /** Steps being worked through, or null when idle. */
  readonly working: {
    readonly steps: readonly string[];
    readonly at: number;
  } | null;
  readonly askQuestion: (question: string, title?: string) => void;
  /** Open a canvas view without asking anything, e.g. from a map marker. */
  readonly openView: (
    view: CanvasView,
    title: string,
    question: string,
  ) => void;
  readonly newConversation: () => void;
  readonly open: (id: string) => void;
  readonly setView: (view: CanvasView) => void;
  /**
   * Discard every conversation. Called when the identity changes, because the
   * answers were built from a dataset the new identity may not be allowed to
   * see — they cannot simply be re-labelled.
   */
  readonly reset: () => void;
}

/**
 * Conversation state.
 *
 * The delay before an answer appears is deliberate. The prototype is
 * demonstrating work that would otherwise take a person hours, and showing
 * which systems were read is part of the claim.
 */
export function useConversations(scope: DataScope): Chat {
  const [conversations, setConversations] = useState<readonly Conversation[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<CanvasView>({ kind: "map" });
  const [working, setWorking] = useState<Chat["working"]>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sequence = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const commit = useCallback(
    (id: string, answer: Answer) => {
      clearTimers();
      const steps = stepsFor(answer);
      setWorking({ steps, at: 0 });

      steps.forEach((_, index) => {
        if (index === 0) return;
        timers.current.push(
          setTimeout(() => setWorking({ steps, at: index }), index * STEP_MS),
        );
      });

      timers.current.push(
        setTimeout(
          () => {
            setWorking(null);
            setConversations((current) =>
              current.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      messages: [...c.messages, { role: "assistant", answer }],
                      view: answer.view ?? c.view,
                    }
                  : c,
              ),
            );
            if (answer.view) setView(answer.view);
          },
          steps.length * STEP_MS + 320,
        ),
      );
    },
    [clearTimers],
  );

  const start = useCallback(
    (question: string, title: string, answer: Answer) => {
      sequence.current += 1;
      const id = `c${sequence.current}`;

      setConversations((current) => [
        {
          id,
          title,
          messages: [{ role: "user", text: question }],
          view: { kind: "map" },
        },
        ...current,
      ]);
      setActiveId(id);
      commit(id, answer);
    },
    [commit],
  );

  const askQuestion = useCallback(
    (question: string, title?: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const answer = ask(scope, trimmed);
      const existing = activeId
        ? conversations.find((c) => c.id === activeId)
        : null;

      // Continue the open conversation rather than starting a new one for every
      // follow-up question.
      if (existing) {
        setConversations((current) =>
          current.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  messages: [...c.messages, { role: "user", text: trimmed }],
                }
              : c,
          ),
        );
        commit(existing.id, answer);
        return;
      }

      start(trimmed, title ?? trimmed, answer);
    },
    [scope, activeId, conversations, commit, start],
  );

  const openView = useCallback(
    (target: CanvasView, title: string, question: string) => {
      const answer = { ...ask(scope, question), view: target };
      start(question, title, answer);
    },
    [scope, start],
  );

  const newConversation = useCallback(() => {
    clearTimers();
    setWorking(null);
    sequence.current += 1;
    const id = `c${sequence.current}`;
    setConversations((current) => [
      { id, title: "New conversation", messages: [], view: { kind: "map" } },
      ...current,
    ]);
    setActiveId(id);
    setView({ kind: "map" });
  }, [clearTimers]);

  const open = useCallback(
    (id: string) => {
      clearTimers();
      setWorking(null);
      setActiveId(id);
      setConversations((current) => {
        const found = current.find((c) => c.id === id);
        if (found) setView(found.view);
        return current;
      });
    },
    [clearTimers],
  );

  const reset = useCallback(() => {
    clearTimers();
    setConversations([]);
    setActiveId(null);
    setView({ kind: "map" });
    setWorking(null);
  }, [clearTimers]);

  return {
    conversations,
    active: conversations.find((c) => c.id === activeId) ?? null,
    view,
    working,
    askQuestion,
    openView,
    newConversation,
    open,
    setView,
    reset,
  };
}

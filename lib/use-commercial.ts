"use client";

import { useCallback, useMemo, useState } from "react";

import { systemClock } from "@/lib/domain/clock";
import {
  activeFindings,
  calcs,
  canFinalise,
  checkItems,
  currentQuestionId,
  deriveFields,
  docRegister,
  docSummary,
  gateItems,
  progression,
  stageOf,
  uploadStage,
} from "@/lib/domain/commercial/derive";
import { QUESTIONS } from "@/lib/domain/commercial/flow";
import { reduce, type CommercialAction } from "@/lib/domain/commercial/reducer";
import { createApplication, type CommercialState } from "@/lib/domain/commercial/state";

/**
 * Everything the commercial screens read, recomputed from one immutable state.
 *
 * Nothing derived is stored: the fields, documents, findings, calculations and
 * progression are all functions of the answers the broker has recorded. That is
 * what makes changing an earlier answer withdraw its consequences instead of
 * leaving them behind.
 */
export interface Commercial {
  readonly state: CommercialState;
  readonly dispatch: (action: CommercialAction) => void;
  readonly reset: () => void;

  readonly fields: ReturnType<typeof deriveFields>;
  readonly calculations: ReturnType<typeof calcs>;
  readonly documents: ReturnType<typeof docRegister>;
  readonly documentSummary: ReturnType<typeof docSummary>;
  readonly findings: ReturnType<typeof activeFindings>;
  readonly gate: ReturnType<typeof gateItems>;
  readonly checks: ReturnType<typeof checkItems>;
  readonly progress: ReturnType<typeof progression>;
  readonly finalisation: ReturnType<typeof canFinalise>;
  readonly stage: string;
  readonly upload: ReturnType<typeof uploadStage>;
  /** The question awaiting an answer, or null when the flow is complete. */
  readonly question: (typeof QUESTIONS)[string] | null;
}

export function useCommercial(): Commercial {
  /*
   * The clock is read in the initialiser, which runs once, rather than in the
   * render body — otherwise the opening timestamp would move on every pass and
   * the audit trail would record time passing as a change to the file.
   */
  const [state, setState] = useState<CommercialState>(() =>
    createApplication(systemClock.now()),
  );

  const dispatch = useCallback((action: CommercialAction) => {
    setState((current) => reduce(current, action, systemClock));
  }, []);

  const reset = useCallback(() => {
    setState(createApplication(systemClock.now()));
  }, []);

  return useMemo(() => {
    const fields = deriveFields(state);
    const qid = currentQuestionId(state);

    return {
      state,
      dispatch,
      reset,
      fields,
      calculations: calcs(state, fields),
      documents: docRegister(state),
      documentSummary: docSummary(state),
      findings: activeFindings(state),
      gate: gateItems(state),
      checks: checkItems(state),
      progress: progression(state),
      finalisation: canFinalise(state),
      stage: stageOf(state),
      upload: uploadStage(state),
      question: qid ? QUESTIONS[qid] : null,
    };
  }, [state, dispatch, reset]);
}

/**
 * Time as an injected dependency.
 *
 * The prototype called `new Date()` and `Date.now()` inside the state engine.
 * In a server-rendered app that is a correctness problem, not a style one: the
 * server and the client each get a different value for the same render, so the
 * markup does not match and React discards it. It also makes the engine
 * untestable, because a snapshot of derived state changes every run.
 *
 * Every function that needs the current time takes a `Clock`. Production passes
 * `systemClock`; tests pass `fixedClock`.
 */

export interface Clock {
  /** Current time as an ISO 8601 string. */
  readonly now: () => string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};

/** A clock frozen at one instant, for tests and deterministic snapshots. */
export const fixedClock = (iso: string): Clock => ({ now: () => iso });

/**
 * A clock that advances by a fixed step on each read, for asserting ordering
 * without depending on real elapsed time.
 */
export function steppingClock(startIso: string, stepMs = 1000): Clock {
  let current = new Date(startIso).getTime();
  return {
    now: () => {
      const iso = new Date(current).toISOString();
      current += stepMs;
      return iso;
    },
  };
}

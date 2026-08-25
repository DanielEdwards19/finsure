/**
 * Canonical email correspondence.
 *
 * Normalises the generated archive into `Thread` records that carry both the
 * client file reference and the application identifier, since the compliance
 * layer joins on the reference while the workspace routes on the application.
 */

import { THREADS as RAW_THREADS } from "./raw/threads.generated";
import { findApplicationBySlug } from "./network";
import {
  fileReference,
  threadId,
  type ApplicationId,
  type FileReference,
  type Thread,
  type ThreadId,
} from "@/lib/domain/types";

export const THREADS: readonly Thread[] = RAW_THREADS.map((t) => {
  const application = findApplicationBySlug(t.appId);
  if (!application) {
    throw new Error(
      `Thread ${t.id} references application slug "${t.appId}", which is not in the network data.`,
    );
  }

  if (t.messages.length === 0) {
    throw new Error(`Thread ${t.id} has no messages.`);
  }

  // `last`, `lastDate` and `count` are dropped: each duplicates something
  // already in `messages`, and a duplicate can disagree with its source.
  return {
    id: threadId(t.id),
    reference: fileReference(t.ref),
    applicationId: application.id,
    customer: t.customer,
    clients: t.clients,
    broker: t.broker,
    branch: t.branch,
    application: t.application,
    messages: t.messages,
    subject: t.subject,
    participants: t.participants,
  };
});

const threadsById: ReadonlyMap<ThreadId, Thread> = new Map(
  THREADS.map((t) => [t.id, t]),
);

const threadsByApplication: ReadonlyMap<ApplicationId, readonly Thread[]> =
  THREADS.reduce((acc, thread) => {
    const existing = acc.get(thread.applicationId) ?? [];
    acc.set(thread.applicationId, [...existing, thread]);
    return acc;
  }, new Map<ApplicationId, Thread[]>());

const threadsByReference: ReadonlyMap<FileReference, readonly Thread[]> =
  THREADS.reduce((acc, thread) => {
    const existing = acc.get(thread.reference) ?? [];
    acc.set(thread.reference, [...existing, thread]);
    return acc;
  }, new Map<FileReference, Thread[]>());

export const findThread = (id: ThreadId): Thread | undefined =>
  threadsById.get(id);

export const threadsForApplication = (
  id: ApplicationId,
): readonly Thread[] => threadsByApplication.get(id) ?? [];

export const threadsForReference = (
  reference: FileReference,
): readonly Thread[] => threadsByReference.get(reference) ?? [];

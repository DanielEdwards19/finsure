"use client";

import { documentPath, findDocument } from "@/lib/domain/client-files";
import { ASSESSMENT_STATE_LABEL } from "@/lib/domain/types";
import { Card, CanvasTitle, Caveat, Grid, Label, Pill } from "./ui";

/**
 * One client-file document, opened from the Files list or a finding citation.
 *
 * GUARDRAIL: a restricted document shows its metadata and recorded notes, never
 * a preview of the file itself.
 */
export function DocumentView({ id }: { id: string }) {
  const document = findDocument(id);

  if (!document) {
    return (
      <div className="max-w-[520px] animate-rise">
        <h1 className="m-0 mb-2 text-2xl font-medium">Record not available</h1>
        <p className="m-0 text-base leading-6 text-secondary">
          This record is not among those available to you. Nothing here
          indicates whether it exists.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-medium tracking-[0.04em] text-secondary uppercase">
          Client file document
        </span>
        <CanvasTitle title={document.name}>
          <Pill>{ASSESSMENT_STATE_LABEL[document.status]}</Pill>
        </CanvasTitle>
        <span className="text-sm text-secondary">
          {document.source} · {document.kind} · {document.date}
        </span>
      </div>

      <Grid min={300}>
        <Card>
          <Label>Record details</Label>
          <span className="text-sm leading-5 text-secondary">
            Source system: {document.source}
          </span>
          <span className="text-sm leading-5 text-secondary">
            Record type: {document.kind}
          </span>
          <span className="text-sm leading-5 text-secondary">
            Dated: {document.date}
          </span>
          <span className="text-sm leading-5 [overflow-wrap:anywhere] text-secondary">
            File: {document.file} ({document.size})
          </span>
          {(document.attachmentNames?.length ?? 0) > 0 && (
            <span className="text-sm leading-5">
              Also attached to an email in this file
            </span>
          )}
        </Card>
        <Card>
          <Label>Summary</Label>
          <span className="text-base leading-6">{document.summary}</span>
        </Card>
      </Grid>

      {document.restricted && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-accent/7 px-6 py-5 shadow-[inset_0_0_0_1px_rgb(255_153_0_/_0.28)]">
          <span className="text-base font-medium text-[rgb(255,176,58)]">
            Restricted personal information
          </span>
          <span className="text-sm leading-5 text-secondary">
            Metadata is visible. Document preview is restricted in standard
            views.
          </span>
        </div>
      )}

      <span className="text-base font-medium">Recorded in this document</span>
      <Card>
        {document.detail.map((line) => (
          <span key={line} className="text-base leading-6">
            {line}
          </span>
        ))}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {document.restricted ? (
          <span className="rounded-lg bg-white/6 px-3.5 py-2.5 text-xs font-medium text-secondary shadow-[inset_0_0_0_1px_var(--color-hairline)]">
            Preview restricted — request access under policy
          </span>
        ) : (
          <a
            href={documentPath(document)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white px-3.5 py-2.5 text-xs font-medium text-inset no-underline"
          >
            Open original file
          </a>
        )}
      </div>

      <Caveat>
        Fictional prototype data. This is not a valid bank statement, lender
        approval, insurance certificate, legal document, credit assessment,
        identity record or financial recommendation.
      </Caveat>
    </div>
  );
}

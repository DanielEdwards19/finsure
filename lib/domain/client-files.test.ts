import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DOCUMENTS,
  documentPath,
  documentsForReference,
  findDocumentByAttachment,
  recordDocumentsFor,
} from "./client-files";
import { fileReference } from "./types";

describe("client documents", () => {
  /*
   * The document cards link straight at these paths, so a renamed or missing
   * file would 404 silently in the browser. Asserting against the filesystem is
   * the only way that failure surfaces before someone clicks it.
   */
  it("has every document present on disk", () => {
    const missing = DOCUMENTS.filter(
      (document) => !existsSync(`public${documentPath(document)}`),
    );

    expect(missing.map((d) => d.file)).toEqual([]);
    expect(DOCUMENTS.length).toBeGreaterThan(0);
  });

  it("serves documents from the public directory", () => {
    for (const document of DOCUMENTS) {
      expect(documentPath(document)).toMatch(/^\/files\//);
    }
  });

  it("returns documents only for the reference that has them", () => {
    expect(documentsForReference(fileReference("FIN-DEMO-0002")).length).toBe(
      DOCUMENTS.length,
    );
    expect(documentsForReference(fileReference("FIN-DEMO-0001"))).toEqual([]);
  });

  it("omits prototype packaging from the client file list", () => {
    const records = recordDocumentsFor(fileReference("FIN-DEMO-0002"));
    expect(records.length).toBeLessThan(DOCUMENTS.length);
    expect(records.every((d) => d.source !== "Prototype logic")).toBe(true);
    expect(records.every((d) => d.source !== "Prototype package")).toBe(true);
  });

  it("resolves an email attachment back to its stored record", () => {
    const withAttachment = DOCUMENTS.find(
      (d) => (d.attachmentNames ?? []).length > 0,
    );

    expect(withAttachment).toBeDefined();
    const name = withAttachment!.attachmentNames![0];
    expect(findDocumentByAttachment(name)?.id).toBe(withAttachment!.id);
  });

  it("matches attachment names regardless of case", () => {
    const withAttachment = DOCUMENTS.find(
      (d) => (d.attachmentNames ?? []).length > 0,
    )!;
    const name = withAttachment.attachmentNames![0];

    expect(findDocumentByAttachment(name.toUpperCase())?.id).toBe(
      withAttachment.id,
    );
  });

  // GUARDRAIL: a restricted document's metadata is visible but its contents are
  // never previewed. The UI must be able to tell the two cases apart.
  it("flags restricted documents so the preview can be withheld", () => {
    const restricted = DOCUMENTS.filter((d) => d.restricted);

    for (const document of restricted) {
      expect(document.name).toBeTruthy();
      expect(document.summary).toBeTruthy();
    }
  });
});

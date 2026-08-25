import { describe, expect, it } from "vitest";

import { DOCS, QUESTIONS } from "./flow";
import {
  CATEGORIES,
  CLIENT_MATCH,
  DOCX_PREVIEW,
  DOC_ANSWERS,
  DOC_PACK,
  FIELD_META,
  FIELD_NOTES,
  INTENTIONAL_GAPS,
  PACK_DIR,
  REVIEW_STATE,
  SOURCE_MAP,
  TOTAL_DOCS,
  UNMAPPED_LABELS,
  findPackDocument,
} from "./document-pack";

const packIds = new Set(DOC_PACK.map((d) => d.documentId));
const categoryIds = new Set(CATEGORIES.map((c) => c.id));
const requirementIds = new Set(DOCS.map((d) => d.id));

describe("pack manifest", () => {
  it("holds eleven documents", () => {
    expect(DOC_PACK).toHaveLength(11);
    expect(TOTAL_DOCS).toBe(DOC_PACK.length);
  });

  it("gives every document a unique id and position", () => {
    expect(packIds.size).toBe(DOC_PACK.length);
    expect(DOC_PACK.map((d) => d.n)).toEqual(
      DOC_PACK.map((_, index) => index + 1),
    );
  });

  it("files every document under a real category", () => {
    for (const doc of DOC_PACK) {
      expect(categoryIds, doc.documentId).toContain(doc.category);
    }
  });

  it("serves every file from the pack directory as an absolute path", () => {
    for (const doc of DOC_PACK) {
      expect(doc.path, doc.documentId).toBe(PACK_DIR + doc.filename);
      expect(doc.path, doc.documentId).toMatch(/^\//);
    }
  });

  it("derives a readable display name from the filename", () => {
    const extract = findPackDocument("DOC-001")!;
    expect(extract.filename).toBe(
      "01_ASIC_Current_Company_Extract_PROTOTYPE.pdf",
    );
    expect(extract.displayName).toBe("ASIC Current Company Extract");
  });

  it("matches the mime type and label to the file kind", () => {
    for (const doc of DOC_PACK) {
      if (doc.kind === "pdf") {
        expect(doc.mime, doc.documentId).toBe("application/pdf");
        expect(doc.typeLabel, doc.documentId).toBe("PDF document");
      } else {
        expect(doc.mime, doc.documentId).toContain("wordprocessingml");
        expect(doc.typeLabel, doc.documentId).toBe("Word document (.docx)");
      }
    }
  });

  it("formats small sizes with a decimal and larger ones without", () => {
    expect(findPackDocument("DOC-001")!.sizeLabel).toBe("2.9 KB");
    expect(findPackDocument("DOC-006")!.sizeLabel).toBe("38 KB");
  });

  it("resolves by id and returns null otherwise", () => {
    expect(findPackDocument("DOC-007")?.title).toBe("Contract of Sale Extract");
    expect(findPackDocument("DOC-999")).toBeNull();
  });

  it("previews every .docx file, since a browser cannot render one", () => {
    for (const doc of DOC_PACK.filter((d) => d.kind === "docx")) {
      expect(DOCX_PREVIEW[doc.documentId], doc.documentId).toBeDefined();
    }
  });

  it("gives each preview row a cell per column", () => {
    for (const [id, preview] of Object.entries(DOCX_PREVIEW)) {
      for (const [index, row] of preview.rows.entries()) {
        expect(row.length, `${id} row ${index}`).toBe(preview.columns.length);
      }
    }
  });
});

describe("source map", () => {
  it("reads every value from a document in the pack", () => {
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      expect(packIds, key).toContain(entry.source);
    }
  });

  it("cross-checks only against documents in the pack", () => {
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      for (const source of entry.crossCheckSources ?? []) {
        expect(packIds, `${key} crossCheck`).toContain(source);
      }
    }
  });

  it("locates every value on a page and in a section", () => {
    // A value a reviewer cannot find in the source is not traceable evidence.
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      expect(entry.page, key).toBeGreaterThan(0);
      expect(entry.section.length, key).toBeGreaterThan(0);
    }
  });

  it("gives every value a review status that is never 'verified'", () => {
    // docs/DESIGN.md §2: extraction never concludes. The strongest state a
    // value can reach is broker confirmed.
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      expect(REVIEW_STATE[entry.reviewStatus], key).toBeDefined();
      expect(entry.reviewStatus, key).not.toMatch(
        /verified|compliant|approved/,
      );
    }
  });

  it("does not start any value in a broker-set state", () => {
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      expect(["broker_confirmed", "broker_edited"], key).not.toContain(
        entry.reviewStatus,
      );
    }
  });

  it("cross-checks a value it reports as confirmed by two documents", () => {
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      if (entry.reviewStatus === "confirmed_by_two_documents") {
        expect(entry.crossCheckSources, key).toBeDefined();
        expect(entry.crossCheckSources!.length, key).toBeGreaterThan(0);
      }
    }
  });

  it("holds a normalised figure for review rather than relying on it", () => {
    // The statements describe EBITDA as normalised without evidencing the
    // adjustments, so it must not present as a confirmed figure.
    expect(SOURCE_MAP.normalisedEbitda.reviewStatus).toBe(
      "normalisation_evidence_required",
    );
    expect(SOURCE_MAP.normalisationAddBack.reviewStatus).toBe(
      "normalisation_evidence_required",
    );
    expect(FIELD_NOTES.normalisedEbitda).toBeDefined();
  });

  it("keeps proposed rental income out of serviceability until verified", () => {
    expect(SOURCE_MAP.proposedTenant.reviewStatus).toBe(
      "heads_of_agreement_missing",
    );
    expect(FIELD_NOTES.proposedTenant).toContain(
      "excluded from serviceability",
    );
  });

  it("accounts for every field a document declares it supplies", () => {
    // A declared field with no entry in the source map, no field meta and no
    // unmapped label would vanish from the register without explanation.
    for (const doc of DOC_PACK) {
      for (const field of doc.extracted) {
        const accounted =
          field in SOURCE_MAP ||
          field in FIELD_META ||
          field in UNMAPPED_LABELS;
        expect(accounted, `${doc.documentId}/${field}`).toBe(true);
      }
    }
  });

  it("declares every extracted value on the document it came from", () => {
    for (const [key, entry] of Object.entries(SOURCE_MAP)) {
      const source = findPackDocument(entry.source)!;
      const declared =
        source.extracted.includes(key) ||
        (FIELD_META[key] && source.extracted.includes(FIELD_META[key].appKey));
      expect(declared, `${entry.source} should declare ${key}`).toBeTruthy();
    }
  });
});

describe("field mapping", () => {
  it("maps every field to a real question", () => {
    for (const [key, meta] of Object.entries(FIELD_META)) {
      expect(QUESTIONS[meta.qid], `${key} -> ${meta.qid}`).toBeDefined();
    }
  });

  it("maps every field to a distinct application key", () => {
    const keys = Object.values(FIELD_META).map((m) => m.appKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has field meta for every extracted value", () => {
    for (const key of Object.keys(SOURCE_MAP)) {
      expect(FIELD_META[key], key).toBeDefined();
    }
  });

  it("formats money and percentage fields as such", () => {
    expect(FIELD_META.purchasePrice.format).toBe("money");
    expect(FIELD_META.thirdPartyOccupancyPercent.format).toBe("percent");
    expect(FIELD_META.settlementDate.format).toBe("date");
    expect(FIELD_META.legalEntityName.format).toBe("text");
  });

  it("carries no functions, so the mapping can cross the server boundary", () => {
    for (const [key, meta] of Object.entries(FIELD_META)) {
      for (const [field, value] of Object.entries(meta)) {
        expect(typeof value, `${key}.${field}`).not.toBe("function");
      }
    }
  });
});

describe("document answers", () => {
  it("answers only real questions with real option values", () => {
    for (const answer of DOC_ANSWERS) {
      const question = QUESTIONS[answer.qid];
      expect(question, answer.qid).toBeDefined();

      const permitted = new Set(question.options.map((o) => o.v));
      for (const value of answer.values) {
        expect(permitted, `${answer.qid}/${value}`).toContain(value);
      }
    }
  });

  it("cites a document in the pack for every answer", () => {
    for (const answer of DOC_ANSWERS) {
      expect(packIds, answer.qid).toContain(answer.docId);
      expect(answer.page, answer.qid).toBeGreaterThan(0);
    }
  });

  it("states the basis for every answer", () => {
    // An answer read from a document must show the words that support it.
    for (const answer of DOC_ANSWERS) {
      expect(answer.basis.length, answer.qid).toBeGreaterThan(20);
    }
  });

  it("answers each question at most once", () => {
    const ids = DOC_ANSWERS.map((a) => a.qid);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("identifies the client from keys present in the source map", () => {
    expect(SOURCE_MAP[CLIENT_MATCH.abnKey]).toBeDefined();
    expect(SOURCE_MAP[CLIENT_MATCH.nameKey]).toBeDefined();
    expect(packIds).toContain(CLIENT_MATCH.docId);
  });
});

describe("intentional gaps", () => {
  it("maps every gap to a real document requirement", () => {
    for (const gap of INTENTIONAL_GAPS) {
      expect(requirementIds, gap.id).toContain(gap.docId);
    }
  });

  it("explains every gap without asserting the fact is absent", () => {
    // docs/DESIGN.md §2: a missing document is "information required", never a
    // negative finding.
    for (const gap of INTENTIONAL_GAPS) {
      expect(gap.why.length, gap.id).toBeGreaterThan(0);
      expect(gap.why, gap.id).not.toMatch(
        /does not exist|no such|failed|breach|non-?compliant/i,
      );
    }
  });

  it("names each gap uniquely", () => {
    const ids = INTENTIONAL_GAPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

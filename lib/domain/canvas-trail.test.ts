import { describe, expect, it } from "vitest";

import { applicationId } from "./types";
import { trailAfter } from "./canvas-trail";
import type { CanvasView } from "./answers";

const map: CanvasView = { kind: "map" };
const julie: CanvasView = {
  kind: "application",
  id: applicationId("APP-0002"),
};
const doc: CanvasView = {
  kind: "document",
  id: "d03",
  applicationId: applicationId("APP-0002"),
};

describe("canvas trail", () => {
  it("does not record the map when drilling in from it", () => {
    expect(trailAfter(map, [], julie)).toEqual([]);
  });

  it("records the client file when opening a document", () => {
    expect(trailAfter(julie, [], doc)).toEqual([julie]);
  });

  it("clears when returning to the map", () => {
    expect(trailAfter(doc, [julie], map)).toEqual([]);
  });

  it("leaves the trail alone when the same view is opened again", () => {
    expect(trailAfter(doc, [julie], doc)).toEqual([julie]);
  });
});

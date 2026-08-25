import { describe, expect, it } from "vitest";

import { LENDER_RESULTS } from "../types";
import { fixedClock } from "../clock";
import {
  DEFAULT_CALC_INPUTS,
  PRODUCTS,
  amortise,
  dscrOf,
  findProduct,
  nextCalculatorRunId,
  runCalculator,
  type CalculatorRun,
} from "./products";

const clock = fixedClock("2026-08-04T02:30:00.000Z");
const run = (inputs = DEFAULT_CALC_INPUTS, id = "CALC-001") =>
  runCalculator(inputs, { id, clock });

describe("products", () => {
  it("has unique identifiers", () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only the permitted result vocabulary", () => {
    // docs/DESIGN.md §2: no superlatives. The type forbids it; this catches a
    // cast or a raw string slipping through.
    for (const product of PRODUCTS) {
      expect(LENDER_RESULTS, product.id).toContain(product.result);
    }
  });

  it("never describes a product as best, cheapest or recommended", () => {
    const forbidden =
      /\bbest\b|\bcheapest\b|\brecommended\b|\bguaranteed suitable\b|\bapproved\b/i;
    for (const product of PRODUCTS) {
      for (const [field, text] of Object.entries({
        result: product.result,
        resultNote: product.resultNote,
        fit: product.fit,
        included: product.included,
        notPreferred: product.notPreferred,
      })) {
        expect(text, `${product.id}.${field}`).not.toMatch(forbidden);
      }
    }
  });

  it("labels how every rate was arrived at", () => {
    for (const product of PRODUCTS) {
      expect(product.pricing.label.length, product.id).toBeGreaterThan(0);
      expect(product.pricing.sourceType, product.id).toBeTruthy();
    }
  });

  it("cites a public source for each product", () => {
    for (const product of PRODUCTS) {
      expect(product.source, product.id).toMatch(/^https:\/\//);
      expect(product.reviewed, product.id).toBe("4 August 2026");
    }
  });

  it("resolves by id and returns null otherwise", () => {
    expect(findProduct("PROD-ANZ-BL")?.lender).toBe("ANZ");
    expect(findProduct("PROD-NOPE")).toBeNull();
  });
});

describe("amortise", () => {
  it("computes a principal and interest repayment", () => {
    const result = amortise({ amount: 1_350_000, years: 15, rate: 7.65 });
    expect(result.monthly).toBe(12630);
  });

  it("computes an interest-only repayment as interest on the balance", () => {
    const result = amortise({
      amount: 1_200_000,
      years: 10,
      rate: 6,
      repaymentType: "IO",
    });
    expect(result.monthly).toBe(6000);
    expect(result.annual).toBe(72000);
  });

  it("returns zeros rather than NaN for incomplete input", () => {
    expect(amortise({ amount: 0, years: 15, rate: 7 })).toEqual({
      monthly: 0,
      annual: 0,
      interest: 0,
    });
    expect(amortise({ amount: 500_000, years: 0, rate: 7 }).monthly).toBe(0);
    expect(amortise({ amount: 500_000, years: 15, rate: 0 }).monthly).toBe(0);
  });

  it("charges more per month over a shorter term", () => {
    const short = amortise({ amount: 1_000_000, years: 10, rate: 7 });
    const long = amortise({ amount: 1_000_000, years: 25, rate: 7 });
    expect(short.monthly).toBeGreaterThan(long.monthly);
    expect(short.interest).toBeLessThan(long.interest);
  });
});

describe("dscr", () => {
  it("divides surplus earnings by the annual repayment", () => {
    expect(dscrOf(438_000, 48_000, 151_560)).toBeCloseTo(2.573, 2);
  });

  it("returns null rather than zero when there is no repayment", () => {
    // Zero would render as a failed ratio; null renders as not calculable.
    expect(dscrOf(438_000, 48_000, 0)).toBeNull();
  });
});

describe("calculator", () => {
  it("returns a row per product", () => {
    expect(run().rows).toHaveLength(PRODUCTS.length);
  });

  it("uses the published baseline figures for the default scenario", () => {
    for (const row of run().rows) {
      const product = findProduct(row.productId)!;
      expect(row.monthly, row.productId).toBe(product.sim.monthly);
      expect(row.annual, row.productId).toBe(product.sim.annual);
      expect(row.firstYear, row.productId).toBe(product.sim.firstYear);
      expect(row.simulated, row.productId).toBe(false);
    }
  });

  it("marks figures as simulated once assumptions change", () => {
    const changed = run({ ...DEFAULT_CALC_INPUTS, years: 20 });
    for (const row of changed.rows) {
      expect(row.simulated, row.productId).toBe(true);
    }
  });

  it("applies a rate override to every product", () => {
    const overridden = run({ ...DEFAULT_CALC_INPUTS, rateOverride: 6.5 });
    for (const row of overridden.rows) {
      expect(row.rate, row.productId).toBe(6.5);
    }
  });

  it("carries assumptions and outstanding confirmations with the figures", () => {
    const result = run();
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.confirmations).toContain(
      "No credit assessment has been performed",
    );
    expect(result.status).toBe("Simulated lender calculator");
  });

  it("shows an em dash rather than a ratio it cannot compute", () => {
    const zeroed = run({ ...DEFAULT_CALC_INPUTS, amount: 0, years: 0 });
    for (const row of zeroed.rows) {
      expect(row.dscr, row.productId).toBe("—");
    }
  });

  it("is deterministic for the same inputs, clock and id", () => {
    // The prototype stamped Date.now() into the id and timestamp, so no two
    // runs were comparable and server and client renders disagreed.
    expect(run()).toEqual(run());
  });

  it("takes its timestamp from the injected clock", () => {
    expect(run().calculatedAt).toBe("2026-08-04T02:30:00.000Z");
  });
});

describe("run identifiers", () => {
  it("numbers runs sequentially", () => {
    const runs: CalculatorRun[] = [];
    expect(nextCalculatorRunId(runs)).toBe("CALC-001");
    runs.push(run(DEFAULT_CALC_INPUTS, nextCalculatorRunId(runs)));
    expect(nextCalculatorRunId(runs)).toBe("CALC-002");
  });

  it("gives distinct ids to runs made at the same instant", () => {
    const first = run(DEFAULT_CALC_INPUTS, nextCalculatorRunId([]));
    const second = run(DEFAULT_CALC_INPUTS, nextCalculatorRunId([first]));
    expect(first.id).not.toBe(second.id);
    expect(first.calculatedAt).toBe(second.calculatedAt);
  });
});

/**
 * Commercial lender products, the repayment calculator and comparison output.
 *
 * Product names and publicly described features are real, checked against public
 * lender pages on the date in `PRODUCT_REVIEW_DATE`. Rates, margins, fees and
 * every calculator output are prototype simulations unless the pricing label
 * says otherwise.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - A product's standing is a `LenderResult`, so "best" or "cheapest" cannot be
 *    expressed. The type has no such member.
 *  - Calculator output is labelled indicative simulation, and a run records the
 *    assumptions and the confirmations still outstanding alongside the figures.
 *  - Nothing here is a credit decision or a lender quote.
 */

import type { Clock } from "../clock";
import { LENDER_RESULTS, type LenderResult } from "../types";

export const PRODUCT_REVIEW_DATE = "4 August 2026";

export const COMPARISON_NOTICE = {
  title: "Hardcoded product demonstration",
  body: "Product features were checked against public lender information on 4 August 2026. Pricing and repayment results are indicative prototype simulations, not live lender quotes or credit decisions.",
} as const;

/**
 * The permitted result language, named for readability at call sites. These are
 * the `LenderResult` values, not a parallel vocabulary.
 */
export const RESULT = {
  PROPOSED: LENDER_RESULTS[0],
  ALTERNATIVE: LENDER_RESULTS[1],
  POLICY: LENDER_RESULTS[2],
  INSUFFICIENT: LENDER_RESULTS[3],
  NOT_PREFERRED: LENDER_RESULTS[4],
} as const satisfies Record<string, LenderResult>;

export type RepaymentType = "PI" | "IO";

/** How a product's headline rate was arrived at. Shown next to every figure. */
export type PricingSourceType =
  | "Simulated quote"
  | "Published starting rate"
  | "Published indicator plus simulated margin";

export interface ProductFeatures {
  readonly security: string;
  readonly rateTypes: string;
  readonly repayment: string;
  readonly extraRepayments: string;
  readonly maxTerm: string;
  readonly lvr: string;
  readonly tradingHistory: string;
}

/** Baseline simulation for the default scenario. */
export interface ProductSimulation {
  readonly monthly: number;
  readonly annual: number;
  readonly interest: number;
  readonly upfront: number;
  readonly annualFee: number;
  readonly monthlyFee: number;
  readonly firstYear: number;
  readonly dscr: string;
}

export interface Product {
  readonly id: string;
  readonly lenderId: string;
  readonly lender: string;
  readonly logo: string;
  readonly product: string;
  readonly source: string;
  readonly source2?: string;
  readonly reviewed: string;
  readonly features: ProductFeatures;
  readonly guarantees: string;
  readonly covenants: string;
  readonly flexibility: string;
  readonly pricing: {
    readonly rate: number;
    readonly label: string;
    readonly sourceType: PricingSourceType;
  };
  readonly sim: ProductSimulation;
  readonly result: LenderResult;
  readonly resultNote: string;
  /** Why the product's parameters align with the request. */
  readonly fit: string;
  /** What still requires confirmation. Never presented as a defect. */
  readonly issue: string;
  readonly policyPoints: readonly string[];
  readonly included: string;
  readonly notPreferred: string;
}

export const PRODUCTS: readonly Product[] = [
  {
    id: "PROD-ANZ-BL",
    lenderId: "LEN-ANZ",
    lender: "ANZ",
    logo: "anz.png",
    product: "ANZ Business Loan (secured)",
    source: "https://www.anz.com.au/business/loans-finance/business-loan/",
    reviewed: PRODUCT_REVIEW_DATE,
    features: {
      security: "Secured or unsecured business lending",
      rateTypes: "Fixed or variable",
      repayment: "Principal and interest, interest only, or combined",
      extraRepayments: "Variable-rate loans allow extra repayments",
      maxTerm:
        "Up to 30 years for eligible loans under $5m secured by suitable residential or commercial property",
      lvr: "Requires lender confirmation",
      tradingHistory: "Requires lender confirmation",
    },
    guarantees: "Directors’ guarantees expected for a company borrower",
    covenants: "Annual review and covenant terms require lender confirmation",
    flexibility:
      "Variable rate with extra repayments; redraw subject to product terms",
    pricing: {
      rate: 7.65,
      label: "Simulated lender quote; no public customer rate relied upon",
      sourceType: "Simulated quote",
    },
    sim: {
      monthly: 12630,
      annual: 151560,
      interest: 923403,
      upfront: 9450,
      annualFee: 600,
      monthlyFee: 0,
      firstYear: 161610,
      dscr: "2.57x",
    },
    result: RESULT.PROPOSED,
    resultNote:
      "Proposed option — ready for broker review and policy confirmation",
    fit: "The amount, requested term, commercial-property security and extra-repayment preference align with public product parameters.",
    issue:
      "Rate, fees, LVR, guarantees, valuation and proposed third-party occupancy require confirmation.",
    policyPoints: [
      "Indicative pricing is a prototype simulation, not a lender quote",
      "Maximum LVR for this transaction requires lender confirmation",
      "Treatment of proposed third-party occupancy requires lender confirmation",
    ],
    included:
      "Public product parameters align with the requested amount, 15-year term and commercial-property security.",
    notPreferred: "",
  },
  {
    id: "PROD-CBA-BBL",
    lenderId: "LEN-CBA",
    lender: "Commonwealth Bank",
    logo: "commonwealth-bank.png",
    product: "CommBank BetterBusiness Loan (secured)",
    source:
      "https://www.commbank.com.au/business/loans-and-finance/betterbusiness-loan.html",
    reviewed: PRODUCT_REVIEW_DATE,
    features: {
      security: "Commercial property can be used as security",
      rateTypes: "Fixed or variable",
      repayment: "Principal and interest, interest only, or combined",
      extraRepayments:
        "Variable-rate borrowers can make additional repayments and may access redraw",
      maxTerm: "Up to 30 years depending on the security",
      lvr: "Public page states applicants are more likely to be approved with a minimum 30% deposit for secured lending",
      tradingHistory: "Requires lender confirmation",
    },
    guarantees: "Directors’ guarantees expected for a company borrower",
    covenants: "Annual review and covenant terms require lender confirmation",
    flexibility:
      "Additional repayments and redraw on variable rates; redraw balance fee can apply over $100,000",
    pricing: {
      rate: 7.29,
      label: "Published starting rate used for simulation; not a quote",
      sourceType: "Published starting rate",
    },
    sim: {
      monthly: 12354,
      annual: 148249,
      interest: 873739,
      upfront: 10125,
      annualFee: 0,
      monthlyFee: 35,
      firstYear: 158794,
      dscr: "2.63x",
    },
    result: RESULT.ALTERNATIVE,
    resultNote:
      "Suitable alternative for consideration — policy confirmation required",
    fit: "Lowest indicative repayment of the four simulations and supports extra repayments and redraw.",
    issue:
      "Proposed deposit is below the public 30% indicator and the starting rate is not guaranteed.",
    policyPoints: [
      "Published starting rate from 7.29% p.a. (page current 15 May 2026); actual rate depends on the application",
      "Client contribution of approximately 27.03% before costs is below the published 30% deposit indicator",
      "Establishment fee depends on the application; ongoing loan service fee $35 per month",
    ],
    included:
      "Commercial-property security, long available term and extra-repayment flexibility.",
    notPreferred:
      "An additional published deposit indicator requires confirmation for this contribution level.",
  },
  {
    id: "PROD-NAB-BOL",
    lenderId: "LEN-NAB",
    lender: "NAB",
    logo: "nab.png",
    product: "NAB Business Options Loan",
    source:
      "https://www.nab.com.au/business/loans-and-finance/business-loans/nab-business-options-loans",
    source2:
      "https://www.nab.com.au/important-information/business/interest-rates-fees-charges",
    reviewed: PRODUCT_REVIEW_DATE,
    features: {
      security:
        "Secured and unsecured options; commercial or residential real estate typically used for longer terms",
      rateTypes: "Fixed or variable",
      repayment: "Principal and interest, interest only, or a combination",
      extraRepayments:
        "Variable loans allow additional repayments; redraw may be permitted subject to approval and terms",
      maxTerm: "Fixed-term business loan of up to 30 years",
      lvr: "Requires lender confirmation",
      tradingHistory: "Requires lender confirmation",
    },
    guarantees: "Directors’ guarantees expected for a company borrower",
    covenants: "Annual review and covenant terms require lender confirmation",
    flexibility:
      "Additional repayments on variable rates; redraw subject to approval",
    pricing: {
      rate: 8.1,
      label: "7.85% published indicator plus 0.25% simulated customer margin",
      sourceType: "Published indicator plus simulated margin",
    },
    sim: {
      monthly: 12979,
      annual: 155752,
      interest: 986285,
      upfront: 10125,
      annualFee: 600,
      monthlyFee: 0,
      firstYear: 166477,
      dscr: "2.50x",
    },
    result: RESULT.ALTERNATIVE,
    resultNote: "Suitable alternative for consideration",
    fit: "Long available term with secured commercial-property lending and extra-repayment capability.",
    issue:
      "Customer margin, fees, LVR and third-party occupancy treatment require confirmation.",
    policyPoints: [
      "Business Options Prime Indicator Rate was 7.85% p.a. when checked on 4 August 2026",
      "Customer margin is only available on application; the 0.25% shown is simulated",
      "Fees and charges are available on application",
    ],
    included:
      "Product parameters accommodate the requested amount, term and security type.",
    notPreferred:
      "Highest indicative repayment of the four simulations and the customer margin is unknown.",
  },
  {
    id: "PROD-WBC-BBBL",
    lenderId: "LEN-WBC",
    lender: "Westpac",
    logo: "westpac.png",
    product: "Westpac Bank Bill Business Loan",
    source:
      "https://www.westpac.com.au/business-banking/loans-finance/bank-bill-business-loan/",
    reviewed: PRODUCT_REVIEW_DATE,
    features: {
      security: "Commercial property can be used as security",
      rateTypes: "Fixed or variable, with multiple rollover periods",
      repayment: "Principal and interest or interest only",
      extraRepayments:
        "Subject to the rollover structure; requires lender confirmation",
      maxTerm: "30 days to 30 years",
      lvr: "Requires lender confirmation",
      tradingHistory: "Requires lender confirmation",
    },
    guarantees: "Directors’ guarantees expected for a company borrower",
    covenants: "Annual review and covenant terms require lender confirmation",
    flexibility:
      "BBSY-linked with rollover choices; healthcare is identified on the product page",
    pricing: {
      rate: 7.45,
      label: "Simulated BBSY-linked quote; not a published customer rate",
      sourceType: "Simulated quote",
    },
    sim: {
      monthly: 12476,
      annual: 149716,
      interest: 895741,
      upfront: 8100,
      annualFee: 4725,
      monthlyFee: 40,
      firstYear: 163021,
      dscr: "2.60x",
    },
    result: RESULT.ALTERNATIVE,
    resultNote: "Suitable alternative for consideration",
    fit: "Business lending from $250,000 with commercial-property security; healthcare is named on the product page.",
    issue:
      "BBSY resets, customer margin, line fee and third-party occupancy treatment require confirmation.",
    policyPoints: [
      "Pricing is personalised using the amount, term and BBSY at the time of quote",
      "Establishment fee and line-fee percentages are application-specific",
      "Public fee types include an establishment fee, line fee and $40 monthly service fee",
    ],
    included:
      "Suits the loan size and security type, with healthcare specifically identified.",
    notPreferred:
      "Introduces BBSY reset and line-fee complexity for the client to understand.",
  },
];

export const findProduct = (id: string): Product | null =>
  PRODUCTS.find((p) => p.id === id) ?? null;

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

export interface AmortiseInput {
  readonly amount: number;
  readonly years: number;
  readonly rate: number;
  readonly repaymentType?: RepaymentType;
}

export interface AmortiseResult {
  readonly monthly: number;
  readonly annual: number;
  readonly interest: number;
}

/**
 * Standard amortising-loan formula. A local simulation — never a lender API.
 *
 * Returns zeros rather than throwing when an input is missing or zero, because
 * the calculator is driven by a partially completed form.
 */
export function amortise({
  amount,
  years,
  rate,
  repaymentType = "PI",
}: AmortiseInput): AmortiseResult {
  const months = Math.round(years * 12);
  const monthlyRate = rate / 100 / 12;

  if (!amount || !months || !monthlyRate) {
    return { monthly: 0, annual: 0, interest: 0 };
  }

  const monthly =
    repaymentType === "IO"
      ? amount * monthlyRate
      : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  const annual = monthly * 12;
  const interest =
    repaymentType === "IO" ? annual * years : monthly * months - amount;

  return {
    monthly: Math.round(monthly),
    annual: Math.round(annual),
    interest: Math.round(interest),
  };
}

/**
 * Debt service coverage ratio. Null when there is no repayment to divide by —
 * never zero, which would read as a failed ratio rather than an absent one.
 */
export const dscrOf = (
  ebitda: number,
  existingDebt: number,
  annualRepayment: number,
): number | null =>
  annualRepayment ? (ebitda - existingDebt) / annualRepayment : null;

export interface CalculatorInputs {
  readonly amount: number;
  readonly years: number;
  readonly repaymentType: RepaymentType;
  readonly frequency: string;
  readonly ebitda: number;
  readonly existingDebt: number;
  /** Overrides every product's own rate when set. */
  readonly rateOverride: number | null;
}

export const DEFAULT_CALC_INPUTS: CalculatorInputs = {
  amount: 1_350_000,
  years: 15,
  repaymentType: "PI",
  frequency: "Monthly",
  ebitda: 438_000,
  existingDebt: 48_000,
  rateOverride: null,
};

export interface CalculatorRow {
  readonly productId: string;
  readonly lender: string;
  readonly product: string;
  readonly logo: string;
  readonly rate: number;
  readonly pricingLabel: string;
  readonly sourceType: PricingSourceType;
  readonly monthly: number;
  readonly annual: number;
  readonly interest: number;
  readonly firstYear: number;
  /** Formatted ratio, or an em dash when it cannot be calculated. */
  readonly dscr: string;
  readonly result: LenderResult;
  readonly resultNote: string;
  readonly flexibility: string;
  readonly issue: string;
  /** True when figures were computed here rather than taken from the baseline. */
  readonly simulated: boolean;
}

export interface CalculatorRun {
  readonly id: string;
  readonly calculatedAt: string;
  readonly status: "Simulated lender calculator";
  readonly productsReviewed: string;
  readonly inputs: CalculatorInputs;
  readonly rows: readonly CalculatorRow[];
  readonly assumptions: readonly string[];
  /** What a human must still confirm. Rendered with every run. */
  readonly confirmations: readonly string[];
}

/** True when inputs match the baseline the published simulations were built for. */
const isBaselineScenario = (inputs: CalculatorInputs): boolean =>
  inputs.amount === DEFAULT_CALC_INPUTS.amount &&
  inputs.years === DEFAULT_CALC_INPUTS.years &&
  inputs.repaymentType === "PI" &&
  inputs.rateOverride == null;

const currency = (n: number): string =>
  `$${Number(n || 0).toLocaleString("en-AU")}`;

/**
 * A dated calculator run. Every assumption change produces a new one, so the
 * figures a broker saw at a point in time stay reconstructable.
 *
 * `id` and `calculatedAt` are supplied rather than generated: the prototype used
 * `Date.now()`, which made runs non-reproducible and mismatched between server
 * and client render. The caller owns identity — see `nextCalculatorRunId`.
 */
export function runCalculator(
  inputs: CalculatorInputs,
  { id, clock }: { id: string; clock: Clock },
): CalculatorRun {
  const baseline = isBaselineScenario(inputs);

  const rows: CalculatorRow[] = PRODUCTS.map((product) => {
    const rate = inputs.rateOverride ?? product.pricing.rate;

    const calc = baseline
      ? {
          monthly: product.sim.monthly,
          annual: product.sim.annual,
          interest: product.sim.interest,
        }
      : amortise({
          amount: inputs.amount,
          years: inputs.years,
          rate,
          repaymentType: inputs.repaymentType,
        });

    const dscr = dscrOf(inputs.ebitda, inputs.existingDebt, calc.annual);

    return {
      productId: product.id,
      lender: product.lender,
      product: product.product,
      logo: product.logo,
      rate,
      pricingLabel: product.pricing.label,
      sourceType: product.pricing.sourceType,
      monthly: calc.monthly,
      annual: calc.annual,
      interest: calc.interest,
      firstYear: baseline
        ? product.sim.firstYear
        : Math.round(
            calc.annual +
              product.sim.upfront +
              product.sim.annualFee +
              product.sim.monthlyFee * 12,
          ),
      dscr: dscr == null ? "—" : `${dscr.toFixed(2)}x`,
      result: product.result,
      resultNote: product.resultNote,
      flexibility: product.flexibility,
      issue: product.issue,
      simulated: !baseline,
    };
  });

  return {
    id,
    calculatedAt: clock.now(),
    status: "Simulated lender calculator",
    productsReviewed: PRODUCT_REVIEW_DATE,
    inputs,
    rows,
    assumptions: [
      `Loan amount ${currency(inputs.amount)} over ${inputs.years} years, ${
        inputs.repaymentType === "IO"
          ? "interest only"
          : "principal and interest"
      }, monthly repayments`,
      "First mortgage over the commercial property plus directors’ guarantees",
      `DSCR uses (${currency(inputs.ebitda)} − ${currency(
        inputs.existingDebt,
      )}) ÷ indicative annual repayment`,
      "Proposed rental income from third-party occupancy is excluded from serviceability",
      "Fees are illustrative assumptions except where identified as a published fee",
    ],
    confirmations: [
      "Pricing requires lender confirmation",
      "Eligibility, LVR and occupancy treatment require lender confirmation",
      "No credit assessment has been performed",
    ],
  };
}

/** Sequential run identifier, so ids are reproducible and cannot collide. */
export const nextCalculatorRunId = (
  existing: readonly CalculatorRun[],
): string => `CALC-${String(existing.length + 1).padStart(3, "0")}`;

/**
 * Conflicts, fees and panel limitations. Prototype acknowledgements, not legal
 * declarations.
 */
export const PANEL_DISCLOSURES = {
  considered:
    "Four products from four lenders were considered in this prototype comparison.",
  panelLimit:
    "This comparison is limited to the lenders available on the broker’s panel in this prototype dataset. Other lenders or products may be available in the market.",
  conflicts:
    "No ownership, referral or other conflict of interest has been recorded for this application in this prototype.",
  fees: [
    { label: "Broker fee", value: "Nil for this application (prototype)" },
    { label: "Aggregator fee", value: "Nil for this application (prototype)" },
    {
      label: "Lender establishment fee",
      value: "Illustrative assumption per product; application-specific",
    },
    {
      label: "Ongoing lender fees",
      value: "Per product; published where available, otherwise illustrative",
    },
  ],
  commission:
    "Indicative commercial commission would be payable by the lender. Commission ranges differ between lenders and require confirmation against the broker’s current agreements.",
  notRemuneration:
    "Product selection in this prototype was not based only on remuneration.",
} as const;

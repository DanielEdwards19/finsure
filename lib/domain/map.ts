/**
 * Marker sets for the network map.
 *
 * The map is an iframe, so it receives plain data over `postMessage`. This
 * module builds that payload from a `DataScope`, which means a marker can only
 * ever exist for a record the current identity is allowed to see.
 *
 * GUARDRAILS (`docs/DESIGN.md` §2):
 *  - A marker colour is a traffic light indicating whether review may be
 *    required. It is never a compliance determination.
 *  - An application whose correspondence has not been analysed says so, rather
 *    than showing as though it had been reviewed and cleared.
 */

import { rollUpSeverity } from "@/lib/data/network";
import { money } from "@/lib/format";
import { reviewForApplication, severityResolverFor } from "./compliance";
import { lenderOffice } from "./lenders";
import { applicationsForBranch, brokersForBranch } from "./network";
import type { SeverityResolver } from "./network";
import type { DataScope } from "./identity";
import type { Application, MapLayer, Severity } from "./types";

/** One marker on the map. Mirrors the shape `branch-map-dark.html` expects. */
export interface Marker {
  readonly kind: "branch" | "broker" | "client" | "lender";
  /** Human-facing identifier, e.g. `BR-014`. */
  readonly id: string;
  /** Internal identifier, used to resolve the record when a marker is opened. */
  readonly key: string;
  readonly name: string;
  readonly address: string;
  readonly lat: number;
  readonly lon: number;
  readonly status: Severity;
  /** Two or three lines shown in the marker card. Newline separated. */
  readonly summary: string;
}

export type MapData = Readonly<Record<MapLayer, readonly Marker[]>>;

/** True when the application's correspondence has actually been analysed. */
const isAnalysed = (scope: DataScope, application: Application): boolean =>
  reviewForApplication(scope, application.id) != null;

const groupSeverity = (
  severityOf: SeverityResolver,
  applications: readonly Application[],
): Severity => rollUpSeverity(applications.map(severityOf));

/**
 * How a single application's status reads.
 *
 * GUARDRAIL: with no analysed correspondence the wording states that, rather
 * than reporting "evidence found" — an absence of findings in an unexamined
 * file is not a finding of compliance. This is the distinction the colour alone
 * cannot carry: an unanalysed file and a cleared one are both green.
 */
const statusWord = (
  scope: DataScope,
  severityOf: SeverityResolver,
  application: Application,
): string => {
  const severity = severityOf(application);
  if (severity === "attention") return "Requires review";
  if (severity === "watch") return "Potential gap";
  return isAnalysed(scope, application)
    ? "Evidence found"
    : "No findings — emails not analysed";
};

export function mapData(scope: DataScope): MapData {
  const severityOf = severityResolverFor(scope);

  const analysedCount = (applications: readonly Application[]): number =>
    applications.filter((a) => isAnalysed(scope, a)).length;

  const branches: Marker[] = scope.branches.map((branch) => {
    const applications = applicationsForBranch(scope, branch.id);
    const brokers = brokersForBranch(scope, branch.id);
    const analysed = analysedCount(applications);
    const attention = applications.filter(
      (a) => severityOf(a) === "attention",
    ).length;

    return {
      kind: "branch",
      id: branch.slug,
      key: branch.id,
      name: `Finsure ${branch.name}`,
      address: branch.address,
      lat: branch.position.lat,
      lon: branch.position.lon,
      status: groupSeverity(severityOf, applications),
      summary: `${brokers.length} brokers · ${applications.length} applications\n${analysed} with analysed emails · ${attention} requiring review`,
    };
  });

  const brokers: Marker[] = scope.brokers.map((broker) => {
    const applications = scope.applications.filter(
      (a) => a.brokerId === broker.id,
    );
    const analysed = analysedCount(applications);
    const attention = applications.filter(
      (a) => severityOf(a) === "attention",
    ).length;

    return {
      kind: "broker",
      id: broker.slug,
      key: broker.id,
      name: broker.name,
      address: broker.officeAddress,
      lat: broker.position.lat,
      lon: broker.position.lon,
      status: groupSeverity(severityOf, applications),
      summary: `Finsure ${broker.branchName}\n${applications.length} applications · ${analysed} with analysed emails\n${attention} requiring review`,
    };
  });

  const clients: Marker[] = scope.applications.map((application) => ({
    kind: "client",
    id: application.slug,
    key: application.id,
    name: application.customer,
    address: application.residentialAddress,
    lat: application.position.lat,
    lon: application.position.lon,
    status: severityOf(application),
    summary: `${application.type} · ${money(application.amount)}\n${application.lender} · ${application.stage}\n${statusWord(scope, severityOf, application)} · ${application.brokerName}`,
  }));

  /*
   * A lender is placed at its head office.
   *
   * A lender the dataset has no office for gets no marker at all, rather than
   * one at the average position of its applications. An averaged point is not a
   * location the business holds — it would put a pin on the map that no source
   * supports, which matters most for the "Lender TBC" placeholder, where the
   * pin would imply a lender that has not been chosen yet sits somewhere real.
   */
  const lenders: Marker[] = scope.lenderNames.flatMap((name) => {
    const office = lenderOffice(name);
    if (!office) return [];

    const applications = scope.applications.filter((a) => a.lender === name);
    const attention = applications.filter(
      (a) => severityOf(a) === "attention",
    ).length;
    const total = applications.reduce((sum, a) => sum + a.amount, 0);

    return [
      {
        kind: "lender" as const,
        id: name,
        key: name,
        name,
        address: office.address,
        lat: office.lat,
        lon: office.lon,
        status: groupSeverity(severityOf, applications),
        summary: `${applications.length} applications · ${money(total)}\n${attention} requiring review`,
      },
    ];
  });

  return { branches, brokers, clients, lenders };
}

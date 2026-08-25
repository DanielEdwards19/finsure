"use client";

import { severityOfStatus } from "@/lib/data/network";
import { severityResolverFor } from "@/lib/domain/compliance";
import {
  applicationsForBranch,
  applicationsForBroker,
  branchRollup,
  brokersForBranch,
  networkTotals,
} from "@/lib/domain/network";
import { money, shortMoney } from "@/lib/format";
import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
import type { Application, Branch, Broker, Severity } from "@/lib/domain/types";
import type { Tone } from "@/lib/design/tokens";
import { LenderMark } from "../lender-mark";
import { Card, CanvasTitle, Caveat, Field, Grid, Pill, Section } from "./ui";

const TONE_OF: Record<Severity, Tone> = {
  attention: "bad",
  watch: "warn",
  ok: "good",
};

/** How a rolled-up severity reads. Never a determination about a group. */
const SEVERITY_LABEL: Record<Severity, string> = {
  attention: "Requires review",
  watch: "Potential gap",
  ok: "Evidence found",
};

const HUMAN_REVIEW =
  "Figures are counted from the records available to you and require human review. No compliance determination is made.";

/** A compact statistic. Used across the network, branch and broker views. */
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <span className="text-xs leading-[1.3] font-medium text-secondary">
        {label}
      </span>
      <span className="text-[26px] leading-none font-medium">{value}</span>
      {sub && <span className="text-xs font-medium text-secondary">{sub}</span>}
    </Card>
  );
}

/** A row of applications, shared by the branch and broker views. */
function ApplicationList({
  applications,
  onOpen,
}: {
  applications: readonly Application[];
  onOpen: (view: CanvasView) => void;
}) {
  return (
    <Grid min={280}>
      {applications.map((application) => (
        <button
          key={application.id}
          type="button"
          onClick={() => onOpen({ kind: "application", id: application.id })}
          className="flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl bg-surface p-6 pr-[25px] text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/5"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base leading-[19px] font-medium">
              {application.customer}
            </span>
            <Pill tone={TONE_OF[severityOfStatus(application.status)]}>
              {application.status}
            </Pill>
          </span>
          <span className="flex items-center gap-2 text-secondary-sm text-secondary">
            <LenderMark name={application.lender} size={18} />
            {application.type} · {money(application.amount)} ·{" "}
            {application.lender}
          </span>
          <span className="text-secondary-sm text-secondary">
            {application.stage} · {application.brokerName}
          </span>
        </button>
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export function NetworkReportView({
  scope,
  onOpen,
}: {
  scope: DataScope;
  onOpen: (view: CanvasView) => void;
}) {
  const totals = networkTotals(scope);
  const branches = branchRollup(scope)
    .slice()
    .sort((a, b) => b.attention - a.attention);

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title="Network position">
        <Pill>{scope.identity.scopeLabel}</Pill>
      </CanvasTitle>

      <Section label="Position">
        <Grid min={170}>
          <Stat
            label="Branches"
            value={String(totals.branches)}
            sub={`${totals.branchesNeedingAttention} requiring attention`}
          />
          <Stat label="Brokers" value={String(totals.brokers)} />
          <Stat
            label="Applications"
            value={String(totals.applications)}
            sub={`${shortMoney(totals.value)} total`}
          />
          <Stat
            label="Requiring attention"
            value={String(totals.attention)}
            sub="human review required"
          />
          <Stat
            label="Evidence coverage"
            value={totals.coverage == null ? "—" : `${totals.coverage}%`}
            sub="indicative average"
          />
        </Grid>
      </Section>

      <Section label="Branches" meta={`${branches.length} in scope`}>
        <Grid min={300}>
          {branches.map((rollup) => (
            <button
              key={rollup.branch.id}
              type="button"
              onClick={() => onOpen({ kind: "branch", id: rollup.branch.id })}
              className="flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl bg-surface p-6 pr-[25px] text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/5"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base leading-[19px] font-medium">
                  Finsure {rollup.branch.name}
                </span>
                <Pill tone={TONE_OF[rollup.severity]}>
                  {SEVERITY_LABEL[rollup.severity]}
                </Pill>
              </span>
              <span className="text-secondary-sm text-secondary">
                {rollup.branch.state} · {rollup.brokers} brokers ·{" "}
                {rollup.applications} applications
              </span>
              <span className="text-secondary-sm text-secondary">
                {rollup.attention} requiring attention · {rollup.coverage}%
                coverage · {shortMoney(rollup.value)}
              </span>
            </button>
          ))}
        </Grid>
      </Section>

      <Caveat>{HUMAN_REVIEW}</Caveat>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------

export function BranchView({
  scope,
  branch,
  onOpen,
}: {
  scope: DataScope;
  branch: Branch;
  onOpen: (view: CanvasView) => void;
}) {
  const rollup = branchRollup(scope).find((b) => b.branch.id === branch.id);
  const applications = applicationsForBranch(scope, branch.id);
  const brokers = brokersForBranch(scope, branch.id);
  // Same rule as the roll-up above and the marker on the map.
  const severityOf = severityResolverFor(scope);
  const attention = applications.filter((a) => severityOf(a) === "attention");

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title={`Finsure ${branch.name}`}>
        {rollup && (
          <Pill tone={TONE_OF[rollup.severity]}>
            {SEVERITY_LABEL[rollup.severity]}
          </Pill>
        )}
      </CanvasTitle>

      <Section label="Position">
        <Grid min={170}>
          <Stat label="Brokers" value={String(brokers.length)} />
          <Stat
            label="Applications"
            value={String(applications.length)}
            sub={`${shortMoney(rollup?.value ?? 0)} total`}
          />
          <Stat
            label="Requiring attention"
            value={String(attention.length)}
            sub="human review required"
          />
          <Stat
            label="Evidence coverage"
            value={`${rollup?.coverage ?? 0}%`}
            sub="indicative"
          />
        </Grid>
      </Section>

      <Section label="Branch details">
        <Grid>
          <Field label="State">{branch.state}</Field>
          <Field label="Address">{branch.address}</Field>
          <Field label="Coverage">{branch.coverage}</Field>
          <Field label="Branch ID">{branch.slug.toUpperCase()}</Field>
        </Grid>
      </Section>

      <Section label="Brokers" meta={`${brokers.length} at this branch`}>
        <Grid min={260}>
          {brokers.map((broker) => (
            <button
              key={broker.id}
              type="button"
              onClick={() => onOpen({ kind: "broker", id: broker.id })}
              className="flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-2xl bg-surface p-6 pr-[25px] text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-white/5"
            >
              <span className="text-base leading-[19px] font-medium">
                {broker.name}
              </span>
              <span className="text-secondary-sm [overflow-wrap:anywhere] text-secondary">
                {broker.email}
              </span>
              <span className="text-secondary-sm text-secondary">
                {applicationsForBroker(scope, broker.id).length} applications
              </span>
            </button>
          ))}
        </Grid>
      </Section>

      <Section
        label="Applications"
        meta={`${applications.length} on file`}
        defaultOpen={false}
      >
        <ApplicationList applications={applications} onOpen={onOpen} />
      </Section>

      <Caveat>{HUMAN_REVIEW}</Caveat>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Broker
// ---------------------------------------------------------------------------

export function BrokerView({
  scope,
  broker,
  onOpen,
}: {
  scope: DataScope;
  broker: Broker;
  onOpen: (view: CanvasView) => void;
}) {
  const applications = applicationsForBroker(scope, broker.id);
  const severityOf = severityResolverFor(scope);
  const attention = applications.filter((a) => severityOf(a) === "attention");
  const value = applications.reduce((total, a) => total + a.amount, 0);

  return (
    <div className="flex w-full animate-rise flex-col gap-6">
      <CanvasTitle title={broker.name}>
        <Pill>Finsure {broker.branchName}</Pill>
      </CanvasTitle>

      <Section label="Portfolio">
        <Grid min={170}>
          <Stat label="Applications" value={String(applications.length)} />
          <Stat label="Total value" value={shortMoney(value)} />
          <Stat
            label="Requiring attention"
            value={String(attention.length)}
            sub="human review required"
          />
        </Grid>
      </Section>

      <Section label="Contact">
        <Grid>
          <Field label="Email">{broker.email}</Field>
          <Field label="Phone">{broker.phone}</Field>
          <Field label="Office">{broker.officeAddress}</Field>
          <Field label="Branch">
            <button
              type="button"
              onClick={() => onOpen({ kind: "branch", id: broker.branchId })}
              className="cursor-pointer border-0 bg-transparent p-0 text-left text-base font-medium text-link underline-offset-2 hover:underline"
            >
              Finsure {broker.branchName}
            </button>
          </Field>
        </Grid>
      </Section>

      <Section label="Applications" meta={`${applications.length} on file`}>
        <ApplicationList applications={applications} onOpen={onOpen} />
      </Section>

      <Caveat>{HUMAN_REVIEW}</Caveat>
    </div>
  );
}

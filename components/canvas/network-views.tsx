"use client";

import { useState } from "react";

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

const NETWORK_NAME = "Finsure";

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

/** Short status words on the network table. Never "compliant". */
const TABLE_STATUS: Record<Severity, string> = {
  attention: "Attention",
  watch: "Watch",
  ok: "Evidence found",
};

const BRANCH_COLUMNS =
  "grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.55fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.8fr)]";

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

/** Snapshot KPI: large figure first, label beneath. */
function SnapshotStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface px-[18px] py-[18px] shadow-[inset_0_0_0_1px_var(--color-hairline)]">
      <div className="text-[28px] leading-none font-medium">{value}</div>
      <div className="mt-1 text-xs text-secondary">{label}</div>
    </div>
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
  lender,
  onOpen,
}: {
  scope: DataScope;
  lender?: string;
  onOpen: (view: CanvasView) => void;
}) {
  const options = lender ? { lender } : {};
  const totals = networkTotals(scope, options);
  const branches = branchRollup(scope, options)
    .filter((rollup) => (lender ? rollup.applications > 0 : true))
    .sort((a, b) => b.attention - a.attention);
  const [exported, setExported] = useState(false);
  const title = lender ?? NETWORK_NAME;
  const exportName = lender
    ? `${lender.replace(/\s+/g, "_")}_Network_Snapshot.pdf`
    : "Finsure_Network_Compliance_Snapshot.pdf";

  return (
    <div className="flex w-full animate-rise flex-col">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] leading-none font-semibold tracking-[0.1em] text-secondary uppercase">
            Network compliance snapshot
          </div>
          <h1 className="mt-1.5 mb-0 flex items-center gap-3 text-[26px] leading-none font-medium">
            {lender && <LenderMark name={lender} size={32} />}
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setExported(true)}
          className="cursor-pointer rounded-[10px] border-0 bg-white px-[18px] py-[11px] text-[13px] font-semibold text-inset"
        >
          ↓ Download PDF
        </button>
      </div>

      {exported && (
        <div className="mb-[18px] rounded-xl border border-[rgb(55_209_58_/_0.3)] bg-[rgb(55_209_58_/_0.12)] px-4 py-3 text-[12.5px] font-medium text-[rgb(74,211,77)]">
          Exported — {exportName} (simulated)
        </div>
      )}

      <div
        className="mb-[22px] grid items-start gap-3.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
        }}
      >
        <SnapshotStat
          value={totals.coverage == null ? "—" : `${totals.coverage}%`}
          label="Evidence coverage"
        />
        <SnapshotStat
          value={String(totals.attention)}
          label="Requiring attention"
        />
        <SnapshotStat value={String(totals.watch)} label="Under watch" />
        <SnapshotStat
          value={String(totals.branchesNeedingAttention)}
          label="Branches need attention"
        />
      </div>

      <div className="mb-5 overflow-x-auto rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--color-hairline)]">
        <div
          className={`grid min-w-[560px] ${BRANCH_COLUMNS} items-center gap-x-2.5 text-[12.5px]`}
        >
          {(
            [
              "Branch",
              "Broker",
              "Status",
              "Files",
              "Review",
              "Alerts",
              "Coverage",
            ] as const
          ).map((heading, index) => (
            <span
              key={heading}
              className={`border-b border-hairline py-3 text-[11px] font-semibold tracking-[0.03em] text-secondary uppercase ${
                index === 0 ? "pl-[18px]" : index === 6 ? "pr-[18px]" : ""
              }`}
            >
              {heading}
            </span>
          ))}

          {branches.map((rollup) => (
            <button
              key={rollup.branch.id}
              type="button"
              onClick={() => onOpen({ kind: "branch", id: rollup.branch.id })}
              className={`col-span-full grid ${BRANCH_COLUMNS} cursor-pointer items-center gap-x-2.5 border-0 border-b border-hairline/60 bg-transparent py-3 text-left text-[12.5px] last:border-b-0 hover:bg-white/5`}
            >
              <span className="truncate pl-[18px] font-medium">
                {rollup.branch.name}, {rollup.branch.state}
              </span>
              <span className="truncate text-[#d4d6da]">
                {rollup.brokers} {rollup.brokers === 1 ? "broker" : "brokers"}
              </span>
              <span className="min-w-0">
                <Pill tone={TONE_OF[rollup.severity]}>
                  {TABLE_STATUS[rollup.severity]}
                </Pill>
              </span>
              <span className="text-[#d4d6da]">{rollup.applications}</span>
              <span className="text-[#d4d6da]">{rollup.attention}</span>
              <span className="text-[#d4d6da]">{rollup.watch}</span>
              <span className="pr-[18px] text-[#d4d6da]">
                {rollup.coverage}%
              </span>
            </button>
          ))}
        </div>
      </div>

      <Caveat>
        Compiled from Infynity, Microsoft 365, Outlook and SharePoint
        {lender ? ` for ${lender}` : ""} across {totals.brokers} brokers.
        Figures reflect evidence located across systems. No compliance
        determination is made. Human review required.
      </Caveat>
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

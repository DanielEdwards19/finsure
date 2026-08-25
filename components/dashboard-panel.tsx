"use client";

import Image from "next/image";
import { useMemo } from "react";

import { networkCompliance } from "@/lib/domain/compliance";
import { IDENTITIES } from "@/lib/domain/identity";
import { networkTotals } from "@/lib/domain/network";
import type { DataScope } from "@/lib/domain/identity";
import type { UserId } from "@/lib/domain/types";
import { shortMoney } from "@/lib/format";

/**
 * The dashboard: the panel's resting state. Three entry points, then the live
 * position of whatever the current identity can see.
 *
 * Every figure is counted from the scoped dataset, so a broker's dashboard
 * reports their own portfolio rather than a filtered view of the network.
 */
export function DashboardPanel({
  scope,
  onSwitchIdentity,
  onAsk,
  onStartCommercial,
}: {
  scope: DataScope;
  onSwitchIdentity: (id: UserId) => void;
  onAsk: (question: string) => void;
  onStartCommercial: () => void;
}) {
  const totals = useMemo(() => networkTotals(scope), [scope]);
  const compliance = useMemo(() => networkCompliance(scope), [scope]);

  // Labels adapt to the access level: a broker has no branch network to count.
  const scopeSub = scope.isBroker
    ? "Your portfolio"
    : scope.isBranchOwner
      ? "Your branch"
      : `${totals.branches} branches`;

  const where = scope.isBroker
    ? "in your portfolio"
    : scope.isBranchOwner
      ? `at Finsure ${scope.branches[0]?.name ?? "your branch"}`
      : `across ${totals.branches} branches`;

  const coverage =
    totals.coverage == null ? "" : ` · ${totals.coverage}% coverage`;

  const kpis = [
    {
      label: scope.isBroker ? "My profile" : "Active Brokers",
      value: String(totals.brokers),
      sub: scopeSub,
      question: "Give me a breakdown of brokers by branch",
    },
    {
      label: "Applications",
      value: String(totals.applications),
      sub: `${shortMoney(totals.value)} total`,
      question: "Summarise applications across the network",
    },
    {
      label: "Attention needed",
      value: String(totals.attention),
      sub: scope.isOrganisation
        ? `${totals.branchesNeedingAttention} branches`
        : "requiring review",
      question: scope.isOrganisation
        ? "Which branches need attention right now?"
        : "Which applications need attention right now?",
    },
    {
      label: "Compliance review",
      value: String(compliance.requiresReview),
      sub: "items requiring review",
      question: "Summarise the compliance review across the network",
    },
    {
      label: "Evidence coverage",
      value: totals.coverage == null ? "—" : `${totals.coverage}%`,
      sub: scope.isOrganisation ? "Network average" : "Branch average",
      question: "Which branches have the lowest evidence coverage?",
    },
  ];

  return (
    <div className="flex flex-col items-center px-6 pt-6">
      <Image
        src="/assets/finsure-logo.png"
        alt="Finsure Loans"
        width={200}
        height={100}
        priority
        className="mb-9 block h-auto w-full max-w-[200px]"
      />

      <div className="w-full pb-2">
        <h1 className="m-0 mb-[30px] text-[32px] leading-[1.05] font-medium">
          <span className="text-secondary">Hello there.</span>
          <br />
          How can I help?
        </h1>

        <EntryCard
          title="Ask a question"
          sub="AI Agent can help"
          subClass="text-base"
          onClick={() => onAsk("What should I look at first?")}
        />
        <EntryCard
          title="Start commercial loan application"
          sub="Guided setup with document analysis. Nothing here is a credit decision."
          onClick={onStartCommercial}
        />
        <EntryCard
          title="Latest updates"
          sub={`${totals.applications} applications ${where} · ${totals.attention} requiring attention${coverage}.`}
          onClick={() =>
            onAsk("What are the latest updates across the group this week?")
          }
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-3">
          {kpis.map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={() => onAsk(kpi.question)}
              className="cursor-pointer rounded-2xl border border-hairline bg-surface p-6 pr-[25px] text-left text-primary hover:border-white/25"
            >
              <div className="mb-2 min-h-8 text-xs leading-[1.3] font-medium text-secondary">
                {kpi.label}
              </div>
              <div className="text-[26px] leading-none font-medium">
                {kpi.value}
              </div>
              <div className="mt-1.5 text-xs font-medium text-secondary">
                {kpi.sub}
              </div>
            </button>
          ))}
        </div>

        <IdentitySwitcher scope={scope} onSwitchIdentity={onSwitchIdentity} />
      </div>
    </div>
  );
}

function EntryCard({
  title,
  sub,
  subClass = "text-sm",
  onClick,
}: {
  title: string;
  sub: string;
  subClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-6 pr-[25px] text-left text-primary hover:border-white/25"
    >
      <span>
        <span className="block text-base font-medium">{title}</span>
        <span className={`mt-2 block leading-[1.4] text-secondary ${subClass}`}>
          {sub}
        </span>
      </span>
      <span aria-hidden className="flex-none text-lg">
        ›
      </span>
    </button>
  );
}

/**
 * Identity switcher. Present because access level changes what the whole
 * workspace shows, and the difference is the point of the prototype — a broker
 * does not see a narrowed network, they see no network at all.
 */
function IdentitySwitcher({
  scope,
  onSwitchIdentity,
}: {
  scope: DataScope;
  onSwitchIdentity: (id: UserId) => void;
}) {
  return (
    <div className="mt-8 mb-6">
      <div className="mb-2.5 text-label font-semibold tracking-[0.06em] text-secondary uppercase">
        Signed in as
      </div>

      <div className="flex flex-col gap-1.5">
        {IDENTITIES.map((identity) => {
          const active = identity.id === scope.identity.id;
          return (
            <button
              key={identity.id}
              type="button"
              onClick={() => onSwitchIdentity(identity.id)}
              aria-pressed={active}
              className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 text-left ${
                active
                  ? "border-white/25 bg-white/8"
                  : "border-hairline bg-transparent hover:bg-white/5"
              }`}
            >
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-white/10 text-meta font-semibold">
                {identity.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium">
                  {identity.name}
                </span>
                <span className="block truncate text-meta text-secondary">
                  {identity.shortRole} · {identity.scopeLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { reviewForApplication } from "@/lib/domain/compliance";
import { severityOfStatus } from "@/lib/data/network";
import { money } from "@/lib/format";
import type { DataScope } from "@/lib/domain/identity";
import type { Conversation } from "@/lib/use-conversations";
import { BackGlyph, Glyph } from "./glyph";
import { Pill } from "./canvas/ui";

/** The secondary surfaces reachable from the tab bar and the hamburger menu. */
export type NavPanel =
  | "history"
  | "help"
  | "news"
  | "account"
  | "brokers"
  | "clients"
  | "alerts"
  | "reports"
  | "integrations";

const LIST_PANELS = new Set<NavPanel>([
  "brokers",
  "clients",
  "alerts",
  "reports",
  "integrations",
]);

export const isListPanel = (panel: NavPanel): boolean => LIST_PANELS.has(panel);

// ---------------------------------------------------------------------------
// Shared shells
// ---------------------------------------------------------------------------

function PanelHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex-none px-[22px] pt-6 pb-3">
      <h1 className="m-0 text-[22px] font-medium">{title}</h1>
      <p className="mt-1.5 mb-0 text-[13px] text-secondary">{sub}</p>
    </div>
  );
}

function NavCard({
  title,
  sub,
  eyebrow,
  onClick,
}: {
  title: string;
  sub: string;
  eyebrow?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      {eyebrow && (
        <span className="mb-[5px] block text-[11px] text-secondary">
          {eyebrow}
        </span>
      )}
      <span className="block text-[13.5px] leading-[1.4] font-semibold">
        {title}
      </span>
      <span className="mt-1.5 block text-[12.5px] leading-[1.5] text-secondary">
        {sub}
      </span>
    </>
  );

  const shell =
    "rounded-2xl border border-hairline bg-surface p-6 pr-[25px] text-left";

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${shell} cursor-pointer text-primary hover:border-white/25`}
    >
      {content}
    </button>
  ) : (
    <div className={shell}>{content}</div>
  );
}

// ---------------------------------------------------------------------------
// History, help, news, account
// ---------------------------------------------------------------------------

export function HistoryPanel({
  conversations,
  onOpen,
}: {
  conversations: readonly Conversation[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="History" sub="Your saved conversations." />
      <div className="scrollbar-thin flex flex-1 flex-col gap-2.5 overflow-auto px-5 pb-3">
        {conversations.length === 0 ? (
          <p className="m-0 px-0.5 py-2 text-[13px] leading-[1.6] text-secondary">
            No conversations yet. Ask a question or tap a card on the home screen
            to start one — it will be saved here.
          </p>
        ) : (
          conversations.map((conversation) => (
            <NavCard
              key={conversation.id}
              title={conversation.title}
              sub={`${conversation.messages.length} message${
                conversation.messages.length === 1 ? "" : "s"
              }`}
              onClick={() => onOpen(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * GUARDRAIL: the third card states plainly that nothing on screen is a
 * compliance determination. It is the one piece of help copy that must not be
 * softened.
 */
const HELP = [
  {
    title: "Ask in plain language",
    sub: "Ask about a client, a branch or the whole network. Every answer cites where each figure came from.",
  },
  {
    title: "Everything is a conversation",
    sub: "Tapping a card, an alert or a branch starts a saved conversation you can return to in History.",
  },
  {
    title: "Nothing here is a determination",
    sub: "A status reflects the evidence located on the file. Assessment is always a human decision, and no answer states that a file is compliant.",
  },
] as const;

export function HelpPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Help"
        sub="Getting the most from Mortgage Intelligence."
      />
      <div className="scrollbar-thin flex flex-1 flex-col gap-2.5 overflow-auto px-5 pb-3">
        {HELP.map((item) => (
          <NavCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}

const NEWS = [
  {
    eyebrow: "Today",
    title: "100 loans approved this week",
    sub: "20 items requiring review were identified across the group.",
  },
  {
    eyebrow: "This week",
    title: "Outlook and SharePoint evidence linking",
    sub: "Emails and files now reconcile against payslips and statements automatically.",
  },
] as const;

export function NewsPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="News" sub="Network updates and releases." />
      <div className="scrollbar-thin flex flex-1 flex-col gap-2.5 overflow-auto px-5 pb-3">
        {NEWS.map((item) => (
          <NavCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}

export function AccountPanel({
  scope,
  onSignOut,
}: {
  scope: DataScope;
  onSignOut: () => void;
}) {
  const { identity } = scope;

  const items = [
    { label: "Plan", value: "Network · Enterprise" },
    { label: "Billing", value: "Manage" },
    { label: "Team and seats", value: `${scope.brokers.length} brokers` },
    { label: "Notifications", value: "On" },
    { label: "Access level", value: identity.role },
    { label: "Data scope", value: identity.scopeLabel },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Account"
        sub="Profile, billing and workspace settings."
      />
      <div className="scrollbar-thin flex flex-1 flex-col overflow-auto px-[22px] pb-3">
        <div className="mb-[18px] flex items-center gap-3">
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-surface text-sm font-semibold">
            {identity.initials}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{identity.name}</span>
            <span className="block text-xs text-secondary">
              {identity.role}
            </span>
            <span className="block text-xs text-secondary">
              {identity.location}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <span
              key={item.label}
              className="flex items-center justify-between gap-3 border-b border-hairline/60 px-1 py-3.5 text-[13.5px]"
            >
              <span>{item.label}</span>
              <span className="text-xs text-secondary">{item.value}</span>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-5 w-full cursor-pointer rounded-card border border-hairline bg-transparent p-3 text-[13px] font-semibold text-bad-text"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Searchable lists
// ---------------------------------------------------------------------------

interface ListItem {
  readonly id: string;
  readonly title: string;
  readonly sub: string;
  readonly badge: string | null;
  readonly tone: "good" | "warn" | "bad" | "muted";
  /** Every field the search matches against. */
  readonly search: string;
  readonly question: string;
}

const TITLES: Readonly<Record<string, string>> = {
  brokers: "Brokers",
  clients: "Clients",
  alerts: "Alerts",
  reports: "Reports",
  integrations: "Integrations",
};

const PLACEHOLDERS: Readonly<Record<string, string>> = {
  brokers: "Search brokers or branches",
  clients: "Search clients, brokers, lenders or stages",
  alerts: "Search alerts",
  reports: "Search reports",
  integrations: "Search integrations",
};

const REPORTS: readonly ListItem[] = [
  {
    id: "network-snapshot",
    title: "Network evidence snapshot",
    sub: "Every branch and connected system",
    badge: null,
    tone: "muted",
    search: "network evidence snapshot compliance branches",
    question:
      "Generate a network compliance report across every branch and system.",
  },
  {
    id: "thompson-evidence",
    title: "Thompson — evidence summary",
    sub: "Reference MI-2026-0742",
    badge: null,
    tone: "muted",
    search: "thompson evidence summary",
    question: "Compliance findings for Sarah & Michael Thompson",
  },
];

const INTEGRATIONS: readonly ListItem[] = [
  {
    id: "infynity",
    title: "Infynity",
    sub: "CRM and loan data · Connected",
    badge: "Connected",
    tone: "good",
    search: "infynity crm loan data",
    question: "What does the Infynity integration bring in?",
  },
  {
    id: "microsoft-365",
    title: "Microsoft 365",
    sub: "SharePoint and files · Connected",
    badge: "Connected",
    tone: "good",
    search: "microsoft 365 sharepoint files",
    question: "What does the Microsoft 365 integration bring in?",
  },
  {
    id: "outlook",
    title: "Outlook",
    sub: "Email · Connected",
    badge: "Connected",
    tone: "good",
    search: "outlook email",
    question: "What does the Outlook integration bring in?",
  },
];

const severityTone = (severity: string) =>
  severity === "attention" ? "bad" : severity === "watch" ? "warn" : "good";

/**
 * Every list is built from the scope rather than the full dataset, so a broker
 * opening "Clients" sees their own book and not the network's.
 */
function itemsFor(panel: NavPanel, scope: DataScope): readonly ListItem[] {
  if (panel === "reports") return REPORTS;
  if (panel === "integrations") return INTEGRATIONS;

  if (panel === "brokers") {
    return scope.brokers.map((broker) => {
      const applications = scope.applications.filter(
        (a) => a.brokerId === broker.id,
      );
      const attention = applications.filter(
        (a) => severityOfStatus(a.status) === "attention",
      ).length;
      const watch = applications.filter(
        (a) => severityOfStatus(a.status) === "watch",
      ).length;

      return {
        id: broker.id,
        title: broker.name,
        sub: `${broker.branchName} · ${applications.length} application${
          applications.length === 1 ? "" : "s"
        }`,
        badge: attention
          ? `${attention} attention`
          : watch
            ? `${watch} watch`
            : "clear",
        tone: attention ? "bad" : watch ? "warn" : "good",
        search: `${broker.name} ${broker.branchName}`,
        question: broker.name,
      } satisfies ListItem;
    });
  }

  const applications =
    panel === "alerts"
      ? scope.applications.filter((a) => severityOfStatus(a.status) === "attention")
      : scope.applications;

  return applications.map((application) => {
    const review = reviewForApplication(scope, application.id);
    const outstanding = review?.findings.length ?? 0;

    return {
      id: application.id,
      title: application.customer,
      sub:
        panel === "alerts"
          ? `${application.status} · ${application.brokerName} · Finsure ${application.branchName}`
          : `${application.type} · ${money(application.amount)} · ${application.lender} · ${application.stage} · ${application.brokerName}`,
      badge: outstanding
        ? `${outstanding} to review`
        : application.status,
      tone: outstanding ? "bad" : severityTone(severityOfStatus(application.status)),
      search: [
        application.customer,
        application.brokerName,
        application.branchName,
        application.lender,
        application.type,
        application.stage,
        application.status,
      ].join(" "),
      question: `${application.customer} ${application.brokerName}`,
    } satisfies ListItem;
  });
}

export function ListPanel({
  panel,
  scope,
  onBack,
  onAsk,
}: {
  panel: NavPanel;
  scope: DataScope;
  onBack: () => void;
  onAsk: (question: string, title: string) => void;
}) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => itemsFor(panel, scope), [panel, scope]);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? items.filter((item) => item.search.toLowerCase().includes(needle))
    : items;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center gap-4 px-6 pt-6 pb-3">
        <button
          type="button"
          onClick={onBack}
          title="Back"
          className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-white/5 p-0"
        >
          <BackGlyph />
        </button>
        <h1 className="m-0 text-base font-medium">{TITLES[panel]}</h1>
        <span className="ml-auto text-xs leading-none text-secondary">
          {matches.length} of {items.length}
        </span>
      </div>

      <div className="flex flex-none items-center gap-2 px-6 pb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={PLACEHOLDERS[panel]}
          className="min-w-0 flex-1 rounded-card border-0 bg-white/6 px-3.5 py-3 text-sm leading-none shadow-[inset_0_0_0_1px_var(--color-hairline)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex-none cursor-pointer rounded-card border-0 bg-white/6 px-3 py-3 text-xs font-medium text-secondary"
          >
            Clear
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex flex-1 flex-col gap-2 overflow-auto px-5 pt-1 pb-3">
        {matches.length === 0 ? (
          <p className="m-0 rounded-[14px] border border-hairline bg-inset p-4 text-[13px] leading-[1.5] text-secondary">
            No matches. Try a different name, branch or lender — or ask below.
          </p>
        ) : (
          matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAsk(item.question, item.title)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-6 pr-[25px] text-left text-primary hover:border-white/25"
            >
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-secondary">
                  {item.sub}
                </span>
              </span>
              {item.badge && <Pill tone={item.tone}>{item.badge}</Pill>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation controls
// ---------------------------------------------------------------------------

const TABS = [
  { key: "home", label: "Home", icon: "/assets/ic-home.svg" },
  { key: "history", label: "History", icon: "/assets/ic-history.svg" },
  { key: "help", label: "Help", icon: "/assets/ic-help.svg" },
  { key: "news", label: "News", icon: "/assets/ic-news.svg" },
  { key: "account", label: "Account", icon: "/assets/ic-account.svg" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function BottomTabs({
  active,
  onSelect,
}: {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
}) {
  return (
    <nav className="flex flex-none items-stretch border-t border-white/6 px-2 pt-2 pb-3">
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            aria-current={on ? "page" : undefined}
            className="flex flex-1 cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0"
          >
            <Glyph
              src={tab.icon}
              className={`size-6 ${on ? "bg-primary" : "bg-secondary"}`}
            />
            <span
              className={`text-[10.5px] ${on ? "text-primary" : "text-secondary"}`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export interface MenuItem {
  readonly label: string;
  readonly run: () => void;
}

export function HamburgerMenu({
  open,
  items,
  onToggle,
}: {
  open: boolean;
  items: readonly MenuItem[];
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Menu"
        className="flex size-9 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full border-0 bg-white/5 p-0 hover:bg-white/10"
      >
        <span aria-hidden className="block h-px w-4 bg-primary" />
        <span aria-hidden className="block h-px w-4 bg-primary" />
        <span aria-hidden className="block h-px w-4 bg-primary" />
      </button>

      {open && (
        <div className="absolute top-11 right-0 z-30 flex w-60 flex-col overflow-hidden rounded-2xl border border-hairline bg-surface py-1.5 shadow-[0_20px_60px_rgb(0_0_0_/_0.5)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.run}
              className="cursor-pointer border-0 bg-transparent px-4 py-2.5 text-left text-[13px] text-primary hover:bg-white/8"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_IDENTITY_ID, scopeFor } from "@/lib/domain/identity";
import { mapData } from "@/lib/domain/map";
import type { MapLayer, UserId } from "@/lib/domain/types";
import { usePanelSize } from "@/lib/use-panel-size";
import { useCommercial } from "@/lib/use-commercial";
import { useConversations } from "@/lib/use-conversations";
import { Canvas, canvasTitle } from "./canvas";
import { ChatPanel } from "./chat-panel";
import { CommercialCanvas } from "./commercial/canvas";
import { CommercialPanel } from "./commercial/panel";
import { Composer } from "./composer";
import { DashboardPanel } from "./dashboard-panel";
import { BackGlyph } from "./glyph";
import { MapLayers, NetworkMap } from "./network-map";
import {
  AccountPanel,
  BottomTabs,
  HamburgerMenu,
  HelpPanel,
  HistoryPanel,
  ListPanel,
  NewsPanel,
  isListPanel,
  type MenuItem,
  type NavPanel,
  type TabKey,
} from "./nav-panels";
import { SignIn } from "./sign-in";

/**
 * Which surface the panel is showing.
 *
 * `dashboard` and `chat` share the map and the record canvas. `commercial` owns
 * both halves for the duration of the guided setup, and a `NavPanel` is one of
 * the secondary surfaces reached from the tab bar or the menu.
 */
type Mode = "dashboard" | "chat" | "commercial" | NavPanel;

/** Which tab reads as current for a given mode. */
const TAB_FOR: Readonly<Record<string, TabKey>> = {
  history: "history",
  help: "help",
  news: "news",
  account: "account",
};

/**
 * The workspace shell: a full-bleed canvas with a floating panel over its right
 * edge, collapsing to a single column with a bottom tab bar on mobile.
 *
 * View state is held here rather than in the URL. The canvas and the panel are
 * two halves of one surface — opening a branch from the map changes both at once
 * — and the map is a stateful iframe that must not remount. Routing each view
 * would mean lifting all of that into a store and syncing it back, for a
 * prototype whose views are not separately addressable anyway.
 */
export function Workspace() {
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<UserId>(DEFAULT_IDENTITY_ID);
  const [mode, setMode] = useState<Mode>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * On mobile the canvas is a sheet over the panel rather than a column beside
   * it, so it is only mounted when something has been opened into it.
   */
  const [sheetOpen, setSheetOpen] = useState(false);

  const scope = useMemo(() => scopeFor(userId), [userId]);
  const markers = useMemo(() => mapData(scope), [scope]);
  const chat = useConversations(scope);
  const commercial = useCommercial();

  const inChat = mode === "chat";
  const inCommercial = mode === "commercial";
  const navPanel: NavPanel | null =
    mode === "dashboard" || inChat || inCommercial ? null : mode;

  /*
   * Exactly one layer is shown at a time. It falls back when the identity
   * changes, because the layer that was active may no longer be one this
   * identity can see — a broker has no branch layer.
   */
  const [layer, setLayer] = useState<MapLayer>("branches");
  const activeLayer = scope.canSeeLayer(layer) ? layer : scope.layers[0];

  const { width, viewport, isMobile, canExpand, expanded, toggleExpanded } =
    usePanelSize();

  const onMap = !inCommercial && chat.view.kind === "map";

  /*
   * Each canvas view is a new record, so it starts at the top. Without this the
   * reader lands mid-page at whatever offset the previous view was scrolled to.
   */
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    canvas.current?.scrollTo({ top: 0 });
  }, [chat.view, mode]);

  /*
   * When the canvas is too narrow for content to sit beside the logo, start the
   * content below it rather than letting the two collide.
   */
  const narrowCanvas = !isMobile && viewport - width < 700;

  if (!signedIn) {
    return <SignIn onSignIn={() => setSignedIn(true)} />;
  }

  const go = (next: Mode) => {
    setMode(next);
    setMenuOpen(false);
  };

  const ask = (question: string, title?: string) => {
    go("chat");
    chat.askQuestion(question, title);
    if (isMobile) setSheetOpen(true);
  };

  const menuItems: readonly MenuItem[] = [
    {
      label: "Start commercial loan application",
      run: () => go("commercial"),
    },
    ...(scope.isBroker ? [] : [{ label: "Brokers", run: () => go("brokers") }]),
    { label: "Clients", run: () => go("clients") },
    { label: "Alerts", run: () => go("alerts") },
    {
      label: "Compliance review",
      run: () =>
        ask(
          "Summarise the compliance review across the network",
          "Compliance review",
        ),
    },
    { label: "Reports", run: () => go("reports") },
    { label: "Integrations", run: () => go("integrations") },
  ];

  // The canvas only exists on mobile once something has been opened into it.
  const showCanvas = !onMap && (!isMobile || sheetOpen);

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      style={{ background: "var(--gradient-page)" }}
    >
      {/*
        The map stays mounted underneath every canvas view so switching views
        never tears down Leaflet and refetches tiles.
      */}
      <div className="absolute inset-0 z-0">
        <NetworkMap
          data={markers}
          layers={[activeLayer]}
          panelWidth={isMobile ? 0 : width + 16}
          onOpenMarker={(marker) => ask(marker.name)}
        />

        {onMap && !isMobile && (
          <MapLayers
            available={scope.layers}
            active={activeLayer}
            onSelect={setLayer}
            className="absolute z-6 transition-[right] duration-200"
            style={{ top: inChat ? 109 : 40, right: width + 60 }}
          />
        )}
      </div>

      {/* Canvas content, over the map. */}
      {showCanvas && (
        <div
          ref={canvas}
          className="absolute inset-0 z-1 scrollbar-thin overflow-auto transition-[padding] duration-200"
          style={{
            background: "var(--gradient-page)",
            paddingTop: isMobile ? 60 : narrowCanvas ? 108 : 44,
            paddingRight: isMobile ? 16 : width + 48,
            paddingBottom: 60,
            paddingLeft: isMobile ? 16 : 48,
          }}
        >
          {inCommercial ? (
            <CommercialCanvas commercial={commercial} onAsk={ask} />
          ) : (
            <Canvas view={chat.view} scope={scope} onOpen={chat.setView} />
          )}
        </div>
      )}

      {/* On mobile the sheet needs a way back to the panel it covers. */}
      {isMobile && showCanvas && (
        <button
          type="button"
          onClick={() => setSheetOpen(false)}
          className="absolute top-3 left-4 z-10 flex cursor-pointer items-center gap-2 rounded-pill border border-hairline bg-inset/90 px-3.5 py-2 text-[13px] font-medium backdrop-blur"
        >
          <BackGlyph />
          {inCommercial ? "Application" : canvasTitle(chat.view)}
        </button>
      )}

      {/* Panel: floating over the canvas on desktop, the whole screen on mobile. */}
      <aside
        className={
          isMobile
            ? `absolute inset-0 z-20 flex flex-col overflow-hidden ${
                showCanvas ? "hidden" : ""
              }`
            : "absolute top-4 right-4 bottom-4 z-20 flex flex-col overflow-hidden rounded-[20px] transition-[width] duration-200"
        }
        style={{
          width: isMobile ? undefined : width,
          background: "var(--gradient-sign-in)",
          boxShadow: isMobile ? undefined : "0 20px 60px rgb(0 0 0 / 0.5)",
        }}
      >
        {/* The menu is hidden in chat and in the commercial flow, both of
            which have a back control in the same position. */}
        {!inChat && !inCommercial && (
          <div className="flex flex-none justify-end px-4 pt-4">
            <HamburgerMenu
              open={menuOpen}
              items={menuItems}
              onToggle={() => setMenuOpen(!menuOpen)}
            />
          </div>
        )}

        {inCommercial ? (
          <CommercialPanel
            commercial={commercial}
            onExit={() => go("dashboard")}
          />
        ) : inChat ? (
          <ChatPanel
            chat={chat}
            scope={scope}
            onBack={() => {
              go("dashboard");
              chat.setView({ kind: "map" });
            }}
          />
        ) : navPanel && isListPanel(navPanel) ? (
          <ListPanel
            panel={navPanel}
            scope={scope}
            onBack={() => go("dashboard")}
            onAsk={ask}
          />
        ) : navPanel === "history" ? (
          <HistoryPanel
            conversations={chat.conversations}
            onOpen={(id) => {
              chat.open(id);
              go("chat");
            }}
          />
        ) : navPanel === "help" ? (
          <HelpPanel />
        ) : navPanel === "news" ? (
          <NewsPanel />
        ) : navPanel === "account" ? (
          <AccountPanel
            scope={scope}
            onSignOut={() => {
              setSignedIn(false);
              go("dashboard");
              chat.reset();
            }}
          />
        ) : (
          <div className="flex min-h-0 scrollbar-thin flex-1 flex-col overflow-auto">
            <DashboardPanel
              scope={scope}
              onSwitchIdentity={(id) => {
                setUserId(id);
                chat.reset();
              }}
              onAsk={ask}
              onStartCommercial={() => go("commercial")}
            />
          </div>
        )}

        {canExpand && !isMobile && (
          <div className="flex flex-none justify-start px-4 pb-2">
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex cursor-pointer items-center gap-2 rounded-pill border border-hairline bg-white/5 px-3.5 py-2 text-[13px] font-medium hover:bg-white/10"
            >
              <span aria-hidden>◂▸</span>
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>
        )}

        {/* The commercial flow has its own controls; a free-text ask would sit
            outside the guided sequence it depends on. */}
        {!inCommercial && <Composer onAsk={ask} busy={chat.working != null} />}

        {isMobile && !inCommercial && (
          <BottomTabs
            active={TAB_FOR[mode] ?? "home"}
            onSelect={(tab) => {
              setSheetOpen(false);
              go(tab === "home" ? "dashboard" : tab);
            }}
          />
        )}
      </aside>

      {/*
        The logo sits on the canvas only when the panel is not showing it, which
        is why it is absent on the dashboard.
      */}
      {!isMobile && inChat && (
        <Image
          src="/assets/finsure-logo.png"
          alt=""
          width={115}
          height={58}
          className="pointer-events-none absolute z-2 h-auto w-[115px] transition-[right] duration-200"
          style={{ top: 40, right: width + 60 }}
        />
      )}
    </div>
  );
}

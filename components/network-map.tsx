"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import type { MapData, Marker } from "@/lib/domain/map";
import type { MapLayer } from "@/lib/domain/types";

/**
 * The network map.
 *
 * Leaflet runs inside `public/branch-map-dark.html` rather than as a React
 * dependency: it owns its own DOM and its own tile lifecycle, and keeping it
 * behind an iframe means React never has to reconcile against it. Data crosses
 * the boundary as plain objects over `postMessage`.
 *
 * The iframe is mounted once and never keyed on state, so switching canvas views
 * does not tear down the map and refetch tiles.
 */
export function NetworkMap({
  data,
  layers,
  panelWidth,
  onOpenMarker,
}: {
  data: MapData;
  layers: readonly MapLayer[];
  /** Width reserved on the right so markers are not hidden behind the panel. */
  panelWidth: number;
  onOpenMarker: (marker: Pick<Marker, "kind" | "key" | "name">) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);

  // Held in a ref so the message listener does not need re-attaching whenever a
  // layer is toggled. The iframe only reads it in response to a message, which
  // cannot arrive before effects have run.
  const latest = useRef({ data, layers, panelWidth, onOpenMarker });
  useEffect(() => {
    latest.current = { data, layers, panelWidth, onOpenMarker };
  }, [data, layers, panelWidth, onOpenMarker]);

  const send = (message: unknown) => {
    frame.current?.contentWindow?.postMessage(message, "*");
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;

      if (payload.type === "map-ready") {
        ready.current = true;
        const current = latest.current;
        send({
          type: "set-layers",
          data: current.data,
          layers: asFlags(current.layers),
        });
        send({ type: "refit", panelWidth: current.panelWidth });
        return;
      }

      if (payload.type === "marker-open") {
        latest.current.onOpenMarker({
          kind: payload.kind,
          key: payload.key,
          name: payload.name,
        });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    send({ type: "set-layers", data, layers: asFlags(layers) });
  }, [data, layers]);

  useEffect(() => {
    if (!ready.current) return;
    send({ type: "refit", panelWidth });
  }, [panelWidth]);

  return (
    <iframe
      ref={frame}
      src="/branch-map-dark.html"
      title="Network map"
      className="absolute inset-0 block h-full w-full border-0"
    />
  );
}

/** The iframe expects a flag per layer rather than a list of active ones. */
const asFlags = (
  active: readonly MapLayer[],
): Record<MapLayer, boolean> => ({
  lenders: active.includes("lenders"),
  branches: active.includes("branches"),
  brokers: active.includes("brokers"),
  clients: active.includes("clients"),
});

const LAYER_LABEL: Record<MapLayer, string> = {
  lenders: "Lenders",
  branches: "Branches",
  brokers: "Brokers",
  clients: "Clients",
};

/**
 * Layer picker. Exactly one layer is shown at a time, so markers of different
 * kinds can never overlap and imply a relationship that is not there.
 *
 * Only the layers the current identity may see are offered — a broker has no
 * branch layer to turn on, because the network is withheld rather than narrowed.
 */
export function MapLayers({
  available,
  active,
  onSelect,
  className,
  style,
}: {
  available: readonly MapLayer[];
  active: MapLayer;
  onSelect: (layer: MapLayer) => void;
  className?: string;
  style?: CSSProperties;
}) {
  if (available.length < 2) return null;

  return (
    <div
      className={`flex w-[170px] flex-col gap-0.5 rounded-[14px] border border-hairline bg-glass p-2 backdrop-blur-lg ${className ?? ""}`}
      style={style}
    >
      <span className="px-1 pt-0.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-secondary">
        MAP LAYERS
      </span>

      {available.map((layer) => {
        const on = layer === active;
        return (
          <button
            key={layer}
            type="button"
            onClick={() => onSelect(layer)}
            aria-pressed={on}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border-0 px-2 py-2 text-left text-[13px] ${
              on
                ? "bg-white/10 font-medium text-primary"
                : "bg-transparent font-normal text-secondary hover:bg-white/5"
            }`}
          >
            <span
              className="block size-2 rounded-full"
              style={{
                background: on ? "var(--color-accent)" : "rgb(255 255 255 / 0.25)",
              }}
            />
            <span>{LAYER_LABEL[layer]}</span>
          </button>
        );
      })}
    </div>
  );
}

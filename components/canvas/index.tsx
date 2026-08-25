"use client";

import type { CanvasView } from "@/lib/domain/answers";
import type { DataScope } from "@/lib/domain/identity";
import { ApplicationView } from "./application-view";
import { ComplianceView, FindingGroupView } from "./compliance-view";
import { DocumentView } from "./document-view";
import { BranchView, BrokerView, NetworkReportView } from "./network-views";
import { ThreadView } from "./thread-view";

/**
 * Resolves a canvas view to its component.
 *
 * Every lookup goes through the scope rather than the full record set, so a view
 * cannot be rendered for a record the current identity may not see — if the
 * identifier is not in scope, nothing is shown.
 */
export function Canvas({
  view,
  scope,
  onOpen,
}: {
  view: CanvasView;
  scope: DataScope;
  onOpen: (view: CanvasView) => void;
}) {
  switch (view.kind) {
    case "map":
      return null;

    case "networkReport":
      return <NetworkReportView scope={scope} onOpen={onOpen} />;

    case "compliance":
      return <ComplianceView scope={scope} onOpen={onOpen} />;

    case "findingGroup":
      return (
        <FindingGroupView
          scope={scope}
          group={view.group}
          value={view.value}
          onOpen={onOpen}
        />
      );

    case "document":
      return <DocumentView id={view.id} />;

    case "branch": {
      const branch = scope.branches.find((b) => b.id === view.id);
      return branch ? (
        <BranchView scope={scope} branch={branch} onOpen={onOpen} />
      ) : (
        <OutOfScope />
      );
    }

    case "broker": {
      const broker = scope.brokers.find((b) => b.id === view.id);
      return broker ? (
        <BrokerView scope={scope} broker={broker} onOpen={onOpen} />
      ) : (
        <OutOfScope />
      );
    }

    case "application": {
      const application = scope.applications.find((a) => a.id === view.id);
      return application ? (
        <ApplicationView
          scope={scope}
          application={application}
          onOpen={onOpen}
        />
      ) : (
        <OutOfScope />
      );
    }

    case "thread": {
      const application = scope.applications.find(
        (a) => a.id === view.applicationId,
      );
      return application ? (
        <ThreadView
          scope={scope}
          applicationId={view.applicationId}
          threadId={view.threadId}
          onOpen={onOpen}
        />
      ) : (
        <OutOfScope />
      );
    }
  }
}

/**
 * A short label for the open view, for the mobile back control. It names the
 * kind of record rather than the record itself, so the label cannot leak the
 * identity of something the reader may not be permitted to see.
 */
export function canvasTitle(view: CanvasView): string {
  switch (view.kind) {
    case "map":
      return "Map";
    case "networkReport":
      return "Network position";
    case "compliance":
      return "Evidence review";
    case "findingGroup":
      return "Findings";
    case "document":
      return "Document";
    case "branch":
      return "Branch";
    case "broker":
      return "Broker";
    case "application":
      return "Application";
    case "thread":
      return "Correspondence";
  }
}

/**
 * GUARDRAIL: this states that the record is not available, without confirming or
 * denying that it exists. Whether a record is absent or merely out of reach is
 * itself information that access control is meant to withhold.
 */
function OutOfScope() {
  return (
    <div className="max-w-[520px] animate-rise">
      <h1 className="m-0 mb-2 text-2xl font-medium">Record not available</h1>
      <p className="m-0 text-base leading-6 text-secondary">
        This record is not among those available to you. Nothing here indicates
        whether it exists.
      </p>
    </div>
  );
}

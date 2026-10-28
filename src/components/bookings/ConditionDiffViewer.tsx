import { ConditionRecord, Incident } from "@/types";
import { computeConditionDiff, formatState, ItemConditionState } from "@/lib/rules/condition";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldAlert,
  ClipboardList,
  UserCheck,
  Clock,
  Sparkles,
} from "lucide-react";

interface ConditionDiffViewerProps {
  initialRecord: ConditionRecord | null;
  returnRecord: ConditionRecord | null;
  linkedIncident?: Incident | null;
}

export function ConditionDiffViewer({
  initialRecord,
  returnRecord,
  linkedIncident,
}: ConditionDiffViewerProps) {
  if (!initialRecord && !returnRecord) {
    return (
      <div className="rounded-2xl border border-dashed border-dusty-olive-300 p-8 text-center text-dusty-olive-600 text-sm bg-dusty-olive-50/40">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-dusty-olive-400" />
        <p className="font-semibold text-dusty-olive-900">No condition records logged yet.</p>
        <p className="text-xs text-dusty-olive-600 mt-1">
          Handover sign-off (Step 7) and return inspection (Step 8) will be recorded here.
        </p>
      </div>
    );
  }

  // If only check-in is recorded so far
  if (initialRecord && !returnRecord) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-muted-teal-200 bg-muted-teal-50/80 p-4 sm:p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-muted-teal-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-muted-teal-950">
                Resource Currently In Use (Check-in Verified)
              </h4>
              <Badge variant="teal" className="text-[10px]">
                Awaiting Return
              </Badge>
            </div>
            <p className="text-xs text-muted-teal-900 leading-relaxed">
              Handover inspection completed by <strong>{initialRecord.recorded_by_name || "Facility Technician"}</strong> on {new Date(initialRecord.created_at).toLocaleString()}. The return diff comparison will automatically generate once Step 8 inspection is logged.
            </p>
          </div>
        </div>

        {/* Initial Check-in Card */}
        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dusty-olive-100">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-dusty-olive-500">
                Step 7 Handover Baseline
              </span>
              <h3 className="font-bold text-base text-dusty-olive-950">
                Initial Condition Record
              </h3>
            </div>
            <Badge variant="success" className="capitalize">
              {initialRecord.status.replace("_", " ")}
            </Badge>
          </div>

          {initialRecord.notes && (
            <p className="text-xs text-dusty-olive-800 bg-dusty-olive-50/70 p-3 rounded-xl border border-dusty-olive-200/70">
              <strong className="text-dusty-olive-950">Technician Handover Notes:</strong> {initialRecord.notes}
            </p>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-dusty-olive-800 block">
              Handover Inspection Checkpoints:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(initialRecord.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-dusty-olive-200/80 bg-dusty-olive-50/40 flex items-start justify-between gap-2"
                >
                  <div className="text-xs">
                    <span className="font-medium text-dusty-olive-950 block">{item.item}</span>
                    {item.notes && <span className="text-[11px] text-dusty-olive-500">{item.notes}</span>}
                  </div>
                  <StateBadge state={item.state} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Both records exist: compute pure condition diff!
  const diffResult = computeConditionDiff(
    initialRecord?.items || [],
    returnRecord?.items || []
  );

  return (
    <div className="space-y-6">
      {/* Diff Status Banner */}
      <div
        className={`rounded-2xl p-5 border shadow-xs transition ${
          diffResult.hasWorsened
            ? "bg-amber-50/80 border-amber-300 text-amber-950"
            : "bg-celadon-50/80 border-celadon-300 text-celadon-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {diffResult.hasWorsened ? (
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-celadon-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  {diffResult.hasWorsened
                    ? `Condition Degradation Detected (${diffResult.worsenedItemsCount} item${
                        diffResult.worsenedItemsCount > 1 ? "s" : ""
                      } flagged)`
                    : "Return Inspection Passed: Zero Degradation"}
                </h3>
                <Badge
                  variant={diffResult.hasWorsened ? "destructive" : "success"}
                  className="uppercase text-[10px] tracking-wider font-bold"
                >
                  {diffResult.hasWorsened ? "Flagged for Review" : "Pristine"}
                </Badge>
              </div>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">
                {diffResult.summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Drafted Incident Alert (No Automated Penalty Principle) */}
      {diffResult.hasWorsened && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <h4 className="font-bold text-sm text-amber-950">
                Auto-Drafted Incident (Status: Draft)
              </h4>
            </div>
            <Badge variant="warning" className="uppercase font-bold text-[10px]">
              Draft • Human Review Required
            </Badge>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            {diffResult.suggestedIncidentDraft?.description}
          </p>

          <div className="rounded-xl bg-white/90 border border-amber-200/90 p-3 text-xs text-amber-900 space-y-1">
            <div className="font-semibold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              CampusShare Non-Negotiable Principle:
            </div>
            <p className="text-[11px] leading-relaxed">
              No penalty, deposit deduction, or suspension is applied automatically by the algorithm. AI and rules engines only identify variances; the facility technician and owner review the physical evidence and decide on resolution.
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side Condition Comparison Cards */}
      <div className="rounded-2xl border border-dusty-olive-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-dusty-olive-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-dusty-olive-950">
              Checkpoint Side-by-Side Condition Diff
            </h4>
            <p className="text-xs text-dusty-olive-500">
              Direct comparison between initial check-in (Step 7) and post-use return (Step 8).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-dusty-olive-600">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-celadon-600 inline-block" /> Unchanged
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Degraded
            </span>
          </div>
        </div>

        <div className="divide-y divide-dusty-olive-100">
          {diffResult.items.map((diff, index) => (
            <div
              key={index}
              className={`p-4 sm:p-5 transition ${
                diff.worsened ? "bg-rose-50/40" : "bg-white hover:bg-dusty-olive-50/40"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1 md:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-dusty-olive-950">{diff.item}</span>
                    {diff.worsened && (
                      <Badge variant="destructive" className="text-[9px] uppercase font-bold">
                        Degraded
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-dusty-olive-500">{diff.explanation}</p>
                </div>

                {/* State Transition Visualizer */}
                <div className="flex items-center gap-3 bg-dusty-olive-50/60 p-2.5 rounded-xl border border-dusty-olive-200/80 shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-dusty-olive-500 block font-semibold uppercase">
                      Check-in
                    </span>
                    <StateBadge state={diff.initialState} />
                    {diff.initialNotes && (
                      <span className="text-[10px] text-dusty-olive-600 block max-w-[120px] truncate mt-0.5">
                        &quot;{diff.initialNotes}&quot;
                      </span>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-dusty-olive-400 shrink-0" />

                  <div className="text-center">
                    <span className="text-[10px] text-dusty-olive-500 block font-semibold uppercase">
                      Return
                    </span>
                    <StateBadge state={diff.returnState} />
                    {diff.returnNotes && (
                      <span className="text-[10px] text-rose-600 block max-w-[120px] truncate mt-0.5 font-medium">
                        &quot;{diff.returnNotes}&quot;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Handover Signatures & Meta Footer */}
        <div className="p-4 bg-dusty-olive-50/50 border-t border-dusty-olive-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-dusty-olive-600">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-dusty-olive-400 shrink-0" />
            <span>
              <strong className="text-dusty-olive-800">Handover By:</strong> {initialRecord?.recorded_by_name || "Staff"} (
              {initialRecord ? new Date(initialRecord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-dusty-olive-400 shrink-0" />
            <span>
              <strong className="text-dusty-olive-800">Return By:</strong> {returnRecord?.recorded_by_name || "Staff"} (
              {returnRecord ? new Date(returnRecord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: ItemConditionState }) {
  switch (state) {
    case "ok":
      return (
        <Badge variant="success" className="text-[10px] gap-1">
          <CheckCircle2 className="w-3 h-3" /> OK
        </Badge>
      );
    case "minor_issue":
      return (
        <Badge variant="warning" className="text-[10px] gap-1">
          <AlertTriangle className="w-3 h-3" /> Minor Issue
        </Badge>
      );
    case "damaged":
      return (
        <Badge variant="destructive" className="text-[10px] gap-1">
          <XCircle className="w-3 h-3" /> Damaged
        </Badge>
      );
    default:
      return <Badge variant="outline">{state}</Badge>;
  }
}

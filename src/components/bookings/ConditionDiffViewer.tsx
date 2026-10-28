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
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm bg-slate-50">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="font-semibold text-slate-700">No condition records logged yet.</p>
        <p className="text-xs text-slate-500 mt-1">
          Handover sign-off (Step 7) and return inspection (Step 8) will be recorded here.
        </p>
      </div>
    );
  }

  // If only check-in is recorded so far
  if (initialRecord && !returnRecord) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-blue-950">
                Resource Currently In Use (Check-in Verified)
              </h4>
              <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800">
                Awaiting Return
              </Badge>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Handover inspection completed by <strong>{initialRecord.recorded_by_name || "Facility Technician"}</strong> on {new Date(initialRecord.created_at).toLocaleString()}. The return diff comparison will automatically generate once Step 8 inspection is logged.
            </p>
          </div>
        </div>

        {/* Initial Check-in Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                Step 7 Handover Baseline
              </span>
              <h3 className="font-bold text-base text-slate-900">
                Initial Condition Record
              </h3>
            </div>
            <Badge variant="success" className="capitalize">
              {initialRecord.status.replace("_", " ")}
            </Badge>
          </div>

          {initialRecord.notes && (
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="text-slate-900">Technician Handover Notes:</strong> {initialRecord.notes}
            </p>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-800 block">
              Handover Inspection Checkpoints:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(initialRecord.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-2"
                >
                  <div className="text-xs">
                    <span className="font-medium text-slate-900 block">{item.item}</span>
                    {item.notes && <span className="text-[11px] text-slate-500">{item.notes}</span>}
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
        className={`rounded-2xl p-5 border shadow-sm transition ${
          diffResult.hasWorsened
            ? "bg-amber-50/80 border-amber-300 text-amber-950"
            : "bg-emerald-50/80 border-emerald-300 text-emerald-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {diffResult.hasWorsened ? (
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
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
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <h4 className="font-bold text-sm text-amber-950">
                Auto-Drafted Incident (Status: Draft)
              </h4>
            </div>
            <Badge variant="warning" className="uppercase font-bold text-[10px] bg-amber-200 text-amber-950">
              Draft • Human Review Required
            </Badge>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            {diffResult.suggestedIncidentDraft?.description}
          </p>

          <div className="rounded-xl bg-white/90 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Checkpoint Side-by-Side Condition Diff
            </h4>
            <p className="text-xs text-slate-500">
              Direct comparison between initial check-in (Step 7) and post-use return (Step 8).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Unchanged
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Degraded
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {diffResult.items.map((diff, index) => (
            <div
              key={index}
              className={`p-4 sm:p-5 transition ${
                diff.worsened ? "bg-rose-50/40" : "bg-white hover:bg-slate-50/50"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1 md:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{diff.item}</span>
                    {diff.worsened && (
                      <Badge variant="destructive" className="text-[9px] uppercase font-bold">
                        Degraded
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{diff.explanation}</p>
                </div>

                {/* State Transition Visualizer */}
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Check-in
                    </span>
                    <StateBadge state={diff.initialState} />
                    {diff.initialNotes && (
                      <span className="text-[10px] text-slate-500 block max-w-[120px] truncate mt-0.5">
                        &quot;{diff.initialNotes}&quot;
                      </span>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Handover By:</strong> {initialRecord?.recorded_by_name || "Staff"} (
              {initialRecord ? new Date(initialRecord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Return By:</strong> {returnRecord?.recorded_by_name || "Staff"} (
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

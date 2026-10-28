"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Booking, Resource, Profile, ConditionRecord } from "@/types";
import { ChecklistItemRecord, ItemConditionState, computeConditionDiff, checkLateReturn } from "@/lib/rules/condition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  User,
  Clock,
  ShieldCheck,
  Send,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface ReturnFormProps {
  booking: Booking;
  resource: Resource;
  borrower: Profile | null;
  technicianName: string;
  initialRecord: ConditionRecord | null;
}

export function ReturnForm({
  booking,
  resource,
  borrower,
  technicianName,
  initialRecord,
}: ReturnFormProps) {
  const router = useRouter();

  // Baseline items from initial check-in or fallback
  const initialItems: ChecklistItemRecord[] = useMemo(() => {
    if (initialRecord?.items && initialRecord.items.length > 0) {
      return initialRecord.items;
    }
    if (resource.condition_checklist && resource.condition_checklist.length > 0) {
      return resource.condition_checklist.map((item) => ({
        item,
        state: "ok",
      }));
    }
    return [
      { item: "Power and interface cords functional", state: "ok" },
      { item: "No physical cracks, burns, or structural defects", state: "ok" },
      { item: "Operational self-test passed", state: "ok" },
      { item: "Clean and free of debris", state: "ok" },
    ];
  }, [initialRecord, resource]);

  // Return items initialized with the same checkpoints
  const [returnItems, setReturnItems] = useState<ChecklistItemRecord[]>(
    initialItems.map((item) => ({
      item: item.item,
      state: item.state, // default to initial state
      notes: "",
    }))
  );

  const [overallNotes, setOverallNotes] = useState(
    "Return inspection completed. Station verified by technician."
  );
  const [recordedByName, setRecordedByName] = useState(technicianName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live condition diff preview!
  const liveDiff = useMemo(() => {
    return computeConditionDiff(initialItems, returnItems);
  }, [initialItems, returnItems]);

  // Live late return check
  const liveLateCheck = useMemo(() => {
    return checkLateReturn(booking.end_time, new Date());
  }, [booking.end_time]);

  const handleStateChange = (index: number, state: ItemConditionState) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], state };
      return copy;
    });
  };

  const handleItemNoteChange = (index: number, notes: string) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/bookings/${booking.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: returnItems,
          notes: overallNotes,
          recorded_by_name: recordedByName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record return.");
      }

      router.push(`/bookings/${booking.id}?returned=true`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to record return.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mobile-first Header Context Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
              Step 8 Return Inspection
            </Badge>
            <Badge variant="warning" className="text-[10px] uppercase font-bold">
              Booking #{booking.id.slice(0, 12)}
            </Badge>
          </div>
          <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Scheduled End:{" "}
            {new Date(booking.end_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Resource Station:
            </span>
            <p className="font-bold text-slate-900 text-sm">{resource.name}</p>
            <p className="text-slate-600">{resource.location}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Borrower:
            </span>
            <p className="font-bold text-slate-900 text-sm">
              {borrower ? borrower.full_name : "David Kim"}
            </p>
            <p className="text-slate-600">
              {borrower?.department || "Startup Team"} • Score: {borrower?.reputation_score ?? 90}/100
            </p>
          </div>
        </div>
      </div>

      {/* Late Return Alert if applicable */}
      {liveLateCheck.isLate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-amber-950 font-bold">
              Late Return Detected (+{liveLateCheck.minutesLate} minutes)
            </strong>
            <p className="text-amber-800 leading-relaxed">
              {liveLateCheck.explanation} An audit event will document this timing discrepancy.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Diff Warning Banner if degraded */}
      {liveDiff.hasWorsened && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <strong className="block text-amber-950 font-bold">
                Degradation Flagged: Draft Incident will be created
              </strong>
              <Badge variant="warning" className="text-[10px] uppercase font-bold bg-amber-200">
                Draft Status
              </Badge>
            </div>
            <p className="text-amber-800 text-xs leading-relaxed">
              {liveDiff.worsenedItemsCount} checkpoint(s) have degraded since Step 7 check-in. CampusShare will automatically create an incident in <strong>Draft</strong> status for human manager review. No automated penalty is applied.
            </p>
          </div>
        </div>
      )}

      {/* Checklist Comparison Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Return Inspection Checkpoints
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare current condition against baseline recorded at check-in.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {returnItems.length} Checkpoints
          </span>
        </div>

        <div className="space-y-4">
          {returnItems.map((item, index) => {
            const initialItem = initialItems[index] || { state: "ok" as ItemConditionState };
            const isDegraded =
              (item.state === "damaged" && initialItem.state !== "damaged") ||
              (item.state === "minor_issue" && initialItem.state === "ok");

            return (
              <div
                key={index}
                className={`rounded-2xl border p-4 sm:p-5 transition ${
                  isDegraded
                    ? "border-amber-400 bg-amber-50/40 shadow-sm"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 leading-snug">
                      {index + 1}. {item.item}
                    </span>

                    {/* Baseline indicator pill */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                      <span>Initial Check-in:</span>
                      <span className="font-semibold uppercase text-[10px] text-slate-800">
                        {initialItem.state}
                      </span>
                    </div>
                  </div>

                  {/* Return State Selector Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStateChange(index, "ok")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        item.state === "ok"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>OK</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStateChange(index, "minor_issue")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        item.state === "minor_issue"
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Minor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStateChange(index, "damaged")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        item.state === "damaged"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Damaged</span>
                    </button>
                  </div>

                  {/* Degradation Callout if worsened */}
                  {isDegraded && (
                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        Worsened from <strong>{initialItem.state}</strong> to <strong>{item.state}</strong> during reservation. Please document details below.
                      </span>
                    </div>
                  )}

                  {/* Return Notes Input */}
                  <input
                    type="text"
                    placeholder="Inspection remarks for this checkpoint..."
                    value={item.notes || ""}
                    onChange={(e) => handleItemNoteChange(index, e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technician Sign-off */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Technician Return Sign-off
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Return Technician / Manager Name:
            </label>
            <Input
              type="text"
              required
              value={recordedByName}
              onChange={(e) => setRecordedByName(e.target.value)}
              className="text-xs"
              placeholder="e.g. Jordan Taylor (Makerspace Technician)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Return Notes:
            </label>
            <textarea
              rows={2}
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Document final return status, cleaning completed, or damage notes..."
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-6 text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 rounded-xl ${
          liveDiff.hasWorsened
            ? "bg-amber-600 hover:bg-amber-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        <Send className="w-4 h-4" />
        {isSubmitting
          ? "Recording Return..."
          : liveDiff.hasWorsened
          ? "Submit Return & Create Draft Incident"
          : "Complete Return Inspection (Passed)"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Booking, Resource, Profile } from "@/types";
import { ChecklistItemRecord, ItemConditionState } from "@/lib/rules/condition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCheck,
  Building2,
  User,
  Clock,
  ShieldCheck,
  Send,
} from "lucide-react";

interface CheckInFormProps {
  booking: Booking;
  resource: Resource;
  borrower: Profile | null;
  technicianName: string;
}

export function CheckInForm({
  booking,
  resource,
  borrower,
  technicianName,
}: CheckInFormProps) {
  const router = useRouter();

  // Initialize checklist items from resource
  const defaultChecklist = resource.condition_checklist && resource.condition_checklist.length > 0
    ? resource.condition_checklist
    : [
        "Chassis and physical casing clean and undamaged",
        "Power and connection cables fully functional",
        "Safety interlocks and emergency stop verified",
        "Consumables and included accessories present",
        "Power-on self-test passed",
      ];

  const [items, setItems] = useState<ChecklistItemRecord[]>(
    defaultChecklist.map((item) => ({
      item,
      state: "ok",
      notes: "",
    }))
  );

  const [overallNotes, setOverallNotes] = useState(
    "Physical inspection completed before handover. Equipment in operational condition."
  );
  const [recordedByName, setRecordedByName] = useState(technicianName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStateChange = (index: number, state: ItemConditionState) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], state };
      return copy;
    });
  };

  const handleItemNoteChange = (index: number, notes: string) => {
    setItems((prev) => {
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
      const res = await fetch(`/api/bookings/${booking.id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          notes: overallNotes,
          recorded_by_name: recordedByName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to record check-in.");
      }

      router.push(`/bookings/${booking.id}?checkedIn=true`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to record check-in.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mobile-first Header Context Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-indigo-100/60">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
              Step 7 Check-in
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
              Booking #{booking.id.slice(0, 12)}
            </Badge>
          </div>
          <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(booking.start_time).toLocaleDateString([], {
              month: "short",
              day: "numeric",
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
              {borrower ? borrower.full_name : "Sarah Jenkins"}
            </p>
            <p className="text-slate-600">
              {borrower?.department || "Researcher"} • Score: {borrower?.reputation_score ?? 95}/100
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Checklist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Inspection Checklist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify physical and operational state prior to handover.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {items.length} Checkpoints
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className={`rounded-xl border p-4 transition ${
                item.state === "damaged"
                  ? "border-rose-300 bg-rose-50/50"
                  : item.state === "minor_issue"
                  ? "border-amber-300 bg-amber-50/40"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-sm text-slate-900 leading-snug">
                    {index + 1}. {item.item}
                  </span>
                </div>

                {/* Mobile-first segmented state selector buttons */}
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

                {/* Optional Note per checkpoint */}
                <input
                  type="text"
                  placeholder="Optional observation notes for this checkpoint..."
                  value={item.notes || ""}
                  onChange={(e) => handleItemNoteChange(index, e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handover Metadata & Sign-off */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Technician Handover Sign-off
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Handover Technician / Manager Name:
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
              General Handover Notes:
            </label>
            <textarea
              rows={2}
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Record any general instructions, accessories delivered, or physical condition remarks..."
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center gap-2 rounded-xl"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? "Recording Handover..." : "Confirm Physical Check-in & Mark In Use"}
      </Button>
    </form>
  );
}

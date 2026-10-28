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
      <div className="rounded-2xl border border-dusty-olive-200/90 bg-gradient-to-br from-soft-celadon-50/50 via-white to-dusty-olive-50/40 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-dusty-olive-100">
          <div className="flex items-center gap-2">
            <Badge variant="accent" className="text-[10px] uppercase font-bold tracking-wider">
              Step 7 Check-in
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
              Booking #{booking.id.slice(0, 12)}
            </Badge>
          </div>
          <span className="text-xs text-celadon-800 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-celadon-700" />
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
            <span className="text-dusty-olive-500 flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-celadon-700" /> Resource Station:
            </span>
            <p className="font-bold text-dusty-olive-950 text-sm">{resource.name}</p>
            <p className="text-dusty-olive-600">{resource.location}</p>
          </div>

          <div className="space-y-1">
            <span className="text-dusty-olive-500 flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5 text-celadon-700" /> Borrower:
            </span>
            <p className="font-bold text-dusty-olive-950 text-sm">
              {borrower ? borrower.full_name : "Sarah Jenkins"}
            </p>
            <p className="text-dusty-olive-600">
              {borrower?.department || "Researcher"} • Score: {borrower?.reputation_score ?? 95}/100
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Checklist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-dusty-olive-950 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-celadon-700" />
              Inspection Checklist
            </h3>
            <p className="text-xs text-dusty-olive-600 mt-0.5">
              Verify physical and operational state prior to handover.
            </p>
          </div>
          <span className="text-xs font-semibold text-dusty-olive-700 bg-dusty-olive-100/80 px-2.5 py-1 rounded-full">
            {items.length} Checkpoints
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className={`rounded-2xl border p-4 transition ${
                item.state === "damaged"
                  ? "border-rose-300 bg-rose-50/50"
                  : item.state === "minor_issue"
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-dusty-olive-200/90 bg-white shadow-xs"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-sm text-dusty-olive-950 leading-snug">
                    {index + 1}. {item.item}
                  </span>
                </div>

                {/* Mobile-first segmented state selector buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStateChange(index, "ok")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      item.state === "ok"
                        ? "bg-celadon-700 text-white border-celadon-700 shadow-xs"
                        : "bg-white text-dusty-olive-800 border-dusty-olive-200 hover:bg-dusty-olive-50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>OK</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStateChange(index, "minor_issue")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      item.state === "minor_issue"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-dusty-olive-800 border-dusty-olive-200 hover:bg-dusty-olive-50"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Minor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStateChange(index, "damaged")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      item.state === "damaged"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white text-dusty-olive-800 border-dusty-olive-200 hover:bg-dusty-olive-50"
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
                  className="w-full text-xs px-3 py-2 rounded-xl border border-dusty-olive-200 bg-dusty-olive-50/50 text-dusty-olive-950 placeholder:text-dusty-olive-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-celadon-600 transition"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handover Metadata & Sign-off */}
      <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-5 shadow-xs space-y-4">
        <h4 className="font-bold text-sm text-dusty-olive-950 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-celadon-700" />
          Technician Handover Sign-off
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-dusty-olive-800 mb-1">
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
            <label className="block text-xs font-semibold text-dusty-olive-800 mb-1">
              General Handover Notes:
            </label>
            <textarea
              rows={2}
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-dusty-olive-200 text-dusty-olive-950 placeholder:text-dusty-olive-400 focus:outline-none focus:ring-2 focus:ring-celadon-600"
              placeholder="Record any general instructions, accessories delivered, or physical condition remarks..."
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-6 text-sm font-bold bg-celadon-700 hover:bg-celadon-800 text-white shadow-xs flex items-center justify-center gap-2 rounded-xl"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? "Recording Handover..." : "Confirm Physical Check-in & Mark In Use"}
      </Button>
    </form>
  );
}

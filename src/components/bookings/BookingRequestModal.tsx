"use client";

import React, { useState } from "react";
import { Resource } from "@/types";
import { SuggestedSlot } from "@/lib/rules/conflicts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface BookingRequestModalProps {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
}

export function BookingRequestModal({
  resource,
  isOpen,
  onClose,
  onSuccess,
}: BookingRequestModalProps) {
  // Default to tomorrow 10:00 AM - 12:00 PM
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 2);
  const defaultDateStr = defaultDate.toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [purpose, setPurpose] = useState("");
  const [teamSize, setTeamSize] = useState(1);
  const [supervisorName, setSupervisorName] = useState("");
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [eligibilityBlock, setEligibilityBlock] = useState<string[] | null>(null);
  const [conflictReasons, setConflictReasons] = useState<string[] | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setEligibilityBlock(null);
    setConflictReasons(null);
    setSuggestedSlots([]);

    if (!rulesAcknowledged) {
      setErrorMsg("You must digitally acknowledge the equipment usage rules.");
      return;
    }

    if (!purpose.trim()) {
      setErrorMsg("Please specify the purpose of your reservation.");
      return;
    }

    setLoading(true);

    try {
      const startIso = new Date(`${date}T${startTime}:00`).toISOString();
      const endIso = new Date(`${date}T${endTime}:00`).toISOString();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          startTime: startIso,
          endTime: endIso,
          purpose: purpose.trim(),
          teamSize,
          supervisorName: supervisorName.trim() || null,
          rulesAcknowledged: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "ELIGIBILITY_BLOCKED") {
          const reasons =
            data.eligibility?.checks
              ?.filter((c: any) => !c.met)
              ?.map((c: any) => c.reason) || [data.message];
          setEligibilityBlock(reasons);
        } else if (data.error === "SLOT_CONFLICT") {
          setConflictReasons(data.conflicts?.reasons || ["Slot is unavailable."]);
          setSuggestedSlots(data.suggestedSlots || []);
        } else {
          setErrorMsg(data.error || "Failed to submit booking request.");
        }
        return;
      }

      setSuccessMsg("Booking request submitted! Routing to facility manager for review.");
      if (onSuccess && data.booking?.id) {
        onSuccess(data.booking.id);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestedSlot = (slot: SuggestedSlot) => {
    const sDate = new Date(slot.start);
    const eDate = new Date(slot.end);

    const yr = sDate.getFullYear();
    const mo = String(sDate.getMonth() + 1).padStart(2, "0");
    const da = String(sDate.getDate()).padStart(2, "0");
    setDate(`${yr}-${mo}-${da}`);

    const sh = String(sDate.getHours()).padStart(2, "0");
    const sm = String(sDate.getMinutes()).padStart(2, "0");
    setStartTime(`${sh}:${sm}`);

    const eh = String(eDate.getHours()).padStart(2, "0");
    const em = String(eDate.getMinutes()).padStart(2, "0");
    setEndTime(`${eh}:${em}`);

    setConflictReasons(null);
    setSuggestedSlots([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Request Reservation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{resource.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Request Submitted!</h3>
            <p className="text-xs text-slate-300">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs sm:text-sm">
            {/* General Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Prerequisite Eligibility Block Alert */}
            {eligibilityBlock && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 space-y-1.5 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Prerequisite Check Failed</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  {eligibilityBlock.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conflict Detection Banner + 3 Nearest Free Slots */}
            {conflictReasons && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2.5 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Time Slot Conflict Detected</span>
                </div>
                <p className="text-slate-300">{conflictReasons.join(" ")}</p>

                {suggestedSlots.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="font-semibold text-amber-200 block">
                      Recommended Alternative Free Slots:
                    </span>
                    <div className="space-y-1">
                      {suggestedSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestedSlot(slot)}
                          className="w-full text-left px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-400 transition text-xs flex items-center justify-between group"
                        >
                          <span className="text-slate-200 group-hover:text-indigo-200">
                            {slot.label}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-semibold group-hover:underline">
                            Select Slot →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date and Time Picking */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs"
                  required
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project / Academic Purpose *
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe your research, prototype, or course project goal..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Team Size & Supervisor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Team Size
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supervisor Name {resource.requires_supervision && <span className="text-amber-400">*</span>}
                </label>
                <Input
                  type="text"
                  placeholder={resource.requires_supervision ? "Required for this tool" : "Optional"}
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            {/* Digital Acknowledgment */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rulesAcknowledged}
                  onChange={(e) => setRulesAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I digitally acknowledge that I have reviewed the usage rules for{" "}
                  <strong className="text-white">{resource.name}</strong>, will wear required PPE,
                  and agree to the pre/post condition inspection protocol.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {loading ? "Checking Eligibility & Conflicts..." : "Submit Reservation"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


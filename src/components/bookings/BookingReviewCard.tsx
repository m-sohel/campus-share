"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Booking, Resource, Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  Send,
  AlertTriangle,
} from "lucide-react";

interface BookingReviewCardProps {
  booking: Booking;
  resource?: Resource;
  borrower?: Profile | null;
}

export function BookingReviewCard({
  booking,
  resource,
  borrower,
}: BookingReviewCardProps) {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<"approved" | "rejected" | "waitlisted" | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenAction = (action: "approved" | "rejected" | "waitlisted") => {
    setSelectedAction(action);
    setErrorMessage(null);
    if (action === "approved") {
      setReason("Safety prerequisites verified. Prototyping schedule cleared.");
    } else if (action === "waitlisted") {
      setReason("Contested slot. Placed on priority waitlist per fair allocation policy.");
    } else {
      setReason("Schedule conflict with institutional maintenance.");
    }
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: selectedAction,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update review.");
      }

      setSuccessMessage(`Successfully updated to ${selectedAction.toUpperCase()}`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to review booking");
      setIsSubmitting(false);
    }
  };

  if (successMessage) {
    return (
      <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-xs text-emerald-950 flex items-center justify-between">
        <span className="font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMessage}
        </span>
        <Badge variant="success" className="text-[10px] uppercase font-bold">
          {selectedAction}
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">Request #{booking.id}</span>
          <h4 className="font-bold text-sm text-slate-900">{resource?.name || "Equipment"}</h4>
        </div>
        <Badge variant="warning" className="text-[10px] uppercase font-bold self-start sm:self-auto">
          Pending Faculty Review
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            <strong>Borrower:</strong> {borrower?.full_name || "Applicant"} ({borrower?.department || "Campus"})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            <strong>Reputation:</strong> {borrower?.reputation_score ?? 95}/100 • Fairness: {booking.fairness_score}/10
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        &quot;{booking.purpose}&quot;
      </p>

      {errorMessage && (
        <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {selectedAction ? (
        <form onSubmit={handleExecuteReview} className="space-y-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Plain-language explanation for {selectedAction.toUpperCase()}:
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Provide reason for audit log..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className={`text-xs h-8 ${
                selectedAction === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : selectedAction === "waitlisted"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              <Send className="w-3 h-3" />
              {isSubmitting ? "Submitting..." : `Confirm ${selectedAction.toUpperCase()}`}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedAction(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenAction("approved")}
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleOpenAction("waitlisted")}
            className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 gap-1"
          >
            <Clock className="w-3.5 h-3.5" /> Waitlist
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleOpenAction("rejected")}
            className="h-7 text-xs border-rose-300 text-rose-800 hover:bg-rose-50 gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Decline
          </Button>
        </div>
      )}
    </div>
  );
}


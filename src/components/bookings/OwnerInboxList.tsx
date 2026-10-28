"use client";

import React, { useState } from "react";
import { EnrichedInboxItem } from "@/backend/services/bookings";
import { DecisionWhyPanel } from "./DecisionWhyPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  ShieldCheck,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface OwnerInboxListProps {
  initialInbox: EnrichedInboxItem[];
  actorId: string;
}

export function OwnerInboxList({ initialInbox, actorId }: OwnerInboxListProps) {
  const [inbox, setInbox] = useState<EnrichedInboxItem[]>(initialInbox);
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);

  // Review Dialog State
  const [activeAction, setActiveAction] = useState<{
    bookingId: string;
    action: "approve" | "reject" | "waitlist" | "cancel";
    resourceName: string;
    requesterName: string;
  } | null>(null);

  const [reasonInput, setReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenAction = (
    bookingId: string,
    action: "approve" | "reject" | "waitlist" | "cancel",
    resourceName: string,
    requesterName: string
  ) => {
    setActionError(null);
    setReasonInput("");
    setActiveAction({ bookingId, action, resourceName, requesterName });
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction) return;

    if (["reject", "waitlist", "cancel"].includes(activeAction.action) && reasonInput.trim().length < 3) {
      setActionError("A substantive reason is required for this action.");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const endpoint =
        activeAction.action === "cancel"
          ? `/api/bookings/${activeAction.bookingId}/cancel`
          : `/api/bookings/${activeAction.bookingId}/review`;

      const payload =
        activeAction.action === "cancel"
          ? { actorId, reason: reasonInput.trim() }
          : { actorId, action: activeAction.action, reason: reasonInput.trim() || "Approved by facility staff." };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Action failed.");
        return;
      }

      // Refresh inbox list from API
      const refRes = await fetch(`/api/bookings/inbox?actorId=${actorId}`);
      const refData = await refRes.json();
      if (refData.success && refData.inbox) {
        setInbox(refData.inbox);
      }

      setActiveAction(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to process request.");
    } finally {
      setActionLoading(false);
    }
  };

  if (inbox.length === 0) {
    return (
      <Card className="border-slate-800 bg-slate-900/50 text-center py-12">
        <CardContent className="space-y-2">
          <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Pending Requests</h3>
          <p className="text-xs text-slate-400">
            All reservation requests for your managed equipment have been processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {inbox.map((item) => {
        const isWhyExpanded = expandedWhyId === item.booking.id;
        const b = item.booking;
        const sTime = new Date(b.start_time).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const eTime = new Date(b.end_time).toLocaleTimeString(undefined, {
          timeStyle: "short",
        });

        // Parse custom purpose metadata if present
        let parsedPurpose = b.purpose;
        try {
          const parsed = JSON.parse(b.purpose);
          if (parsed.purpose) parsedPurpose = parsed.purpose;
        } catch {}

        return (
          <Card
            key={b.id}
            className="border-slate-800 bg-slate-900/80 hover:border-slate-700 transition overflow-hidden text-white"
          >
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold text-white">
                      {item.resource.name}
                    </CardTitle>
                    <Badge
                      variant={
                        b.status === "approved"
                          ? "default"
                          : b.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {b.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{sTime} – {eTime}</span>
                  </CardDescription>
                </div>

                {/* Requester Profile Pill */}
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <User className="w-4 h-4 text-indigo-400" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">{item.borrower.full_name}</span>
                    <span className="text-[10px] text-slate-400">
                      {item.borrower.department || "Campus Member"} • Rep {item.borrower.reputation_score}%
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs sm:text-sm">
              {/* Purpose & Details */}
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-[11px] uppercase font-semibold text-slate-400 block mb-1">
                  Stated Project Purpose:
                </span>
                <p className="text-slate-200">{parsedPurpose}</p>
              </div>

              {/* Live Eligibility & Conflict Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-start gap-2">
                  <ShieldCheck
                    className={`w-4 h-4 mt-0.5 ${
                      item.eligibility.isEligible ? "text-emerald-400" : "text-rose-400"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">Requester Prerequisites:</span>
                    <span className="text-slate-400">{item.eligibility.summary}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-start gap-2">
                  <Clock
                    className={`w-4 h-4 mt-0.5 ${
                      !item.conflicts.hasConflict ? "text-emerald-400" : "text-amber-400"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">Schedule Conflicts:</span>
                    <span className="text-slate-400">
                      {item.conflicts.hasConflict
                        ? item.conflicts.reasons[0]
                        : "Slot is clear with no overlapping reservations."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedWhyId(isWhyExpanded ? null : b.id)}
                  className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explain Decision ("Why" Panel)</span>
                  {isWhyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>

                <div className="flex items-center gap-2">
                  {b.status === "pending_review" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleOpenAction(b.id, "approve", item.resource.name, item.borrower.full_name)
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleOpenAction(b.id, "waitlist", item.resource.name, item.borrower.full_name)
                        }
                        className="border-amber-600/50 text-amber-300 hover:bg-amber-950/40 text-xs"
                      >
                        Waitlist
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleOpenAction(b.id, "reject", item.resource.name, item.borrower.full_name)
                        }
                        className="text-xs"
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {["approved", "confirmed"].includes(b.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleOpenAction(b.id, "cancel", item.resource.name, item.borrower.full_name)
                      }
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                    >
                      Cancel Reservation
                    </Button>
                  )}
                </div>
              </div>

              {/* Collapsible Why Panel */}
              {isWhyExpanded && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                  <DecisionWhyPanel explanation={item.explanation} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Review & Reason Modal */}
      {activeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div>
              <h3 className="text-base font-bold text-white capitalize">
                {activeAction.action} Request
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeAction.requesterName} • {activeAction.resourceName}
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {["reject", "waitlist", "cancel"].includes(activeAction.action) ? (
                    <span>
                      Justification Reason <span className="text-rose-400">(Required)</span>
                    </span>
                  ) : (
                    <span>Review Notes (Optional)</span>
                  )}
                </label>
                <textarea
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder={
                    activeAction.action === "reject"
                      ? "Explain why this request is being rejected (e.g., certification missing or maintenance window)..."
                      : activeAction.action === "waitlist"
                      ? "Explain why placed on waitlist (e.g., high demand queue)..."
                      : "Optional notes for the researcher..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required={["reject", "waitlist", "cancel"].includes(activeAction.action)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveAction(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className={
                    activeAction.action === "reject"
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : activeAction.action === "waitlist"
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }
                >
                  {actionLoading ? "Processing..." : `Confirm ${activeAction.action}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


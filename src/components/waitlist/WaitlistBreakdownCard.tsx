"use client";

import React, { useState } from "react";
import { EnrichedWaitlistEntry } from "@/backend/services/waitlist";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface WaitlistBreakdownCardProps {
  entry: EnrichedWaitlistEntry;
  viewerRole?: "user" | "owner" | "manager" | "admin";
  onOfferAction?: (action: "accept" | "decline") => Promise<void>;
  onOverride?: (newScore: number, reason: string) => Promise<void>;
}

export function WaitlistBreakdownCard({
  entry,
  viewerRole = "user",
  onOfferAction,
  onOverride,
}: WaitlistBreakdownCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideScore, setOverrideScore] = useState(entry.priority_score.toString());
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { breakdown } = entry;
  const isOffered = entry.status === "offered";

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert("A valid explanation of at least 5 characters is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (onOverride) {
        await onOverride(Number(overrideScore), overrideReason.trim());
      } else {
        await fetch(`/api/waitlist/${entry.id}/override`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPriorityScore: Number(overrideScore),
            reason: overrideReason.trim(),
          }),
        });
      }
      setShowOverrideModal(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to process override.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`border-slate-800 bg-slate-900/90 text-white shadow-xl overflow-hidden ${
      isOffered ? "ring-2 ring-emerald-500/80" : ""
    }`}>
      {/* Offered Alert Banner */}
      {isOffered && (
        <div className="bg-emerald-600 px-4 py-2 text-xs font-semibold text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>🎉 Slot Vacated! Offer active with 2-hour acceptance window.</span>
          </div>
          {viewerRole === "user" && onOfferAction && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onOfferAction("accept")}
                className="bg-white text-emerald-950 hover:bg-slate-100 font-bold text-xs h-7 px-3"
              >
                Accept Slot
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOfferAction("decline")}
                className="border-emerald-300 text-white hover:bg-emerald-700 text-xs h-7 px-3"
              >
                Decline
              </Button>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Rank Badge */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              entry.rank === 1
                ? "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-800 text-slate-300"
            }`}>
              #{entry.rank}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-white">
                  {entry.borrower.full_name}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {entry.borrower.role}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                {entry.requested_start ? (
                  <>Requested {new Date(entry.requested_start).toLocaleDateString()} ({new Date(entry.requested_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.requested_end || entry.requested_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</>
                ) : (
                  <>Priority Queue Candidate</>
                )}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Priority Score Pill */}
            <div className="text-right">
              <div className="text-xl font-mono font-extrabold text-indigo-400">
                {entry.priority_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Priority Score</span>
            </div>

            {/* Owner Override Button */}
            {(viewerRole === "owner" || viewerRole === "manager" || viewerRole === "admin") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOverrideModal(true)}
                className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Override</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Transparent Factor Breakdown Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Factor Breakdown (Why this rank?)</span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>{isExpanded ? "Collapse" : "View Details"}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {isExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {/* 1. Fair Share Usage */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between">
                <div>
                  <span className="text-slate-300 font-medium block">Fair Share Usage</span>
                  <span className="text-[11px] text-slate-400">
                    {breakdown.hoursUsedLast30Days.toFixed(1)}h in last 30 days
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {breakdown.usageScore} <span className="text-[10px] text-slate-400">/ {breakdown.maxUsageScore}</span>
                </span>
              </div>

              {/* 2. Wait Duration */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between">
                <div>
                  <span className="text-slate-300 font-medium block">Wait Duration</span>
                  <span className="text-[11px] text-slate-400">
                    {breakdown.daysWaiting.toFixed(1)} days in queue
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {breakdown.waitScore} <span className="text-[10px] text-slate-400">/ {breakdown.maxWaitScore}</span>
                </span>
              </div>

              {/* 3. Project Urgency */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between">
                <div>
                  <span className="text-slate-300 font-medium block">Deadline Urgency</span>
                  <span className="text-[11px] text-slate-400">
                    {breakdown.deadlineDaysRemaining !== null && breakdown.deadlineDaysRemaining !== undefined
                      ? `${breakdown.deadlineDaysRemaining}d remaining (${breakdown.isDeadlineVerified ? "Verified" : "Unverified"})`
                      : "No verified deadline"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-100">
                  {breakdown.urgencyScore} <span className="text-[10px] text-slate-400">/ {breakdown.maxUrgencyScore}</span>
                </span>
              </div>

              {/* 4. Reliability & Penalties */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between">
                <div>
                  <span className="text-slate-300 font-medium block">Reliability Record</span>
                  <span className="text-[11px] text-slate-400">
                    {breakdown.strikesCount === 0
                      ? "+10 clean bonus"
                      : `${breakdown.strikesCount} strike(s)`}
                  </span>
                </div>
                <span className={`font-mono font-bold ${
                  breakdown.strikePenalties > 0 ? "text-rose-400" : "text-emerald-400"
                }`}>
                  {breakdown.strikePenalties > 0 ? `-${breakdown.strikePenalties}` : `+${breakdown.cleanRecordBonus}`} pts
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Summary Pill */}
        <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">{breakdown.rankSummary}</span>
        </div>
      </CardContent>

      {/* Owner Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Owner Override: Waitlist Priority
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Lab Owners can re-prioritize candidates for legitimate institutional or academic exemptions. All overrides are permanently recorded in the tamper-evident audit log.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adjusted Priority Score (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Audit Reason (Required)
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Urgent thesis defense deadline verified by department head Dr. Vance."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverrideModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  {isSubmitting ? "Auditing Override..." : "Confirm & Audit Override"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

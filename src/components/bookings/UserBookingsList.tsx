"use client";

import React, { useState } from "react";
import { Booking, Resource } from "@/types";
import { DecisionExplanation } from "@/lib/rules/decision-explanation";
import { DecisionWhyPanel } from "./DecisionWhyPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
} from "lucide-react";

export interface UserBookingItem {
  booking: Booking;
  resource?: Resource;
  explanation: DecisionExplanation;
}

interface UserBookingsListProps {
  bookings: UserBookingItem[];
  userId: string;
}

export function UserBookingsList({ bookings: initialBookings, userId }: UserBookingsListProps) {
  const [bookings, setBookings] = useState<UserBookingItem[]>(initialBookings);
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);

  // Cancel modal state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBookingId) return;

    if (!cancelReason.trim()) {
      setCancelError("A reason is required to cancel this reservation.");
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${cancellingBookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: userId,
          reason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || "Failed to cancel.");
        return;
      }

      // Reload
      window.location.reload();
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel reservation.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (bookings.length === 0) {
    return (
      <Card className="border-dashed border-2 p-6 text-center text-slate-500 bg-white">
        <Calendar className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="font-medium text-slate-700">No active bookings yet.</p>
        <p className="text-xs text-slate-500 mt-1">
          Pick an eligible tool below and click "Request Slot" to schedule access.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map(({ booking, resource, explanation }) => {
        const isWhyOpen = expandedWhyId === booking.id;
        const sTime = new Date(booking.start_time).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const eTime = new Date(booking.end_time).toLocaleTimeString(undefined, {
          timeStyle: "short",
        });

        let purposeText = booking.purpose;
        try {
          const parsed = JSON.parse(booking.purpose);
          if (parsed.purpose) purposeText = parsed.purpose;
        } catch {}

        return (
          <Card key={booking.id} className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900">
                      {resource?.name || "Equipment Reservation"}
                    </CardTitle>
                    <Badge
                      variant={
                        booking.status === "approved"
                          ? "default"
                          : booking.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {booking.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{sTime} – {eTime}</span>
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {["pending_review", "approved", "confirmed", "waitlisted"].includes(
                    booking.status
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedWhyId(isWhyOpen ? null : booking.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Why Panel</span>
                    {isWhyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>

                  {["pending_review", "approved", "confirmed", "waitlisted"].includes(
                    booking.status
                  ) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCancelError(null);
                        setCancelReason("");
                        setCancellingBookingId(booking.id);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-3 text-xs sm:text-sm">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Purpose: </span>
                <span>{purposeText}</span>
              </div>

              {booking.rejection_reason && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <span className="font-semibold">Reviewer Reason: </span>
                  <span>{booking.rejection_reason}</span>
                </div>
              )}

              {isWhyOpen && (
                <div className="pt-2 animate-in fade-in">
                  <DecisionWhyPanel explanation={explanation} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Cancel Dialog */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-slate-900 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cancel Reservation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please state the reason you are cancelling this booking. This will be logged in the tamper-evident audit trail.
              </p>
            </div>

            {cancelError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule conflict with project demo..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancellingBookingId(null)}
                  disabled={cancelLoading}
                >
                  Keep Reservation
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

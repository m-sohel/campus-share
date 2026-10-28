"use client";

import React, { useState, useEffect } from "react";
import { TimelineItem } from "@/app/api/bookings/[id]/timeline/route";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  ShieldCheck,
  UserCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

interface BookingTimelineProps {
  bookingId: string;
  initialTimeline?: TimelineItem[];
  viewerRole?: string;
  className?: string;
}

export function BookingTimeline({
  bookingId,
  initialTimeline,
  viewerRole = "user",
  className = "",
}: BookingTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline || []);
  const [loading, setLoading] = useState(!initialTimeline);
  const [expandedMetaIndex, setExpandedMetaIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!initialTimeline && bookingId) {
      setLoading(true);
      fetch(`/api/bookings/${bookingId}/timeline`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.timeline) {
            setTimeline(data.timeline);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [bookingId, initialTimeline]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "request":
        return <Calendar className="w-4 h-4 text-indigo-400" />;
      case "approval":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "rejection":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case "waitlist":
        return <Clock className="w-4 h-4 text-amber-400" />;
      case "cancellation":
        return <RotateCcw className="w-4 h-4 text-slate-400" />;
      case "check_in":
        return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      case "return":
        return <UserCheck className="w-4 h-4 text-teal-400" />;
      case "incident":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 space-y-2">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading chronological booking timeline...</p>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        No state events recorded for this reservation yet.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700/60">
        {timeline.map((item, idx) => {
          const isMetaOpen = expandedMetaIndex === idx;
          const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={item.id || idx} className="relative group">
              {/* Timeline Bullet Node */}
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                {getEventIcon(item.type)}
              </div>

              {/* Event Content Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{item.title}</span>
                    {item.toStatus && (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-300">
                        {item.toStatus.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{dateStr}</span>
                </div>

                <p className="text-slate-300 leading-relaxed">{item.description}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Actor:</span>
                    <span className="text-slate-200 font-medium">{item.actor.name}</span>
                    <Badge variant="secondary" className="uppercase text-[9px] px-1.5 py-0">
                      {item.actor.role}
                    </Badge>
                  </div>

                  {item.hash && (
                    <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Lock className="w-3 h-3" />
                      <span>SHA-256: {item.hash.slice(0, 12)}...</span>
                    </div>
                  )}
                </div>

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedMetaIndex(isMetaOpen ? null : idx)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>{isMetaOpen ? "Hide Technical Details" : "View Event Metadata"}</span>
                      {isMetaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isMetaOpen && (
                      <pre className="mt-1.5 p-2 rounded bg-slate-950 text-[10px] text-slate-300 font-mono overflow-x-auto border border-slate-800">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

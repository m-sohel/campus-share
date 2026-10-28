"use client";

import { IncidentTimelineEvent, IncidentStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  AlertTriangle,
  MessageSquare,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  ShieldAlert,
} from "lucide-react";

interface IncidentTimelineProps {
  events: IncidentTimelineEvent[];
  currentStatus: IncidentStatus;
}

export function IncidentTimeline({ events, currentStatus }: IncidentTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        No formal timeline events recorded yet.
      </div>
    );
  }

  const getEventIcon = (action: IncidentTimelineEvent["action"]) => {
    switch (action) {
      case "draft_created":
        return <FileText className="w-4 h-4 text-slate-500" />;
      case "incident_opened":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "user_responded":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "manager_decided":
        return <Scale className="w-4 h-4 text-indigo-500" />;
      case "dispute_raised":
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case "admin_resolved":
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionTitle = (action: IncidentTimelineEvent["action"]) => {
    switch (action) {
      case "draft_created":
        return "Incident Drafted (Condition Diff Engine)";
      case "incident_opened":
        return "Formal Incident Opened for Investigation";
      case "user_responded":
        return "Borrower Response Statement Submitted";
      case "manager_decided":
        return "Station Manager Decision & Finding Recorded";
      case "dispute_raised":
        return "Borrower Formal Appeal & Dispute Escalated";
      case "admin_resolved":
        return "Campus Governance Binding Arbitration Issued";
      default:
        return "Timeline Event";
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
      {events.map((evt, idx) => {
        const isLatest = idx === events.length - 1;
        return (
          <div key={evt.id || idx} className="relative group">
            {/* Dot */}
            <div
              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shadow-xs ${
                isLatest
                  ? "border-indigo-600 text-indigo-600 ring-4 ring-indigo-50"
                  : "border-slate-300 text-slate-500"
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
            </div>

            {/* Content Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-slate-100">{getEventIcon(evt.action)}</span>
                  <h4 className="font-bold text-sm text-slate-900">{getActionTitle(evt.action)}</h4>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(evt.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Actor details */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{evt.actor_name}</span>
                <Badge
                  variant={
                    evt.actor_role === "admin"
                      ? "destructive"
                      : evt.actor_role === "manager"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-[9px] uppercase font-bold px-1.5 py-0"
                >
                  {evt.actor_role}
                </Badge>
              </div>

              {/* Notes */}
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                {evt.notes}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

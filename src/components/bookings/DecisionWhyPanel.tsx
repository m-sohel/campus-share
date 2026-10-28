"use client";

import React from "react";
import { DecisionExplanation } from "@/lib/rules/decision-explanation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  UserCheck,
} from "lucide-react";

interface DecisionWhyPanelProps {
  explanation: DecisionExplanation;
  className?: string;
}

export function DecisionWhyPanel({ explanation, className = "" }: DecisionWhyPanelProps) {
  const getBadgeIcon = () => {
    switch (explanation.badgeVariant) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1" />;
      case "destructive":
        return <XCircle className="w-3.5 h-3.5 mr-1" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
      default:
        return <Info className="w-3.5 h-3.5 mr-1" />;
    }
  };

  const getBorderColor = () => {
    switch (explanation.badgeVariant) {
      case "success":
        return "border-emerald-500/30 bg-emerald-950/10";
      case "destructive":
        return "border-rose-500/30 bg-rose-950/10";
      case "warning":
        return "border-amber-500/30 bg-amber-950/10";
      default:
        return "border-blue-500/30 bg-blue-950/10";
    }
  };

  return (
    <Card className={`border shadow-sm rounded-xl overflow-hidden ${getBorderColor()} ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-200/20 bg-slate-900/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-sm font-bold tracking-tight text-white">
              Why was this request {explanation.status}?
            </CardTitle>
          </div>
          <Badge
            variant={explanation.badgeVariant === "destructive" ? "destructive" : "secondary"}
            className="flex items-center text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5"
          >
            {getBadgeIcon()}
            {explanation.status.replace("_", " ")}
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
          <span>{explanation.headline}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs sm:text-sm">
        {/* Main Decision Narrative */}
        <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-200 leading-relaxed">
          <p className="font-medium text-slate-100">{explanation.decisionNarrative}</p>
        </div>

        {/* Prerequisite & Eligibility Audit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Safety Prerequisites & Credential Audit</span>
          </div>
          <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500/30">
            {explanation.eligibilityAudit.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                {item.met ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-200">{item.label}: </span>
                  <span className="text-slate-400">{item.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule & Conflict Audit */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Schedule Verification</span>
          </div>
          <p className="text-xs text-slate-400 pl-6">
            {explanation.conflictAudit.summary}
          </p>
        </div>

        {/* Policy & Safety Guidelines */}
        {explanation.policyGuidelines.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Facility Rules & Supervision</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pl-2">
              {explanation.policyGuidelines.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps Banner */}
        <div className="pt-2">
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-indigo-100">Next Action Required:</span>
              <span>{explanation.nextSteps}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


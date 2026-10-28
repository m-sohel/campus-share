"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FairnessEvaluationResult, ResourceCategory } from "@/lib/rules/fairness";
import { Gauge, Clock, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

interface FairUseMeterProps {
  initialData?: FairnessEvaluationResult;
  userId?: string;
}

export function FairUseMeter({ initialData, userId }: FairUseMeterProps) {
  const [data, setData] = useState<FairnessEvaluationResult | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>("fabrication");

  useEffect(() => {
    if (!initialData) {
      setLoading(true);
      fetch(`/api/fairness/meter?category=${selectedCategory}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.stats) {
            setData(res.stats);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [initialData, selectedCategory]);

  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-900/80 text-white animate-pulse">
        <CardContent className="p-4 text-center text-xs text-slate-400">
          Loading your Fair Use quotas...
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { activeBookings, weeklyCategoryHours, cooldownRemainingHours } = data.fairUseMeter;

  const getProgressColor = (pct: number) => {
    if (pct >= 85) return "bg-rose-500";
    if (pct >= 60) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getProgressBg = (pct: number) => {
    if (pct >= 85) return "bg-rose-950/40 border-rose-500/30 text-rose-300";
    if (pct >= 60) return "bg-amber-950/40 border-amber-500/30 text-amber-300";
    return "bg-emerald-950/40 border-emerald-500/30 text-emerald-300";
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 text-white shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-400" />
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                Fair Use Meter & Quotas
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 font-mono">
                  ACTIVE POLICY
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Transparent resource sharing metrics enforced by pure rules engine
              </CardDescription>
            </div>
          </div>

          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ResourceCategory)}
            className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="fabrication">Fabrication</option>
            <option value="labs_spaces">Labs & Spaces</option>
            <option value="electronics">Electronics</option>
            <option value="media">Media & AV</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Anti-Monopoly Cooldown Banner if active */}
        {data.cooldownActive && (
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Cooling-Off Period Active</span>
              <p className="text-[11px] text-amber-300/90 mt-0.5">
                {cooldownRemainingHours} hours remaining before new long sessions can be reserved on high-demand gear.
              </p>
            </div>
          </div>
        )}

        {/* Manager Review Notice if flagged */}
        {data.requiresManagerReview && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Manager Review Flagged</span>
              <p className="text-[11px] text-rose-300/90 mt-0.5">
                Your account has unexcused strikes on record. Human staff review will be required before certain reservations can be approved. (No automatic bans).
              </p>
            </div>
          </div>
        )}

        {/* Meters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Active Bookings Limit */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Active Reservations</span>
              <span className="font-mono font-bold text-slate-100">
                {activeBookings.current} / {activeBookings.max}
              </span>
            </div>
            {/* Progress Track */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(activeBookings.percentage)}`}
                style={{ width: `${Math.min(100, activeBookings.percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Concurrent reservations</span>
              <span className="font-mono">{activeBookings.percentage}% quota</span>
            </div>
          </div>

          {/* 2. Weekly Category Quota */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium capitalize">
                Weekly {weeklyCategoryHours.category.replace("_", " ")} Hours
              </span>
              <span className="font-mono font-bold text-slate-100">
                {weeklyCategoryHours.current.toFixed(1)} / {weeklyCategoryHours.max.toFixed(1)}h
              </span>
            </div>
            {/* Progress Track */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(weeklyCategoryHours.percentage)}`}
                style={{ width: `${Math.min(100, weeklyCategoryHours.percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Rolling 7-day window</span>
              <span className="font-mono">{weeklyCategoryHours.percentage}% used</span>
            </div>
          </div>
        </div>

        {/* Plain language policy explanation */}
        <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{data.explanation}</span>
        </div>
      </CardContent>
    </Card>
  );
}

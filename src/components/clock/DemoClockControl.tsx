"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FastForward, RotateCcw, AlertTriangle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function DemoClockControl({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [appTime, setAppTime] = useState<string | null>(null);
  const [offsetHours, setOffsetHours] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastNotificationMsg, setLastNotificationMsg] = useState<string | null>(null);

  const fetchClock = async () => {
    try {
      const res = await fetch("/api/demo/clock");
      if (res.ok) {
        const data = await res.json();
        setAppTime(data.appTime);
        setOffsetHours(data.offsetHours);
      }
    } catch (e) {
      console.error("Failed to fetch demo clock", e);
    }
  };

  useEffect(() => {
    fetchClock();
  }, []);

  const handleClockAction = async (action: "advance_hour" | "advance_day" | "reset") => {
    setIsLoading(true);
    setLastNotificationMsg(null);
    try {
      const res = await fetch("/api/demo/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppTime(data.appTime);
        setOffsetHours(data.offsetHours);

        if (data.triggersCreated > 0) {
          setLastNotificationMsg(
            `⚡ Fast-forward triggered ${data.triggersCreated} new notifications (overdue/reminders)!`
          );
        } else if (action === "reset") {
          setLastNotificationMsg("Clock reset to real time.");
        }

        router.refresh();
      }
    } catch (e) {
      console.error("Failed to advance clock", e);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedTime = appTime
    ? new Date(appTime).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <div className="flex items-center gap-1 bg-slate-900/80 text-white px-2.5 py-1 rounded-lg border border-slate-700 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[11px] font-semibold">{formattedTime}</span>
          {offsetHours > 0 && (
            <Badge variant="warning" className="text-[9px] px-1 py-0 h-4 uppercase font-bold">
              +{offsetHours}h
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleClockAction("advance_hour")}
          disabled={isLoading}
          className="h-7 px-2 text-[11px] bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
          title="Advance clock by 1 hour"
        >
          +1h
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleClockAction("advance_day")}
          disabled={isLoading}
          className="h-7 px-2 text-[11px] bg-indigo-900/60 text-indigo-200 border-indigo-700 hover:bg-indigo-800"
          title="Advance clock by 1 day"
        >
          +1d
        </Button>

        {offsetHours > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleClockAction("reset")}
            disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Reset to real time"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white border border-indigo-800/50 shadow-md space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-300">
                Simulated Campus Clock
              </span>
              {offsetHours > 0 && (
                <Badge variant="warning" className="text-[10px] uppercase font-bold px-1.5 py-0">
                  +{offsetHours} Hours Fast-Forwarded
                </Badge>
              )}
            </div>
            <div className="text-lg font-mono font-bold text-white mt-0.5">
              {formattedTime}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleClockAction("advance_hour")}
            disabled={isLoading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-300" />
            +1 Hour
          </Button>

          <Button
            size="sm"
            onClick={() => handleClockAction("advance_day")}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            +1 Day (Trigger Overdue)
          </Button>

          {offsetHours > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClockAction("reset")}
              disabled={isLoading}
              className="bg-transparent hover:bg-white/10 text-slate-300 border-slate-700 text-xs font-semibold gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Real Time
            </Button>
          )}
        </div>
      </div>

      {lastNotificationMsg && (
        <div className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{lastNotificationMsg}</span>
        </div>
      )}
    </div>
  );
}

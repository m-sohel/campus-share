"use client";

import React, { useState } from "react";
import { FairnessSettings, DEFAULT_FAIRNESS_SETTINGS } from "@/lib/rules/fairness";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sliders, ShieldCheck, CheckCircle2, RotateCcw } from "lucide-react";

interface FairnessSettingsFormProps {
  initialSettings?: FairnessSettings;
}

export function FairnessSettingsForm({ initialSettings }: FairnessSettingsFormProps) {
  const [settings, setSettings] = useState<FairnessSettings>(
    initialSettings || DEFAULT_FAIRNESS_SETTINGS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/fairness/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset fairness policies to standard defaults?")) {
      setSettings(DEFAULT_FAIRNESS_SETTINGS);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 text-white shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <CardTitle className="text-base font-bold text-white">
                Fairness Policy & Quota Configuration
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Configure global anti-monopoly caps, cooling-off delays, and waitlist acceptance windows
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs border-slate-700 text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Defaults
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Fairness policy parameters successfully updated and enforced in real time!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* General Quota Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Max Active Bookings Per User
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxActiveBookingsPerUser}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxActiveBookingsPerUser: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Concurrent active reservations allowed
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Cooldown Trigger Threshold (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={settings.cooldownThresholdHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cooldownThresholdHours: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Consecutive hours triggering break
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Waitlist Offer Window (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.offerWindowHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    offerWindowHours: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Time window for candidate to accept
              </span>
            </div>
          </div>

          {/* Category Weekly Quotas */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="font-bold text-slate-200 text-xs mb-3">
              Weekly Allocation Limits Per Category (Hours / Week)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fabrication</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.maxHoursPerWeekPerCategory.fabrication}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxHoursPerWeekPerCategory: {
                        ...settings.maxHoursPerWeekPerCategory,
                        fabrication: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Labs & Spaces</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.maxHoursPerWeekPerCategory.labs_spaces}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxHoursPerWeekPerCategory: {
                        ...settings.maxHoursPerWeekPerCategory,
                        labs_spaces: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Electronics</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.maxHoursPerWeekPerCategory.electronics}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxHoursPerWeekPerCategory: {
                        ...settings.maxHoursPerWeekPerCategory,
                        electronics: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Media & AV</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.maxHoursPerWeekPerCategory.media}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxHoursPerWeekPerCategory: {
                        ...settings.maxHoursPerWeekPerCategory,
                        media: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4"
            >
              {isSaving ? "Saving Configuration..." : "Save Fairness Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


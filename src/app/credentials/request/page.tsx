"use client";

import { useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileBadge,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const QUALIFICATION_PRESETS = [
  {
    type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2 Certification",
    description: "Covers Class 4 CO2 laser beam alignment, optics maintenance, and emergency ventilation.",
  },
  {
    type: "3d_print_certified",
    title: "Advanced FDM & Resin 3D Printing Operator",
    description: "Covers slicer profiles, nozzle clearance, bed leveling, and resin wash/cure safety.",
  },
  {
    type: "cleanroom_safety",
    title: "Class 1000 Cleanroom Protocol & Acid Safety",
    description: "Covers bunny suit gowning, chemical fume hoods, and hydrofluoric neutralization.",
  },
  {
    type: "electronics_lab_safety",
    title: "High-Voltage & ESD Circuit Testing Authorization",
    description: "Covers anti-static wrist grounding, differential oscilloscope probes, and isolation transformers.",
  },
  {
    type: "drone_operator_license",
    title: "Commercial Drone Pilot Safety Endorsement",
    description: "Covers FAA Part 107 flight space regulations, geo-fencing, and emergency battery fail-safe protocols.",
  },
  {
    type: "cinema_camera_safety",
    title: "Cinema Rig & Sensor Protection Handling",
    description: "Covers full-frame sensor cleaning, lens back-focus, and gimbal counterweight calibration.",
  },
];

export default function RequestCredentialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "laser_safety_l2";
  const isRenewal = searchParams.get("renewal") === "true";
  const isAppeal = searchParams.get("appeal") === "true";

  const preset = QUALIFICATION_PRESETS.find((p) => p.type === initialType) || QUALIFICATION_PRESETS[0];

  const [credentialType, setCredentialType] = useState(preset.type);
  const [title, setTitle] = useState(preset.title);
  const [notes, setNotes] = useState(
    isRenewal
      ? "Submitting annual refresher training request for recertification."
      : isAppeal
      ? "Requesting review of revoked safety credential following protocol retraining."
      : "Completed internal university safety training session. Requesting verification."
  );
  const [evidenceUrl, setEvidenceUrl] = useState("https://campus.edu/safety/certs/verify-2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelectPreset = (type: string) => {
    const selected = QUALIFICATION_PRESETS.find((p) => p.type === type);
    if (selected) {
      setCredentialType(selected.type);
      setTitle(selected.title);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/credentials/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential_type: credentialType,
          title,
          notes,
          evidence_url: evidenceUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit credential request.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Equipment Catalog
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Request Safety Qualification & Training
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit documentation or request official verification from campus and makerspace safety officers.
        </p>
      </div>

      {submitted ? (
        <Card className="border-emerald-200 bg-emerald-50/50 text-center p-8 space-y-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Qualification Request Submitted!
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Your request for <strong>{title}</strong> has been logged to the verification queue and recorded in the audit trail.
            </p>
          </div>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard/user">
              <Button variant="default" className="gap-2 font-semibold">
                View My Credentials Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="outline" className="font-semibold">
                Return to Catalog
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-indigo-600" />
                  Select Qualification Endorsement
                </CardTitle>
                <Badge variant={isRenewal ? "warning" : isAppeal ? "destructive" : "default"}>
                  {isRenewal ? "Recertification" : isAppeal ? "Appeal Review" : "Initial Training"}
                </Badge>
              </div>
              <CardDescription>
                Choose the required credential you need verified to access high-value hardware.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Standard Safety Tier *
                </label>
                <select
                  value={credentialType}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {QUALIFICATION_PRESETS.map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Official Credential Name / Certificate Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Laser Safety Officer Level 2 Certification"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Verification Notes / Safety Training Evidence *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="State which workshop you attended, exam score, instructor name, or prior operating experience..."
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Evidence Document / LMS Certificate URL (Optional)
                </label>
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Link href="/resources">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>

            <Button type="submit" disabled={loading} className="font-semibold gap-2 px-6">
              {loading ? "Submitting Request..." : "Submit to Staff Verification Queue"}
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}


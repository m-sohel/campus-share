"use client";

import { useState } from "react";
import { Booking, Resource, IncidentType, IncidentSeverity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateIncidentFormProps {
  bookings: Booking[];
  resources: Resource[];
  currentUserId: string;
  initialBookingId?: string;
  initialType?: string;
}

export function CreateIncidentForm({
  bookings,
  resources,
  currentUserId,
  initialBookingId,
  initialType,
}: CreateIncidentFormProps) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState(initialBookingId || (bookings[0]?.id ?? ""));
  const [type, setType] = useState<IncidentType>(
    (initialType as IncidentType) || "damage"
  );
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getResourceName = (resId: string) =>
    resources.find((r) => r.id === resId)?.name || "Resource";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      setErrorMessage("Please select a linked reservation.");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMessage("Description must be at least 10 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          type,
          severity,
          title: title.trim() || undefined,
          description: description.trim(),
          evidence_text: evidenceText.trim() || undefined,
          evidence_url: evidenceUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit incident");
      }

      router.push(`/incidents/${data.incident.id}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Incident Details & Evidence</CardTitle>
        <CardDescription className="text-xs">
          All reports are permanently logged in the chained audit trail. No automatic penalties will be applied.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Booking Select */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Linked Booking / Session:</label>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 font-medium text-slate-800"
            >
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id} — {getResourceName(b.resource_id)} ({b.status.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {/* Type & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">Incident Type:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IncidentType)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
              >
                <option value="damage">Physical Damage</option>
                <option value="late_return">Late Return</option>
                <option value="no_show">No-Show / Unclaimed Slot</option>
                <option value="misuse">Improper Handling / Misuse</option>
                <option value="safety">Safety Protocol Breach</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">Severity Assessment:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
              >
                <option value="low">Low (Cosmetic / Minor Delay)</option>
                <option value="medium">Medium (Requires Calibration / Partial Fault)</option>
                <option value="high">High (Tool Inoperable / Broken Part)</option>
                <option value="critical">Critical (Severe Safety Breach / Total Loss)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Summary Title (Optional):</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scratched front lens element during outdoor field recording"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Detailed Description (Required):</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred, any visible markings or malfunction, and relevant circumstances..."
              className="w-full p-3 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 min-h-[90px]"
              required
            />
          </div>

          {/* Physical Evidence Note */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Physical Evidence Notes (Optional):</label>
            <textarea
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              placeholder="Serial numbers checked, meter readings, or inspection notes..."
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500 min-h-[60px]"
            />
          </div>

          {/* Evidence Image URL */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Photo / Evidence URL (Optional):</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or public image link"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-indigo-500"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 text-xs py-2.5 shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              Submit Incident Report &amp; Log to Audit Trail
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

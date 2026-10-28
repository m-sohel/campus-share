"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Resource, ResourceCategory, ResourceRequirement } from "@/types";
import { ListingCompleteness } from "./ListingCompleteness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  MapPin,
  ShieldAlert,
  Clock,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface ResourceFormProps {
  initialResource?: Partial<Resource>;
  isEditing?: boolean;
}

const CATEGORIES: { label: string; value: ResourceCategory }[] = [
  { label: "Fabrication Equipment", value: "fabrication" },
  { label: "Electronics & Test Devices", value: "electronics" },
  { label: "Media Gear", value: "media" },
  { label: "Labs & Spaces", value: "labs_spaces" },
];

const COMMON_CREDENTIALS = [
  { type: "laser_safety_l2", label: "Laser Safety Officer Level 2" },
  { type: "3d_print_certified", label: "3D Printing Operator Certification" },
  { type: "electronics_lab_safety", label: "High-Voltage & ESD Circuit Safety" },
  { type: "cleanroom_safety", label: "Class 1000 Cleanroom Protocol" },
  { type: "drone_operator_license", label: "Commercial Drone Pilot Endorsement" },
  { type: "cinema_camera_safety", label: "Cinema Rig & Sensor Protection Handling" },
];

export function ResourceForm({ initialResource, isEditing }: ResourceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialResource?.name || "");
  const [category, setCategory] = useState<ResourceCategory>(initialResource?.category || "fabrication");
  const [location, setLocation] = useState(initialResource?.location || "");
  const [institution, setInstitution] = useState<"university" | "makerspace">(
    initialResource?.institution || "university"
  );
  const [description, setDescription] = useState(initialResource?.description || "");
  const [rules, setRules] = useState(
    initialResource?.rules || "Keep workstation clean. Return accessories to designated bins."
  );
  const [safetyNotes, setSafetyNotes] = useState(
    initialResource?.safety_notes || "Eye protection mandatory. Check emergency stop prior to power-on."
  );
  const [requiresSupervision, setRequiresSupervision] = useState(
    initialResource?.requires_supervision ?? false
  );
  const [isHighDemand, setIsHighDemand] = useState(initialResource?.is_high_demand ?? false);
  const [maxDurationHours, setMaxDurationHours] = useState(initialResource?.max_duration_hours || 4);
  const [minLeadTimeHours, setMinLeadTimeHours] = useState(initialResource?.min_lead_time_hours || 2);
  const [depositDollars, setDepositDollars] = useState(
    (initialResource?.deposit_required_cents ? initialResource.deposit_required_cents / 100 : 0) || 0
  );
  const [imageUrl, setImageUrl] = useState(
    initialResource?.image_url ||
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60"
  );

  // Condition Checklist Items
  const [checklist, setChecklist] = useState<string[]>(
    initialResource?.condition_checklist || [
      "No physical cracks, burns, or structural defects",
      "Lens / bed / work surface clean and free of residue",
      "Safety interlocks and emergency stop switch functional",
      "Power cables, differential probes, and adapters present",
    ]
  );
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Requirements
  const [requirements, setRequirements] = useState<
    Array<{ credential_type: string; is_mandatory: boolean; explanation: string }>
  >(
    initialResource?.requirements?.map((r) => ({
      credential_type: r.credential_type,
      is_mandatory: r.is_mandatory,
      explanation: r.explanation,
    })) || [
      {
        credential_type: "3d_print_certified",
        is_mandatory: true,
        explanation: "Required to prevent hot-end jams and ensure slicer profile compatibility.",
      },
    ]
  );
  const [newCredType, setNewCredType] = useState("laser_safety_l2");
  const [newCredExplanation, setNewCredExplanation] = useState("");

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, newChecklistItem.trim()]);
    setNewChecklistItem("");
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleAddRequirement = () => {
    if (!newCredType) return;
    setRequirements([
      ...requirements,
      {
        credential_type: newCredType,
        is_mandatory: true,
        explanation: newCredExplanation.trim() || `Required for safe operation of ${name || "this machine"}.`,
      },
    ]);
    setNewCredExplanation("");
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const previewResource: Partial<Resource> = {
    name,
    category,
    location,
    institution,
    description,
    rules,
    safety_notes: safetyNotes,
    requires_supervision: requiresSupervision,
    max_duration_hours: maxDurationHours,
    image_url: imageUrl,
    condition_checklist: checklist,
    requirements: requirements.map((r, i) => ({
      id: `temp-${i}`,
      resource_id: "temp",
      credential_type: r.credential_type,
      min_experience_hours: 0,
      is_mandatory: r.is_mandatory,
      explanation: r.explanation,
      created_at: new Date().toISOString(),
    })),
    availability_slots: [1, 2, 3, 4, 5].map((d) => ({
      id: `slot-${d}`,
      resource_id: "temp",
      day_of_week: d,
      start_time: "09:00",
      end_time: "18:00",
      slot_interval_minutes: 60,
      created_at: new Date().toISOString(),
    })),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        id: initialResource?.id,
        name,
        category,
        location,
        institution,
        description,
        rules,
        safety_notes: safetyNotes,
        requires_supervision: requiresSupervision,
        is_high_demand: isHighDemand,
        min_lead_time_hours: Number(minLeadTimeHours),
        max_duration_hours: Number(maxDurationHours),
        deposit_required_cents: Math.round(depositDollars * 100),
        image_url: imageUrl,
        condition_checklist: checklist,
        requirements: requirements.map((r, i) => ({
          id: `req-${Date.now()}-${i}`,
          resource_id: initialResource?.id || "new",
          credential_type: r.credential_type,
          min_experience_hours: 0,
          is_mandatory: r.is_mandatory,
          explanation: r.explanation,
          created_at: new Date().toISOString(),
        })),
      };

      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save resource");
      }

      router.push(`/resources/${data.resource.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top Banner & Listing Completeness */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/owner"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Owner Console
          </Link>

          <Badge variant="outline" className="font-semibold text-xs">
            {isEditing ? "Editing Resource" : "New Facility Resource Listing"}
          </Badge>
        </div>

        <ListingCompleteness resource={previewResource} />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic Specs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            1. Core Specifications & Placement
          </CardTitle>
          <CardDescription>
            Identify the tool, its institutional placement, and primary category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Resource Title *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Epilog Fusion Pro 48 Laser Cutter"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Location (Building / Room) *
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. North Engineering Quad, Lab 304"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Host Institution *
              </label>
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value as "university" | "makerspace")}
                className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="university">University Campus Facility</option>
                <option value="makerspace">Community Partner Makerspace</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe machine specifications, supported materials, lenses, firmware version, and typical use cases..."
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Rules, Safety & Supervision */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            2. Rules, Safety Notes & Booking Policies
          </CardTitle>
          <CardDescription>
            Transparent rules shown to borrowers before access is approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Operational Usage Rules *
              </label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={3}
                placeholder="e.g. No PVC or toxic vinyls. Clean optical lens before every cut. Reset bed height..."
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Safety Notes & Protective Gear *
              </label>
              <textarea
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Safety goggles with OD5+ rating required. Exhaust damper must be engaged..."
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Min Advance Notice (Hours)
              </label>
              <Input
                type="number"
                min={0}
                max={72}
                value={minLeadTimeHours}
                onChange={(e) => setMinLeadTimeHours(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Max Duration per Session (Hours)
              </label>
              <Input
                type="number"
                min={1}
                max={24}
                value={maxDurationHours}
                onChange={(e) => setMaxDurationHours(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Deposit or Credit Cost ($)
              </label>
              <Input
                type="number"
                min={0}
                step={5}
                value={depositDollars}
                onChange={(e) => setDepositDollars(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresSupervision}
                onChange={(e) => setRequiresSupervision(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-xs font-semibold text-slate-800">
                Requires Staff / Technician Supervision during use
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isHighDemand}
                onChange={(e) => setIsHighDemand(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-xs font-semibold text-slate-800">
                High-Demand Equipment (triggers anti-monopoly fair-share rules)
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications & Eligibility Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            3. Required Safety Qualifications
          </CardTitle>
          <CardDescription>
            The automated eligibility engine enforces these qualifications before letting users request access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requirements.length > 0 ? (
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 capitalize">
                        {req.credential_type.replace(/_/g, " ")}
                      </span>
                      <Badge variant={req.is_mandatory ? "destructive" : "secondary"} className="text-[9px]">
                        {req.is_mandatory ? "Mandatory Prerequisite" : "Recommended"}
                      </Badge>
                    </div>
                    <p className="text-slate-600">{req.explanation}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRequirement(idx)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No prerequisites configured. Any registered user will be immediately eligible.
            </p>
          )}

          {/* Add requirement form */}
          <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
            <span className="text-xs font-bold text-indigo-950 block">
              Add Qualification Requirement:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <select
                  value={newCredType}
                  onChange={(e) => setNewCredType(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  {COMMON_CREDENTIALS.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-6">
                <Input
                  value={newCredExplanation}
                  onChange={(e) => setNewCredExplanation(e.target.value)}
                  placeholder="Explain WHY this qualification is necessary..."
                  className="h-9 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRequirement}
                  className="w-full h-9 text-xs font-semibold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 7 & 8 Inspection Condition Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            4. Handover Condition Checklist
          </CardTitle>
          <CardDescription>
            These specific checkpoints are recorded by technicians during Check-In (Step 7) and Return (Step 8) to prevent damage disputes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800">{item}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveChecklistItem(idx)}
                  className="text-slate-400 hover:text-rose-600 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder="e.g. Lens clean, no scratches on build plate, sensor cover attached..."
              className="h-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddChecklistItem}
              className="h-9 text-xs font-semibold gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Checkpoint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Photo URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            5. Resource Photo
          </CardTitle>
          <CardDescription>
            Provide a clear photo URL representing the hardware station.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Image URL
            </label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {imageUrl && (
            <div className="relative h-48 w-full max-w-md rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                className="h-full w-full object-cover"
                onError={() => {}}
              />
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] backdrop-blur">
                Image Preview
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link href="/dashboard/owner">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>

        <Button type="submit" disabled={loading} className="font-semibold px-6 gap-2">
          {loading ? "Publishing to Network..." : isEditing ? "Save & Update Resource" : "Publish Resource Listing"}
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}


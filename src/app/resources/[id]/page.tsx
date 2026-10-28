import { notFound } from "next/navigation";
import Link from "next/link";
import { getResourceById, getCredentials } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { checkEligibility } from "@/lib/rules/eligibility";
import { ListingCompleteness } from "@/components/resources/ListingCompleteness";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  Edit,
  ClipboardCheck,
  Calendar,
  Sparkles,
  ArrowLeft,
  DollarSign,
  AlertCircle,
} from "lucide-react";

interface ResourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { id } = await params;
  const resource = await getResourceById(id);

  if (!resource) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const userCredentials = currentUser ? await getCredentials(currentUser.id) : [];

  const eligibility = checkEligibility(resource.requirements || [], userCredentials);
  const isOwnerOrAdmin = currentUser && (currentUser.role === "admin" || currentUser.id === resource.owner_id);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Equipment Catalog
        </Link>

        {isOwnerOrAdmin && (
          <Link href={`/resources/${resource.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <Edit className="w-3.5 h-3.5" />
              Edit Resource Specifications
            </Button>
          </Link>
        )}
      </div>

      {/* Owner completeness indicator */}
      {isOwnerOrAdmin && (
        <ListingCompleteness resource={resource} />
      )}

      {/* Header Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Photo & Quick Specs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resource.image_url || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800"}
              alt={resource.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/95 text-slate-900 backdrop-blur font-bold uppercase text-[10px]">
                {resource.category.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="bg-black/50 text-white border-0 text-[10px] capitalize">
                {resource.institution}
              </Badge>
            </div>
            {resource.is_high_demand && (
              <div className="absolute top-3 right-3">
                <Badge variant="destructive" className="font-bold text-[10px] uppercase shadow-md">
                  High Demand Resource
                </Badge>
              </div>
            )}
          </div>

          {/* Quick Details Box */}
          <Card>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Facility Location:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {resource.location}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Max Reservation Window:</span>
                <span className="font-semibold text-slate-900">{resource.max_duration_hours} Hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Minimum Advance Notice:</span>
                <span className="font-semibold text-slate-900">{resource.min_lead_time_hours} Hours Lead</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Security Deposit / Fee:</span>
                <span className="font-semibold text-slate-900">
                  {resource.deposit_required_cents > 0
                    ? `$${(resource.deposit_required_cents / 100).toFixed(2)} refundable deposit`
                    : "Free for verified members"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Technician Supervision:</span>
                <span className="font-semibold text-slate-900">
                  {resource.requires_supervision ? "Mandatory Staff Presence" : "Self-Operated (with Cert)"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info & Live Eligibility Engine Card */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {resource.name}
            </h1>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              {resource.description}
            </p>
          </div>

          {/* THE ELIGIBILITY ENGINE CARD */}
          <Card className={`border-2 transition shadow-sm ${
            eligibility.isEligible ? "border-emerald-300 bg-emerald-50/20" : "border-amber-300 bg-amber-50/20"
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className={`w-5 h-5 ${eligibility.isEligible ? "text-emerald-600" : "text-amber-600"}`} />
                  Requirement & Eligibility Engine
                </CardTitle>
                <Badge variant={eligibility.isEligible ? "success" : "warning"} className="font-bold">
                  {eligibility.isEligible ? "Qualified to Book" : "Prerequisites Required"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Evaluated against the active credentials of{" "}
                <strong>{currentUser ? currentUser.full_name : "Guest Visitor"}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Summary Explanation */}
              <div className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                eligibility.isEligible
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-amber-50 text-amber-900 border-amber-200"
              }`}>
                {eligibility.isEligible ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">Eligibility Result:</span>
                  <span>{eligibility.summary}</span>
                </div>
              </div>

              {/* Individual Requirement Checks */}
              {eligibility.checks.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    Qualification Checklist & Status:
                  </span>
                  {eligibility.checks.map((c, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {c.status === "pass" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {c.status === "fail" && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                          {c.status === "expired" && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          {c.status === "pending-verification" && <Clock className="w-4 h-4 text-blue-600 shrink-0" />}

                          <span className="font-semibold text-slate-900 capitalize">
                            {c.requirement.credential_type.replace(/_/g, " ")}
                          </span>
                        </div>

                        <Badge
                          variant={
                            c.status === "pass"
                              ? "success"
                              : c.status === "expired"
                              ? "warning"
                              : c.status === "pending-verification"
                              ? "secondary"
                              : "destructive"
                          }
                          className="uppercase text-[9px] font-bold"
                        >
                          {c.status}
                        </Badge>
                      </div>

                      {/* Plain-Language Reason */}
                      <p className="text-slate-600 pl-6 leading-relaxed">
                        {c.reason}
                      </p>

                      {/* How To Fix Button */}
                      {c.fixAction && (
                        <div className="pl-6 pt-1 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 italic">
                            {c.fixAction.description}
                          </span>
                          <Link href={c.fixAction.actionUrl}>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                              {c.fixAction.label} &rarr;
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  This station has no safety prerequisite restrictions. Any verified community member can request access.
                </div>
              )}

              {/* REQUEST BOOKING ACTION BUTTON */}
              <div className="pt-2">
                {currentUser ? (
                  eligibility.isEligible ? (
                    <div className="space-y-2">
                      <Link href={`/bookings/new?resource_id=${resource.id}`} className="block">
                        <Button className="w-full font-semibold h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Proceed to Request Booking (Slot Picker)
                        </Button>
                      </Link>
                      <p className="text-center text-[11px] text-slate-500">
                        You meet all qualifications. Your request will be routed to the equipment owner for review.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        disabled
                        className="w-full font-semibold h-11 opacity-60 cursor-not-allowed bg-slate-300 text-slate-700 gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Request Booking Blocked
                      </Button>
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-800 text-xs text-center">
                        <strong>Action Required:</strong> Resolve the missing or expired credentials listed above before requesting this resource.
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <Link href="/login" className="block">
                      <Button className="w-full font-semibold h-11 bg-indigo-600 hover:bg-indigo-700 gap-2">
                        Sign In to Prove Eligibility & Request Booking
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Operational Rules & Safety Guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Usage Rules & Code of Conduct
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 leading-relaxed">
                {resource.rules}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Safety Protocols & PPE
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 leading-relaxed">
                {resource.safety_notes || "Safety glasses and closed-toe shoes mandatory during operation."}
              </CardContent>
            </Card>
          </div>

          {/* Handover Condition Checklist (Step 7 & 8 Transparency) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                Physical Inspection Checklist (Step 7 Check-in & Step 8 Return)
              </CardTitle>
              <CardDescription className="text-xs">
                These items are logged before and after your reservation to protect both parties from unwarranted damage claims.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {(resource.condition_checklist || [
                  "Chassis and structural integrity",
                  "Optical lenses or build plate clean",
                  "Safety interlock operational",
                  "Accessories and cables accounted for",
                ]).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


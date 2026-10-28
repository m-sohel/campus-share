import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/role-guard";
import {
  getIncidentById,
  getBookingById,
  getResourceById,
  getUserById,
} from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ShieldAlert,
  ArrowLeft,
  Clock,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  FileText,
  Scale,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { IncidentTimeline } from "@/components/incidents/IncidentTimeline";
import { IncidentActionPanel } from "@/components/incidents/IncidentActionPanel";
import { DemoClockControl } from "@/components/clock/DemoClockControl";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncidentById(id);

  if (!incident) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const booking = await getBookingById(incident.booking_id);
  const resource = booking ? await getResourceById(booking.resource_id) : null;
  const reporter = getUserById(incident.reporter_id);
  const borrower = getUserById(incident.affected_user_id || booking?.user_id || "");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="warning">Draft Intake</Badge>;
      case "open":
        return <Badge variant="default" className="bg-indigo-600 text-white">Open for Investigation</Badge>;
      case "under_review":
        return <Badge variant="outline" className="border-indigo-400 text-indigo-700 bg-indigo-50">Under Review</Badge>;
      case "disputed":
        return <Badge variant="destructive">Disputed Appeal</Badge>;
      case "resolved":
        return <Badge variant="success">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="uppercase text-[9px] font-bold">Critical</Badge>;
      case "high":
        return <Badge variant="destructive" className="uppercase text-[9px] font-bold bg-rose-500">High</Badge>;
      case "medium":
        return <Badge variant="warning" className="uppercase text-[9px] font-bold">Medium</Badge>;
      default:
        return <Badge variant="secondary" className="uppercase text-[9px] font-bold">Low</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incident Governance
          </Link>

          <DemoClockControl compact />
        </div>

        {/* Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusBadge(incident.status)}
                {getSeverityBadge(incident.severity)}
                <span className="text-[11px] font-mono text-slate-400">#{incident.id}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {incident.title || `${incident.type.replace("_", " ").toUpperCase()}: ${resource?.name || "Incident"}`}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  {resource?.name || "Equipment Station"} ({resource?.location})
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Borrower: <strong>{borrower?.full_name || incident.affected_user_name || "Borrower"}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Filed {new Date(incident.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {booking && (
                <Link href={`/bookings/${booking.id}`}>
                  <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    View Booking Pass
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: Details & Actions (Left) + Timeline (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Action Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Physical Evidence Card */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  Physical Evidence & Intake Description
                </CardTitle>
                <CardDescription className="text-xs">
                  Reported by {reporter?.full_name || incident.reporter_name || "Technician"} ({reporter?.role || "Staff"})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {incident.description}
                </div>

                {incident.evidence_text && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">Physical Inspection Notes:</span>
                    <p className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 leading-relaxed">
                      {incident.evidence_text}
                    </p>
                  </div>
                )}

                {incident.evidence_url && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Attached Photo Evidence:
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-64 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={incident.evidence_url}
                        alt="Incident Evidence"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Borrower Statement Display (if submitted) */}
            {incident.user_response && (
              <Card className="border-indigo-200 bg-indigo-50/30 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    Borrower Formal Statement
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Submitted {incident.user_response_at ? new Date(incident.user_response_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "recently"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs">
                  <p className="p-3 rounded-lg bg-white border border-indigo-100 text-slate-800 leading-relaxed italic">
                    &quot;{incident.user_response}&quot;
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Manager Decision Display (if decided) */}
            {incident.manager_decision && (
              <Card className="border-indigo-300 bg-white shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      Station Manager Operational Finding
                    </CardTitle>
                    <Badge variant="outline" className="border-indigo-500 text-indigo-700 bg-indigo-50 font-bold uppercase text-[9px]">
                      {incident.manager_decision.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Decided by {incident.decided_by ? getUserById(incident.decided_by)?.full_name || "Manager" : "Station Manager"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                    {incident.manager_notes}
                  </p>
                  {incident.penalty_applied && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <strong>Remedy / Terms:</strong> {incident.penalty_applied}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* User Dispute Appeal Display (if disputed) */}
            {incident.dispute_reason && (
              <Card className="border-rose-300 bg-rose-50/40 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Formal Dispute Appeal Filed
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-700">
                    Escalated to Campus Administrator for independent binding arbitration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs">
                  <p className="p-3 rounded-lg bg-white border border-rose-200 text-slate-800 leading-relaxed italic">
                    &quot;{incident.dispute_reason}&quot;
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Admin Final Arbitration Display (if resolved by admin) */}
            {incident.admin_resolution && (
              <Card className="border-emerald-300 bg-emerald-50/50 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Campus Governance Final Arbitration
                    </CardTitle>
                    <Badge variant="success" className="uppercase text-[9px] font-bold">
                      {incident.admin_resolution}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-emerald-700">
                    Issued by Campus Administrator (Dr. Arthur Vance) • Binding Council Ruling
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p className="p-3 rounded-lg bg-white border border-emerald-200 text-slate-800 leading-relaxed">
                    {incident.admin_notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Interactive Action Panel (Role-based Next Step) */}
            <IncidentActionPanel
              incident={incident}
              currentUserId={currentUser?.id || ""}
              currentUserRole={currentUser?.role || "user"}
            />
          </div>

          {/* Right Column: Auditable Timeline */}
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-xs sticky top-6">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Tamper-Evident Incident Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  All actions write to the cryptographically chained SHA-256 audit trail.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <IncidentTimeline
                  events={incident.timeline || []}
                  currentStatus={incident.status}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


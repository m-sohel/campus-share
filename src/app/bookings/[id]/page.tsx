import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/role-guard";
import {
  getBookingById,
  getResourceById,
  getUserById,
  getConditionRecords,
  getIncidents,
  getAuditLogs,
} from "@/lib/data/store";
import { BookingQRCode } from "@/components/bookings/BookingQRCode";
import { ConditionDiffViewer } from "@/components/bookings/ConditionDiffViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  ShieldAlert,
  History,
  Hash,
} from "lucide-react";
import { DemoClockControl } from "@/components/clock/DemoClockControl";

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkedIn?: string; returned?: string }>;
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: BookingDetailPageProps) {
  const { id } = await params;
  const { checkedIn, returned } = await searchParams;
  const user = await getCurrentUser();

  const booking = await getBookingById(id);
  if (!booking) {
    notFound();
  }

  const resource = await getResourceById(booking.resource_id);
  if (!resource) {
    notFound();
  }

  const borrower = getUserById(booking.user_id);
  const conditionRecords = await getConditionRecords(booking.id);
  const initialRecord = conditionRecords.find((c) => c.stage === "check_in") || null;
  const returnRecord = conditionRecords.find((c) => c.stage === "return") || null;

  const incidents = await getIncidents();
  const linkedIncident = incidents.find((i) => i.booking_id === booking.id) || null;

  const allLogs = getAuditLogs();
  const bookingLogs = allLogs.filter((l) => l.resource_id === booking.id || (linkedIncident && l.resource_id === linkedIncident.id));

  return (
    <div className="min-h-screen bg-dusty-olive-50/40 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Clock */}
        <div className="flex items-center justify-between">
          <Link
            href="/bookings"
            className="text-xs font-semibold text-dusty-olive-600 hover:text-dusty-olive-950 transition-colors"
          >
            &larr; Back to Handover Desk
          </Link>
          <DemoClockControl compact />
        </div>

        {/* Success Banners if just performed action */}
        {checkedIn === "true" && (
          <div className="rounded-2xl border border-celadon-300 bg-celadon-50 p-4 text-celadon-950 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-celadon-700 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Step 7 Check-in Signed Off!</span> Equipment handed over. Resource is now marked <strong>In Use</strong>.
              </div>
            </div>
            <Badge variant="success" className="text-[10px] uppercase font-bold">In Use</Badge>
          </div>
        )}

        {returned === "true" && (
          <div className="rounded-2xl border border-soft-celadon-300 bg-soft-celadon-50 p-4 text-soft-celadon-950 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="w-5 h-5 text-celadon-700 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Step 8 Return Inspection Complete!</span> Condition diff evaluated and logged to audit trail.
              </div>
            </div>
            <Badge variant="default" className="text-[10px] uppercase font-bold">Recorded</Badge>
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dusty-olive-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-dusty-olive-500 uppercase">Reservation</span>
                <span className="text-xs font-mono font-bold text-dusty-olive-900">#{booking.id}</span>
                <StatusBadge status={booking.status} />
              </div>
              <h1 className="text-2xl font-bold text-dusty-olive-950 mt-1">{resource.name}</h1>
              <p className="text-xs sm:text-sm text-dusty-olive-600 mt-0.5">
                {resource.location} • <span className="capitalize">{resource.category.replace("_", " ")}</span>
              </p>
            </div>

            {/* Context Action Button for Technicians / Managers */}
            <div className="flex items-center gap-2">
              {booking.status === "approved" && (
                <Link href={`/bookings/${booking.id}/check-in`}>
                  <Button className="bg-celadon-700 hover:bg-celadon-800 text-white gap-1.5 shadow-xs font-bold text-xs">
                    <ClipboardCheck className="w-4 h-4" />
                    Start Step 7 Check-in
                  </Button>
                </Link>
              )}

              {booking.status === "in_use" && (
                <Link href={`/bookings/${booking.id}/return`}>
                  <Button className="bg-muted-teal-700 hover:bg-muted-teal-800 text-white gap-1.5 shadow-xs font-bold text-xs">
                    <ClipboardCheck className="w-4 h-4" />
                    Process Step 8 Return
                  </Button>
                </Link>
              )}

              <Link href="/bookings">
                <Button variant="outline" size="sm" className="text-xs">
                  All Bookings
                </Button>
              </Link>
            </div>
          </div>

          {/* Stepper Progress Visualizer */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-dusty-olive-700 uppercase tracking-wider block">
              10-Step Lifecycle Progress
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <StepIndicator step={6} title="Review" active={false} completed={true} />
              <StepIndicator
                step={7}
                title="Check-in Handover"
                active={booking.status === "approved"}
                completed={booking.status !== "approved" && Boolean(initialRecord)}
              />
              <StepIndicator
                step={8}
                title="Return Inspection"
                active={booking.status === "in_use"}
                completed={booking.status === "returned" || booking.status === "flagged_incident" || booking.status === "completed"}
              />
              <StepIndicator
                step={9}
                title="Incident Handling"
                active={booking.status === "flagged_incident"}
                completed={booking.status === "completed"}
              />
            </div>
          </div>

          {/* Reservation Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-dusty-olive-50/70 border border-dusty-olive-200/80 text-xs">
            <div className="space-y-1">
              <span className="text-dusty-olive-500 font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-celadon-700" /> Borrower &amp; Team:
              </span>
              <p className="font-bold text-dusty-olive-950">{borrower?.full_name || "Sarah Jenkins"}</p>
              <p className="text-dusty-olive-600">{borrower?.department || borrower?.email}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-celadon-800 font-semibold">
                <ShieldCheck className="w-3 h-3" /> Rep: {borrower?.reputation_score ?? 95}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-dusty-olive-500 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-celadon-700" /> Reservation Slot:
              </span>
              <p className="font-bold text-dusty-olive-950">
                {new Date(booking.start_time).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-dusty-olive-600">
                {new Date(booking.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                {new Date(booking.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <span className="text-[11px] text-dusty-olive-500 font-mono">Fairness Score: {booking.fairness_score}/10</span>
            </div>

            <div className="space-y-1">
              <span className="text-dusty-olive-500 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-celadon-700" /> Purpose:
              </span>
              <p className="text-dusty-olive-800 italic leading-relaxed">
                &quot;{booking.purpose}&quot;
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Pass (if approved) */}
        {booking.status === "approved" && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-dusty-olive-950">Digital Handover Pass &amp; QR</h2>
            <BookingQRCode
              bookingId={booking.id}
              resourceName={resource.name}
            />
          </div>
        )}

        {/* Condition Diff & Records Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-dusty-olive-950 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-celadon-700" />
                Condition Records &amp; Inspection Diff
              </h2>
              <p className="text-xs text-dusty-olive-500 mt-0.5">
                Side-by-side comparison between check-in baseline (Step 7) and return condition (Step 8).
              </p>
            </div>
          </div>

          <ConditionDiffViewer
            initialRecord={initialRecord}
            returnRecord={returnRecord}
            linkedIncident={linkedIncident}
          />
        </div>

        {/* Audit Trail History */}
        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dusty-olive-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-celadon-700" />
              <h3 className="font-bold text-sm text-dusty-olive-950">
                Cryptographic Audit Trail (Step 10)
              </h3>
            </div>
            <span className="text-[11px] text-dusty-olive-500 font-mono">
              SHA-256 Chained Integrity
            </span>
          </div>

          {bookingLogs.length === 0 ? (
            <div className="text-xs text-dusty-olive-500 italic p-3 bg-dusty-olive-50 rounded-xl">
              Check-in and return events will append immutable SHA-256 chained audit entries here.
            </div>
          ) : (
            <div className="space-y-2.5">
              {bookingLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-dusty-olive-200 bg-dusty-olive-50/60 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold">
                        {log.action}
                      </Badge>
                      <span className="text-dusty-olive-600">by {log.actor_role}</span>
                    </div>
                    <span className="text-[11px] text-dusty-olive-500">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-dusty-olive-900 font-medium">{log.reason}</p>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-dusty-olive-400 pt-1 border-t border-dusty-olive-200/60">
                    <Hash className="w-3 h-3 text-dusty-olive-400" />
                    <span className="truncate">Hash: {log.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="success" className="uppercase font-bold text-[10px]">
          Approved (Ready for Handover)
        </Badge>
      );
    case "in_use":
      return (
        <Badge variant="teal" className="uppercase font-bold text-[10px]">
          In Use (Active)
        </Badge>
      );
    case "returned":
      return (
        <Badge variant="default" className="uppercase font-bold text-[10px]">
          Returned (Clean)
        </Badge>
      );
    case "flagged_incident":
      return (
        <Badge variant="destructive" className="uppercase font-bold text-[10px]">
          Flagged Incident (Draft)
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="secondary" className="uppercase font-bold text-[10px]">
          Completed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="uppercase text-[10px]">{status}</Badge>;
  }
}

function StepIndicator({
  step,
  title,
  active,
  completed,
}: {
  step: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`p-2.5 rounded-xl border transition-colors ${
        active
          ? "border-celadon-600 bg-celadon-50/70 text-celadon-950 font-bold ring-2 ring-celadon-200"
          : completed
          ? "border-soft-celadon-300 bg-soft-celadon-50/60 text-soft-celadon-950"
          : "border-dusty-olive-200 bg-white text-dusty-olive-400"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
            active
              ? "bg-celadon-700 text-white"
              : completed
              ? "bg-celadon-600 text-white"
              : "bg-dusty-olive-200 text-dusty-olive-600"
          }`}
        >
          {completed ? "✓" : step}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider">Step {step}</span>
      </div>
      <p className="text-xs truncate">{title}</p>
    </div>
  );
}

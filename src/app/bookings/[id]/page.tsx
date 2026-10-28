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

  // Determine role permissions
  const isStaff = user?.role === "manager" || user?.role === "owner" || user?.role === "admin";
  const isBorrower = user?.id === booking.user_id;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Success Banners if just performed action */}
        {checkedIn === "true" && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Step 7 Check-in Signed Off!</span> Equipment handed over. Resource is now marked <strong>In Use</strong>.
              </div>
            </div>
            <Badge variant="success" className="text-[10px] uppercase font-bold">In Use</Badge>
          </div>
        )}

        {returned === "true" && (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-950 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Step 8 Return Inspection Complete!</span> Condition diff evaluated and logged to audit trail.
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">Recorded</Badge>
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-slate-500 uppercase">Reservation</span>
                <span className="text-xs font-mono font-bold text-slate-900">#{booking.id}</span>
                <StatusBadge status={booking.status} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{resource.name}</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {resource.location} • <span className="capitalize">{resource.category.replace("_", " ")}</span>
              </p>
            </div>

            {/* Context Action Button for Technicians / Managers */}
            <div className="flex items-center gap-2">
              {booking.status === "approved" && (
                <Link href={`/bookings/${booking.id}/check-in`}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                    <ClipboardCheck className="w-4 h-4" />
                    Start Step 7 Check-in
                  </Button>
                </Link>
              )}

              {booking.status === "in_use" && (
                <Link href={`/bookings/${booking.id}/return`}>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm">
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
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Borrower & Team:
              </span>
              <p className="font-bold text-slate-900">{borrower?.full_name || "Sarah Jenkins"}</p>
              <p className="text-slate-600">{borrower?.department || borrower?.email}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <ShieldCheck className="w-3 h-3" /> Rep: {borrower?.reputation_score ?? 95}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> Reservation Slot:
              </span>
              <p className="font-bold text-slate-900">
                {new Date(booking.start_time).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-slate-600">
                {new Date(booking.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                {new Date(booking.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <span className="text-[11px] text-slate-500">Fairness Score: {booking.fairness_score}/10</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Purpose:
              </span>
              <p className="text-slate-800 italic leading-relaxed">
                &quot;{booking.purpose}&quot;
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Pass (if approved) */}
        {booking.status === "approved" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Digital Handover Pass & QR</h2>
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
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                Condition Records & Inspection Diff
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
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

        {/* Audit Trail History (Step 10 Full Lifecycle Visibility) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Cryptographic Audit Trail (Step 10)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              SHA-256 Chained Integrity
            </span>
          </div>

          {bookingLogs.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
              Check-in and return events will append immutable SHA-256 chained audit entries here.
            </div>
          ) : (
            <div className="space-y-2.5">
              {bookingLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold">
                        {log.action}
                      </Badge>
                      <span className="text-slate-600">by {log.actor_role}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium">{log.reason}</p>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/60">
                    <Hash className="w-3 h-3 text-slate-400" />
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
        <Badge variant="default" className="bg-indigo-600 uppercase font-bold text-[10px]">
          In Use (Active)
        </Badge>
      );
    case "returned":
      return (
        <Badge variant="success" className="uppercase font-bold text-[10px]">
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
      className={`p-2.5 rounded-xl border transition ${
        active
          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold"
          : completed
          ? "border-emerald-300 bg-emerald-50/40 text-emerald-950"
          : "border-slate-200 bg-white text-slate-400"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
            active
              ? "bg-indigo-600 text-white"
              : completed
              ? "bg-emerald-600 text-white"
              : "bg-slate-200 text-slate-500"
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

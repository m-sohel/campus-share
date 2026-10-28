import { requireRole } from "@/lib/auth/role-guard";
import {
  getAllBookings,
  getAllResources,
  getIncidents,
  getUserById,
  calculateResourceUtilization,
} from "@/lib/data/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  CheckCircle2,
  ClipboardCheck,
  Building2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Percent,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingReviewCard } from "@/components/bookings/BookingReviewCard";

export default async function ManagerDashboard() {
  const user = await requireRole(["manager", "admin"]);

  const allResources = await getAllResources();

  // Resources assigned to this technician / manager
  const assignedResources =
    user.role === "admin"
      ? allResources
      : allResources.filter((r) => r.manager_id === user.id);

  const assignedResourceIds = new Set(assignedResources.map((r) => r.id));

  const allBookings = await getAllBookings();
  const incidents = await getIncidents();

  // Pending reviews delegated to this manager
  const pendingReviews = allBookings.filter(
    (b) => (b.status === "pending_review" || b.status === "waitlisted") && (user.role === "admin" || assignedResourceIds.has(b.resource_id))
  );

  // Active Handovers (Steps 7 & 8)
  const activeHandovers = allBookings.filter(
    (b) => (b.status === "approved" || b.status === "in_use") && (user.role === "admin" || assignedResourceIds.has(b.resource_id))
  );

  // Incidents
  const openIncidents = incidents.filter(
    (inc) => inc.status === "draft" || inc.status === "under_review" || inc.status === "reported"
  );

  // Utilisation metrics
  const utilizations = await Promise.all(
    assignedResources.map(async (res) => {
      const util = await calculateResourceUtilization(res.id);
      return { resource: res, ...util };
    })
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl font-bold">
              <Wrench className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.full_name}</h1>
                <Badge variant="warning" className="uppercase text-xs font-bold bg-amber-400 text-slate-950 border-0">
                  Manager & Technician Desk
                </Badge>
              </div>
              <p className="text-amber-100 text-sm mt-1">
                {user.department} • <span className="capitalize">{user.affiliation}</span> Custody
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/judge">
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                Judge Script
              </Button>
            </Link>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-amber-200 block font-semibold">
                Stations Supervised
              </span>
              <span className="text-2xl font-extrabold text-white">
                {assignedResources.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Responsibilities Alert */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
        <ClipboardCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-amber-950">
            Physical Inspection & Handover Protocol (Steps 7 & 8)
          </strong>
          <p className="text-amber-800 leading-relaxed">
            As designated technician, you execute Step 7 (initial condition sign-off at check-in) and Step 8 (return inspection). Any variance detected during return automatically creates a Draft incident for review with zero automated penalties.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Awaiting Check-in
          </span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">
            {activeHandovers.filter((b) => b.status === "approved").length}
          </span>
          <span className="text-[11px] text-slate-500">Step 7 Handover ready</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            In-Use / Return Due
          </span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {activeHandovers.filter((b) => b.status === "in_use").length}
          </span>
          <span className="text-[11px] text-slate-500">Step 8 Return inspection</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Draft Incidents
          </span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
            {openIncidents.length}
          </span>
          <span className="text-[11px] text-slate-500">Variance review</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Pending Reviews
          </span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
            {pendingReviews.length}
          </span>
          <span className="text-[11px] text-slate-500">Delegated approval queue</span>
        </div>
      </div>

      {/* Step 6 Delegated Approvals Queue if any */}
      {pendingReviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Delegated Reservation Approvals (Step 6)
              </h2>
              <p className="text-xs text-slate-500">
                Facility requests assigned to your supervision desk awaiting decision.
              </p>
            </div>
            <Badge variant="warning">{pendingReviews.length} Pending</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map((b) => {
              const res = allResources.find((r) => r.id === b.resource_id);
              const borrower = getUserById(b.user_id);
              return (
                <BookingReviewCard
                  key={b.id}
                  booking={b}
                  resource={res}
                  borrower={borrower}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Active Handover & Return Queue (Steps 7 & 8) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Active Handover & Return Queue (Steps 7 & 8)
            </h2>
            <p className="text-xs text-slate-500">
              Approved bookings ready for check-in and active sessions ready for return diff inspection.
            </p>
          </div>
          <Link href="/bookings">
            <Button variant="outline" size="sm" className="text-xs">
              All Bookings
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeHandovers.map((b) => {
            const res = allResources.find((r) => r.id === b.resource_id);
            const isApproved = b.status === "approved";

            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isApproved ? "success" : "default"}
                      className={`text-[10px] uppercase font-bold ${
                        !isApproved ? "bg-indigo-600" : ""
                      }`}
                    >
                      {isApproved ? "Step 7: Ready for Check-in" : "Step 8: In Use / Awaiting Return"}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-400">#{b.id}</span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">{res?.name || "Equipment"}</h3>
                  <p className="text-xs text-slate-500">{res?.location}</p>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Slot: {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-600 italic">&quot;{b.purpose}&quot;</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    Details & Diff <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {isApproved ? (
                    <Link href={`/bookings/${b.id}/check-in`}>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Execute Check-in
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/bookings/${b.id}/return`}>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Execute Return
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open Incidents (Step 9) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Open Incidents & Condition Diff Reviews (Step 9)
            </h2>
            <p className="text-xs text-slate-500">
              Condition degradation flagged by algorithm. Awaiting human technician inspection and sign-off.
            </p>
          </div>
          <Badge variant="destructive">{openIncidents.length} Draft Incidents</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openIncidents.map((inc) => (
            <div
              key={inc.id}
              className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/50 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge variant="warning" className="text-[10px] uppercase font-bold bg-amber-200 text-amber-950">
                  Status: {inc.status} • Severity: {inc.severity}
                </Badge>
                <span className="text-[10px] font-mono text-slate-400">ID: {inc.id}</span>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                {inc.description}
              </p>

              <div className="text-[11px] text-amber-900 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <strong>Zero Automated Penalties:</strong> Technician reviews physical equipment before assessing repair fees or waivers.
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-amber-200/60">
                <span className="text-slate-500 font-mono">Booking: #{inc.booking_id}</span>
                <Link
                  href={`/incidents/${inc.id}`}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  Manage Incident &amp; Decisions <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Utilisation Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" />
            Station Capacity & Utilisation
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {utilizations.map(({ resource, percentage, label }) => (
            <div key={resource.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px] uppercase font-bold">
                  {resource.category.replace("_", " ")}
                </Badge>
                <span className="font-extrabold text-sm text-slate-900">{percentage}%</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 truncate">{resource.name}</h4>

              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      percentage >= 80 ? "bg-rose-500" : percentage >= 50 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

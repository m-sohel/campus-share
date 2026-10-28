import { requireRole } from "@/lib/auth/role-guard";
import {
  getAllBookings,
  getAllResources,
  getIncidents,
  getUserById,
  calculateResourceUtilization,
} from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  ClipboardCheck,
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
      <div className="rounded-3xl bg-gradient-to-r from-dusty-olive-950 via-soft-celadon-950 to-muted-teal-950 text-white p-6 sm:p-8 shadow-md border border-celadon-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-tea-green-300 text-2xl font-bold">
              <Wrench className="w-8 h-8 text-tea-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
                <Badge variant="accent" className="uppercase text-xs font-bold border-0">
                  Manager &amp; Technician Desk
                </Badge>
              </div>
              <p className="text-dusty-olive-300 text-sm mt-1">
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
            <div className="bg-white/10 backdrop-blur rounded-2xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-dusty-olive-300 block font-semibold">
                Stations Supervised
              </span>
              <span className="text-2xl font-extrabold text-tea-green-400">
                {assignedResources.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Responsibilities Alert */}
      <div className="rounded-2xl border border-celadon-300 bg-celadon-50/70 p-4 text-celadon-950 text-xs sm:text-sm flex items-start gap-3">
        <ClipboardCheck className="w-5 h-5 text-celadon-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-celadon-950">
            Physical Inspection &amp; Handover Protocol (Steps 7 &amp; 8)
          </strong>
          <p className="text-celadon-900 leading-relaxed text-xs">
            As designated technician, you execute Step 7 (initial condition sign-off at check-in) and Step 8 (return inspection). Any variance detected during return automatically creates a Draft incident for review with zero automated penalties.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Awaiting Check-in
          </span>
          <span className="text-2xl font-extrabold text-celadon-700 mt-1 block">
            {activeHandovers.filter((b) => b.status === "approved").length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Step 7 Handover ready</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            In-Use / Return Due
          </span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {activeHandovers.filter((b) => b.status === "in_use").length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Step 8 Return inspection</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Draft Incidents
          </span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
            {openIncidents.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Variance review</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Pending Reviews
          </span>
          <span className="text-2xl font-extrabold text-muted-teal-700 mt-1 block">
            {pendingReviews.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Delegated approval queue</span>
        </div>
      </div>

      {/* Step 6 Delegated Approvals Queue if any */}
      {pendingReviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Delegated Reservation Approvals (Step 6)
              </h2>
              <p className="text-xs text-dusty-olive-600">
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
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-celadon-700" />
              Active Handover &amp; Return Queue (Steps 7 &amp; 8)
            </h2>
            <p className="text-xs text-dusty-olive-600">
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
                className="p-5 rounded-2xl border border-dusty-olive-200/90 bg-white hover:border-celadon-400 shadow-xs flex flex-col justify-between space-y-4 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isApproved ? "success" : "teal"}
                      className="text-[10px] uppercase font-bold"
                    >
                      {isApproved ? "Step 7: Ready for Check-in" : "Step 8: In Use / Awaiting Return"}
                    </Badge>
                    <span className="text-[11px] font-mono text-dusty-olive-400">#{b.id.slice(0, 12)}</span>
                  </div>

                  <h3 className="font-bold text-base text-dusty-olive-950">{res?.name || "Equipment"}</h3>
                  <p className="text-xs text-dusty-olive-600">{res?.location}</p>

                  <div className="bg-dusty-olive-50/60 p-2.5 rounded-xl border border-dusty-olive-200/60 text-xs text-dusty-olive-800 space-y-1">
                    <div className="flex items-center gap-1 text-dusty-olive-500">
                      <Clock className="w-3.5 h-3.5 text-celadon-700" />
                      <span>
                        Slot: {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-dusty-olive-700 italic line-clamp-1">&quot;{b.purpose}&quot;</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dusty-olive-100">
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-xs font-semibold text-dusty-olive-600 hover:text-dusty-olive-950 flex items-center gap-1"
                  >
                    Details &amp; Diff <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {isApproved ? (
                    <Link href={`/bookings/${b.id}/check-in`}>
                      <Button size="sm" className="bg-celadon-700 hover:bg-celadon-800 text-white text-xs gap-1.5 shadow-xs">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Execute Check-in
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/bookings/${b.id}/return`}>
                      <Button size="sm" className="bg-muted-teal-700 hover:bg-muted-teal-800 text-white text-xs gap-1.5 shadow-xs">
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
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Open Incidents &amp; Condition Diff Reviews (Step 9)
            </h2>
            <p className="text-xs text-dusty-olive-600">
              Condition degradation flagged by algorithm. Awaiting human technician inspection and sign-off.
            </p>
          </div>
          <Badge variant="destructive">{openIncidents.length} Draft Incidents</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openIncidents.map((inc) => (
            <div
              key={inc.id}
              className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/50 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge variant="warning" className="text-[10px] uppercase font-bold">
                  Status: {inc.status} • Severity: {inc.severity}
                </Badge>
                <span className="text-[10px] font-mono text-dusty-olive-400">ID: {inc.id.slice(0, 12)}</span>
              </div>

              <p className="text-xs text-dusty-olive-900 leading-relaxed font-semibold">
                {inc.description}
              </p>

              <div className="text-[11px] text-amber-950 bg-white/90 p-2.5 rounded-xl border border-amber-200">
                <strong>Zero Automated Penalties:</strong> Technician reviews physical equipment before assessing repair fees or waivers.
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-amber-200/60">
                <span className="text-dusty-olive-600 font-mono">Booking: #{inc.booking_id.slice(0, 12)}</span>
                <Link
                  href={`/incidents/${inc.id}`}
                  className="text-celadon-800 font-bold hover:underline flex items-center gap-1"
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
          <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
            <Percent className="w-5 h-5 text-celadon-700" />
            Station Capacity &amp; Utilisation
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {utilizations.map(({ resource, percentage, label }) => (
            <div key={resource.id} className="p-4 rounded-2xl border border-dusty-olive-200/90 bg-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px] uppercase font-bold">
                  {resource.category.replace("_", " ")}
                </Badge>
                <span className="font-extrabold text-sm text-dusty-olive-950">{percentage}%</span>
              </div>
              <h4 className="font-bold text-sm text-dusty-olive-950 truncate">{resource.name}</h4>

              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-dusty-olive-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      percentage >= 80 ? "bg-rose-500" : percentage >= 50 ? "bg-amber-500" : "bg-celadon-600"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-dusty-olive-500 block">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

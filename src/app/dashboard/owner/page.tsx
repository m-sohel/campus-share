import { requireRole } from "@/lib/auth/role-guard";
import {
  getAllBookings,
  getAllResources,
  getAllUsers,
  getIncidents,
  getUserById,
  calculateResourceUtilization,
} from "@/lib/data/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  ShieldCheck,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
  ShieldAlert,
  Percent,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingReviewCard } from "@/components/bookings/BookingReviewCard";

export default async function OwnerDashboard() {
  const user = await requireRole(["owner", "admin"]);

  const allResources = await getAllResources();

  // Filter resources owned by this specific owner (or all if admin)
  const ownedResources =
    user.role === "admin"
      ? allResources
      : allResources.filter((r) => r.owner_id === user.id);

  const ownedResourceIds = new Set(ownedResources.map((r) => r.id));

  // Fetch all bookings and incidents
  const allBookings = await getAllBookings();
  const incidents = await getIncidents();

  // Pending Approvals
  const pendingApprovals = allBookings.filter(
    (b) => (b.status === "pending_review" || b.status === "waitlisted") && (user.role === "admin" || ownedResourceIds.has(b.resource_id))
  );

  // Today's Check-ins & Returns
  const activeHandovers = allBookings.filter(
    (b) => (b.status === "approved" || b.status === "in_use") && (user.role === "admin" || ownedResourceIds.has(b.resource_id))
  );

  // Open Incidents
  const openIncidents = incidents.filter(
    (inc) => inc.status === "draft" || inc.status === "under_review" || inc.status === "reported"
  );

  // Calculate utilization for each resource
  const resourceUtilizations = await Promise.all(
    ownedResources.map(async (res) => {
      const util = await calculateResourceUtilization(res.id);
      return { resource: res, ...util };
    })
  );

  const allUsers = getAllUsers();
  const managers = allUsers.filter((u) => u.role === "manager");

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl font-bold">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.full_name}</h1>
                <Badge variant="secondary" className="uppercase text-xs font-bold bg-white/20 text-white border-0">
                  Resource Owner Desk
                </Badge>
              </div>
              <p className="text-indigo-200 text-sm mt-1">
                {user.department} • <span className="capitalize">{user.affiliation}</span> Custody
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/resources/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-bold shadow-sm">
                + List New Resource
              </Button>
            </Link>

            <Link href="/judge">
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-xs">
                Judge Script
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Pending Approvals
          </span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {pendingApprovals.length}
          </span>
          <span className="text-[11px] text-slate-500">Requires Step 6 decision</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Today&apos;s Handovers
          </span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">
            {activeHandovers.length}
          </span>
          <span className="text-[11px] text-slate-500">Steps 7 & 8 in progress</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Open Incidents
          </span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
            {openIncidents.length}
          </span>
          <span className="text-[11px] text-slate-500">Draft review (0 penalties)</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Average Utilisation
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
            {Math.round(resourceUtilizations.reduce((acc, r) => acc + r.percentage, 0) / (resourceUtilizations.length || 1))}%
          </span>
          <span className="text-[11px] text-slate-500">Fair-share capacity</span>
        </div>
      </div>

      {/* Pending Approvals Queue (Step 6 Review Action) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Reservation Approvals (Step 6)
            </h2>
            <p className="text-xs text-slate-500">
              Review qualifications, fairness priority, and approve or waitlist requests.
            </p>
          </div>
          <Badge variant="warning">{pendingApprovals.length} Awaiting Review</Badge>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50">
            No pending reservation requests awaiting decision.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((b) => {
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
        )}
      </div>

      {/* Active Check-ins, Returns & Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Handovers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-indigo-600" />
              Today&apos;s Active Handovers & Returns
            </h3>
            <Link href="/bookings" className="text-xs text-indigo-600 font-semibold hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {activeHandovers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No active check-ins or returns scheduled for today.
              </div>
            ) : (
              activeHandovers.map((b) => {
                const res = allResources.find((r) => r.id === b.resource_id);
                const isApproved = b.status === "approved";
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isApproved ? "success" : "default"}
                          className={`text-[9px] uppercase font-bold ${!isApproved ? "bg-indigo-600" : ""}`}
                        >
                          {isApproved ? "Step 7: Ready for Check-in" : "Step 8: In Use"}
                        </Badge>
                        <span className="text-[10px] font-mono text-slate-400">#{b.id}</span>
                      </div>
                      <p className="font-bold text-sm text-slate-900">{res?.name}</p>
                      <p className="text-xs text-slate-500">{res?.location}</p>
                    </div>

                    <Link href={isApproved ? `/bookings/${b.id}/check-in` : `/bookings/${b.id}/return`}>
                      <Button size="sm" className={`h-8 text-xs text-white ${isApproved ? "bg-indigo-600" : "bg-amber-600"}`}>
                        {isApproved ? "Check-in" : "Return"}
                      </Button>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Open Incidents (Step 9 Review) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Incidents & Variance Review (Step 9)
            </h3>
            <Badge variant="destructive">{openIncidents.length} Under Review</Badge>
          </div>

          <div className="space-y-3">
            {openIncidents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Zero open incidents. All equipment in good standing.
              </div>
            ) : (
              openIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="warning" className="text-[10px] uppercase font-bold bg-amber-200 text-amber-900">
                      Status: {inc.status} • Severity: {inc.severity}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400">ID: {inc.id}</span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {inc.description}
                  </p>

                  <div className="text-[11px] text-amber-900 bg-white/80 p-2 rounded border border-amber-200">
                    <strong>CampusShare Principle:</strong> Auto-drafted for human review. Zero automated fines applied.
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono">Booking: #{inc.booking_id}</span>
                    <Link href={`/incidents/${inc.id}`} className="text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                      Review Incident &amp; Findings <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Managed Equipment & Utilisation % */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-indigo-600" />
              Equipment Utilisation & Capacity Tracking
            </h2>
            <p className="text-xs text-slate-500">
              Live capacity breakdown per resource based on reservation hours and active demand.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resourceUtilizations.map(({ resource, percentage, label }) => {
            const manager = managers.find((m) => m.id === resource.manager_id);
            return (
              <Card key={resource.id} className="border-slate-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-1">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold">
                      {resource.category.replace("_", " ")}
                    </Badge>
                    <span className="font-extrabold text-sm text-slate-900">{percentage}%</span>
                  </div>
                  <CardTitle className="text-sm leading-snug mt-1">{resource.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-500">{resource.location}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-2 text-xs">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage >= 80 ? "bg-rose-500" : percentage >= 50 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">{label}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                    <span>Technician:</span>
                    <span className="font-medium text-slate-900">{manager ? manager.full_name : "Unassigned"}</span>
                  </div>
                </CardContent>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link href={`/resources/${resource.id}`} className="text-indigo-600 font-semibold hover:underline">
                    Public Listing
                  </Link>
                  <Link href={`/resources/${resource.id}/edit`} className="text-slate-500 hover:text-slate-900">
                    Edit Rules
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

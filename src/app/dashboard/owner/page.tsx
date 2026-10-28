import { requireRole } from "@/lib/auth/role-guard";
import {
  getAllBookings,
  getAllResources,
  getAllUsers,
  getIncidents,
  calculateResourceUtilization,
} from "@/lib/data/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Clock,
  ClipboardCheck,
  ArrowRight,
  ShieldAlert,
  Percent,
  Inbox,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOwnerInbox } from "@/backend/services/bookings";
import { OwnerInboxList } from "@/components/bookings/OwnerInboxList";
import { getWaitlistForResource } from "@/backend/services/waitlist";
import { WaitlistBreakdownCard } from "@/components/waitlist/WaitlistBreakdownCard";
import { SEED_USERS } from "@/lib/data/seed-data";

export default async function OwnerDashboard() {
  const user = await requireRole(["owner", "admin"]);

  const seedUser = SEED_USERS.find((u) => u.email === user.email || u.id === user.id);
  const targetId = seedUser?.id || user.id;

  const allResources = await getAllResources();

  // Filter resources owned by this specific owner (or all if admin)
  const ownedResources =
    user.role === "admin"
      ? allResources
      : allResources.filter(
          (r) =>
            r.owner_id === user.id ||
            r.owner_id === targetId ||
            r.owner_id === "user-owner-1"
        );

  const ownedResourceIds = new Set(ownedResources.map((r) => r.id));

  // Fetch live requests inbox (Stage 3)
  let inboxItems: any[] = [];
  try {
    inboxItems = await getOwnerInbox(targetId, user.role);
  } catch (e) {
    console.error("Failed to fetch owner inbox from db:", e);
  }

  // Fetch live waitlists for owned resources (Stage 7 Fairness & Queue Engine)
  const waitlistsByResource: { resource: any; queue: any[] }[] = [];
  try {
    for (const r of ownedResources) {
      const q = await getWaitlistForResource(r.id);
      if (q && q.length > 0) {
        waitlistsByResource.push({ resource: r, queue: q });
      }
    }
  } catch (e) {
    console.error("Failed to fetch waitlists for owner:", e);
  }

  // Fetch all bookings and incidents
  const allBookings = await getAllBookings();
  const incidents = await getIncidents();

  // Pending Approvals
  const pendingApprovals = allBookings.filter(
    (b) =>
      (b.status === "pending_review" || b.status === "waitlisted") &&
      (user.role === "admin" || ownedResourceIds.has(b.resource_id))
  );

  // Today's Check-ins & Returns
  const activeHandovers = allBookings.filter(
    (b) =>
      (b.status === "approved" || b.status === "in_use") &&
      (user.role === "admin" || ownedResourceIds.has(b.resource_id))
  );

  // Open Incidents
  const openIncidents = incidents.filter(
    (inc) =>
      inc.status === "draft" ||
      inc.status === "under_review" ||
      inc.status === "reported"
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
      <div className="rounded-3xl bg-gradient-to-r from-dusty-olive-950 via-soft-celadon-950 to-muted-teal-950 text-white p-6 sm:p-8 shadow-md border border-celadon-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-tea-green-300 text-2xl font-bold">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
                <Badge variant="accent" className="uppercase text-xs font-bold border-0">
                  Resource Owner Desk
                </Badge>
              </div>
              <p className="text-dusty-olive-300 text-sm mt-1">
                {user.department} • <span className="capitalize">{user.affiliation}</span> Custody
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/resources/new">
              <Button size="sm" className="bg-celadon-700 hover:bg-celadon-800 text-white gap-1.5 text-xs font-bold shadow-xs">
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
        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Pending Approvals
          </span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {pendingApprovals.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Requires Step 6 decision</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Today&apos;s Handovers
          </span>
          <span className="text-2xl font-extrabold text-celadon-700 mt-1 block">
            {activeHandovers.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Steps 7 &amp; 8 in progress</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Open Incidents
          </span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
            {openIncidents.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Draft review (0 penalties)</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Average Utilisation
          </span>
          <span className="text-2xl font-extrabold text-muted-teal-700 mt-1 block">
            {Math.round(
              resourceUtilizations.reduce((acc, r) => acc + r.percentage, 0) /
                (resourceUtilizations.length || 1)
            )}
            %
          </span>
          <span className="text-[11px] text-dusty-olive-500">Fair-share capacity</span>
        </div>
      </div>

      {/* Owner Request Inbox (Stage 3 Full Review with Conflict Detection & Why Panel) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-celadon-700" />
              Reservation Request Inbox
            </h2>
            <p className="text-xs text-dusty-olive-600">
              Review requester eligibility, detect schedule conflicts, and record approval/waitlist decisions with plain-language explanations.
            </p>
          </div>
          <Badge variant="outline" className="font-semibold text-xs border-celadon-300 text-celadon-800 bg-soft-celadon-50">
            {inboxItems.length} Active Requests
          </Badge>
        </div>

        <OwnerInboxList initialInbox={inboxItems} actorId={targetId} />
      </div>

      {/* Stage 7: Equipment Waitlist Queue & Owner Override */}
      {waitlistsByResource.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <Users className="w-5 h-5 text-celadon-700" />
              Equipment Waitlists &amp; Queue Priority (Stage 7 Engine)
            </h2>
            <p className="text-xs text-dusty-olive-600">
              Transparent multi-factor queue ranking (fair-share past usage, wait duration, verified deadlines).
            </p>
          </div>

          <div className="space-y-6">
            {waitlistsByResource.map(({ resource, queue }) => (
              <div key={resource.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-dusty-olive-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-dusty-olive-950 text-sm">{resource.name}</span>
                    <Badge variant="outline" className="text-[10px] text-celadon-700 border-celadon-300">
                      High Demand
                    </Badge>
                  </div>
                  <span className="text-xs text-dusty-olive-500 font-mono">{queue.length} Candidates in Queue</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {queue.map((entry) => (
                    <WaitlistBreakdownCard
                      key={entry.id}
                      entry={entry}
                      viewerRole="owner"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Check-ins, Returns & Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Handovers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-dusty-olive-950 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-celadon-700" />
              Today&apos;s Active Handovers &amp; Returns
            </h3>
            <Link href="/bookings" className="text-xs text-celadon-800 font-semibold hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {activeHandovers.length === 0 ? (
              <div className="p-6 text-center text-xs text-dusty-olive-500 bg-dusty-olive-50/40 rounded-2xl border border-dusty-olive-200/90">
                No active check-ins or returns scheduled for today.
              </div>
            ) : (
              activeHandovers.map((b) => {
                const res = allResources.find((r) => r.id === b.resource_id);
                const isApproved = b.status === "approved";
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-dusty-olive-200/90 bg-white hover:border-celadon-400 shadow-xs flex items-center justify-between gap-3 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isApproved ? "success" : "teal"}
                          className="text-[9px] uppercase font-bold"
                        >
                          {isApproved ? "Step 7: Ready for Check-in" : "Step 8: In Use"}
                        </Badge>
                        <span className="text-[10px] font-mono text-dusty-olive-400">#{b.id.slice(0, 12)}</span>
                      </div>
                      <p className="font-bold text-sm text-dusty-olive-950">{res?.name}</p>
                      <p className="text-xs text-dusty-olive-600">{res?.location}</p>
                    </div>

                    <Link href={isApproved ? `/bookings/${b.id}/check-in` : `/bookings/${b.id}/return`}>
                      <Button
                        size="sm"
                        className={`h-8 text-xs text-white ${
                          isApproved
                            ? "bg-celadon-700 hover:bg-celadon-800"
                            : "bg-muted-teal-700 hover:bg-muted-teal-800"
                        }`}
                      >
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
            <h3 className="font-bold text-base text-dusty-olive-950 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Incidents &amp; Variance Review (Step 9)
            </h3>
            <Badge variant="destructive">{openIncidents.length} Under Review</Badge>
          </div>

          <div className="space-y-3">
            {openIncidents.length === 0 ? (
              <div className="p-6 text-center text-xs text-dusty-olive-500 bg-dusty-olive-50/40 rounded-2xl border border-dusty-olive-200/90">
                Zero open incidents. All equipment in good standing.
              </div>
            ) : (
              openIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="warning" className="text-[10px] uppercase font-bold">
                      Status: {inc.status} • Severity: {inc.severity}
                    </Badge>
                    <span className="text-[10px] font-mono text-dusty-olive-400">ID: {inc.id.slice(0, 12)}</span>
                  </div>

                  <p className="text-xs text-dusty-olive-900 leading-relaxed font-medium">
                    {inc.description}
                  </p>

                  <div className="text-[11px] text-amber-950 bg-white/90 p-2.5 rounded-xl border border-amber-200">
                    <strong>CampusShare Principle:</strong> Auto-drafted for human review. Zero automated fines applied.
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-dusty-olive-600 font-mono">Booking: #{inc.booking_id.slice(0, 12)}</span>
                    <Link
                      href={`/incidents/${inc.id}`}
                      className="text-celadon-800 font-semibold hover:underline flex items-center gap-1"
                    >
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
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <Percent className="w-5 h-5 text-celadon-700" />
              Equipment Utilisation &amp; Capacity Tracking
            </h2>
            <p className="text-xs text-dusty-olive-600">
              Live capacity breakdown per resource based on reservation hours and active demand.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resourceUtilizations.map(({ resource, percentage, label }) => {
            const manager = managers.find((m) => m.id === resource.manager_id);
            return (
              <Card key={resource.id} className="border-dusty-olive-200/90 shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-1">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold">
                      {resource.category.replace("_", " ")}
                    </Badge>
                    <span className="font-extrabold text-sm text-dusty-olive-950">{percentage}%</span>
                  </div>
                  <CardTitle className="text-sm leading-snug mt-1 text-dusty-olive-950">{resource.name}</CardTitle>
                  <CardDescription className="text-xs text-dusty-olive-500">{resource.location}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-2 text-xs">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-dusty-olive-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage >= 80
                            ? "bg-rose-500"
                            : percentage >= 50
                            ? "bg-amber-500"
                            : "bg-celadon-600"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-dusty-olive-500 block">{label}</span>
                  </div>

                  <div className="text-[11px] text-dusty-olive-700 bg-dusty-olive-50/70 p-2 rounded-xl border border-dusty-olive-200/60 flex items-center justify-between">
                    <span>Technician:</span>
                    <span className="font-medium text-dusty-olive-950">
                      {manager ? manager.full_name : "Unassigned"}
                    </span>
                  </div>
                </CardContent>

                <div className="p-3 bg-dusty-olive-50/50 border-t border-dusty-olive-100 flex items-center justify-between text-xs">
                  <Link href={`/resources/${resource.id}`} className="text-celadon-800 font-semibold hover:underline">
                    Public Listing
                  </Link>
                  <Link href={`/resources/${resource.id}/edit`} className="text-dusty-olive-500 hover:text-dusty-olive-950">
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

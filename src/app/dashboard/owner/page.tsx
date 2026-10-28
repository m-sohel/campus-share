import { requireRole } from "@/lib/auth/role-guard";
import { SEED_RESOURCES, SEED_USERS } from "@/lib/data/seed-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOwnerInbox } from "@/backend/services/bookings";
import { OwnerInboxList } from "@/components/bookings/OwnerInboxList";
import { getWaitlistForResource } from "@/backend/services/waitlist";
import { WaitlistBreakdownCard } from "@/components/waitlist/WaitlistBreakdownCard";
import { Users } from "lucide-react";

export default async function OwnerDashboard() {
  const user = await requireRole(["owner", "admin"]);

  const seedUser = SEED_USERS.find((u) => u.email === user.email || u.id === user.id);
  const targetId = seedUser?.id || user.id;

  // Fetch live requests inbox
  let inboxItems: any[] = [];
  try {
    inboxItems = await getOwnerInbox(targetId, user.role);
  } catch (e) {
    console.error("Failed to fetch owner inbox:", e);
  }

  // Filter resources owned by this specific owner (or all if admin)
  const ownedResources =
    user.role === "admin"
      ? SEED_RESOURCES
      : SEED_RESOURCES.filter((r) => r.owner_id === targetId || r.owner_id === user.id);

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

  // Find assigned manager details
  const managers = SEED_USERS.filter((u) => u.role === "manager");

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
                  Resource Owner
                </Badge>
              </div>
              <p className="text-indigo-200 text-sm mt-1">
                {user.department} • <span className="capitalize">{user.affiliation}</span> Facility
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-indigo-200 block font-semibold">
                Resources Listed
              </span>
              <span className="text-2xl font-extrabold text-white">
                {ownedResources.length}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-indigo-200 block font-semibold">
                Assigned Techs
              </span>
              <span className="text-2xl font-extrabold text-white">
                {managers.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Owner Request Inbox */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-indigo-600" />
              Reservation Request Inbox
            </h2>
            <p className="text-sm text-slate-600">
              Review requester eligibility, detect schedule conflicts, and record approval/waitlist decisions.
            </p>
          </div>
          <Badge variant="outline" className="font-semibold text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
            {inboxItems.length} Active Requests
          </Badge>
        </div>

        <OwnerInboxList initialInbox={inboxItems} actorId={targetId} />
      </div>

      {/* Stage 7: Equipment Waitlist Queue & Owner Override */}
      {waitlistsByResource.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Equipment Waitlists & Queue Priority
            </h2>
            <p className="text-sm text-slate-600">
              Transparent multi-factor queue ranking (fair-share past usage, wait duration, verified deadlines).
            </p>
          </div>

          <div className="space-y-6">
            {waitlistsByResource.map(({ resource, queue }) => (
              <div key={resource.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{resource.name}</span>
                    <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                      High Demand
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{queue.length} Candidates in Queue</span>
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

      {/* Owned Resources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Managed Inventory</h2>
            <p className="text-sm text-slate-600">
              High-value equipment with safety rules and weekly availability slots.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/login">Switch Role</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ownedResources.map((res) => (
            <Card key={res.id} className="border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="capitalize text-xs font-semibold">
                    {res.category.replace("_", " ")}
                  </Badge>
                  {res.is_high_demand && (
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                      High Demand
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 mt-2 line-clamp-1">
                  {res.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {res.location} • {res.institution}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <p className="text-xs text-slate-600 line-clamp-2">
                  {res.description}
                </p>

                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Max Duration:</span>
                    <span className="font-semibold text-slate-900">{res.max_duration_hours}h</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Supervision:</span>
                    <span className="font-semibold text-slate-900">
                      {res.requires_supervision ? "Required" : "Autonomous"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Deposit:</span>
                    <span className="font-semibold text-slate-900">
                      {res.deposit_required_cents > 0 ? `$${res.deposit_required_cents / 100}` : "Free"}
                    </span>
                  </div>
                </div>

                {res.requirements.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Required: </span>
                    {res.requirements.map((r) => r.credential_type).join(", ")}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Bookings
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{res.id.slice(0, 8)}...</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { requireRole } from "@/lib/auth/role-guard";
import { SEED_RESOURCES } from "@/lib/data/seed-data";
import { getAllBookings } from "@/lib/data/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  CheckCircle2,
  ClipboardCheck,
  Building2,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ManagerDashboard() {
  const user = await requireRole(["manager", "admin"]);

  // Resources assigned to this technician / manager
  const assignedResources =
    user.role === "admin"
      ? SEED_RESOURCES
      : SEED_RESOURCES.filter((r) => r.manager_id === user.id);

  const bookings = await getAllBookings();
  const activeBookings = bookings.filter((b) => b.status === "approved" || b.status === "in_use");

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
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-amber-200 block font-semibold">
                Equipment Delegated
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

      {/* Active Handover Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Active Handover & Return Queue
            </h2>
            <p className="text-xs text-slate-500">
              Pending Step 7 physical check-ins and Step 8 post-session return inspections.
            </p>
          </div>
          <Link href="/bookings">
            <Button variant="outline" size="sm" className="text-xs">
              View All Bookings
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBookings.map((b) => {
            const res = SEED_RESOURCES.find((r) => r.id === b.resource_id);
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
                    Details <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Assigned Equipment Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Supervised Equipment Stations
          </h2>
          <Link href="/">
            <Button variant="outline" size="sm">
              View Public Listings
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedResources.map((res) => (
            <Card key={res.id} className="border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider mb-2">
                      {res.category.replace("_", " ")}
                    </Badge>
                    <Badge variant={res.requires_supervision ? "warning" : "secondary"} className="text-[10px]">
                      {res.requires_supervision ? "Supervision Required" : "Self-Service Cert"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base leading-snug">{res.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    {res.location}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 text-xs text-slate-700">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-semibold text-slate-900 block">Operating Rules:</span>
                    <p className="text-slate-600 leading-relaxed">{res.rules}</p>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span>Advance Notice: {res.min_lead_time_hours}h</span>
                    <span>Max Session: {res.max_duration_hours}h</span>
                  </div>
                </CardContent>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Handover
                </span>
                <span className="text-slate-500 font-mono text-[11px]">ID: {res.id.slice(0, 8)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

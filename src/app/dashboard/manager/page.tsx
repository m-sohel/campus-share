import { requireRole } from "@/lib/auth/role-guard";
import { SEED_RESOURCES, SEED_USERS } from "@/lib/data/seed-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Building2,
  Clock,
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
            Physical Inspection & Handover Protocol
          </strong>
          <p className="text-amber-800 leading-relaxed">
            As designated technician, you execute Step 7 (initial condition sign-off at check-in) and Step 8 (return inspection). Always verify optical lenses, bed alignment, and safety interlocks prior to completing handover.
          </p>
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

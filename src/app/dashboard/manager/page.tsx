import { requireRole } from "@/lib/auth/role-guard";
import { SEED_RESOURCES, SEED_USERS } from "@/lib/data/seed-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ManagerDashboard() {
  const user = await requireRole(["manager", "admin"]);

  const seedUser = SEED_USERS.find((u) => u.email === user.email || u.id === user.id);
  const targetId = seedUser?.id || user.id;

  // Resources assigned to this technician / manager
  const assignedResources =
    user.role === "admin"
      ? SEED_RESOURCES
      : SEED_RESOURCES.filter((r) => r.manager_id === targetId || r.manager_id === user.id);

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
                Supervised Gear
              </span>
              <span className="text-2xl font-extrabold text-white">
                {assignedResources.length}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-amber-200 block font-semibold">
                Inspection Protocols
              </span>
              <span className="text-2xl font-extrabold text-white">
                Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Handover & Inspection Protocols */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Assigned Equipment & Safety Supervision</h2>
            <p className="text-sm text-slate-600">
              Assigned resources awaiting check-in condition inspections and physical handovers.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/login">Switch Role</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedResources.map((res) => (
            <Card key={res.id} className="border-slate-200 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="capitalize text-xs font-semibold">
                    {res.category.replace("_", " ")}
                  </Badge>
                  {res.requires_supervision && (
                    <Badge variant="warning" className="text-[10px] uppercase font-bold">
                      Supervision Mandatory
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-slate-900 mt-2">
                  {res.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {res.location}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="rounded-lg bg-amber-50/50 p-2.5 border border-amber-200/60 text-xs space-y-1 text-slate-700">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-amber-700" />
                    Handover Inspection Checklist:
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 pl-1 space-y-0.5">
                    <li>Power supply & physical casing check</li>
                    <li>Lens / nozzle cleanliness verified</li>
                    <li>Calibration & safety interlock test</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Weekly Slots: <strong className="text-slate-900">Mon-Fri 09:00-18:00</strong></span>
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

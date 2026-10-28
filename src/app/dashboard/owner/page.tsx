import { requireRole } from "@/lib/auth/role-guard";
import { SEED_RESOURCES, SEED_USERS } from "@/lib/data/seed-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  ShieldCheck,
  Building2,
  Clock,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OwnerDashboard() {
  const user = await requireRole(["owner", "admin"]);

  // Filter resources owned by this specific owner (or all if admin)
  const ownedResources =
    user.role === "admin"
      ? SEED_RESOURCES
      : SEED_RESOURCES.filter((r) => r.owner_id === user.id);

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
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Managed Facility Resources
            </h2>
            <p className="text-sm text-slate-600">
              Machinery and laboratories under your institutional custody.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              Public Catalog Preview
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ownedResources.map((res) => {
            const manager = managers.find((m) => m.id === res.manager_id);

            return (
              <Card key={res.id} className="border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider mb-2">
                          {res.category.replace("_", " ")}
                        </Badge>
                        <CardTitle className="text-lg leading-snug">{res.name}</CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                          {res.location} ({res.institution})
                        </CardDescription>
                      </div>

                      <Badge variant={res.is_high_demand ? "destructive" : "success"}>
                        {res.is_high_demand ? "High Demand" : "Normal"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs text-slate-700">
                    <p className="text-slate-600 line-clamp-2">{res.description}</p>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Delegated Technician:</span>
                        <span className="text-indigo-600 font-medium">
                          {manager ? manager.full_name : "Unassigned"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Lead Time / Max Window:</span>
                        <span>{res.min_lead_time_hours}h advance • {res.max_duration_hours}h max</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">Supervision Required:</span>
                        <span>{res.requires_supervision ? "Mandatory Staff Presence" : "Autonomous with Cert"}</span>
                      </div>
                    </div>

                    {res.requirements.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-900 block">
                          Mandatory Safety Prerequisites:
                        </span>
                        {res.requirements.map((req, i) => (
                          <div key={i} className="text-slate-600 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{req.explanation}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Weekly Slots: Mon-Fri 09:00 - 18:00</span>
                  <Badge variant="outline" className="font-medium text-slate-700">
                    Active & Listed
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

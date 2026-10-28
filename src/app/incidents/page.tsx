import { getCurrentUser } from "@/lib/auth/role-guard";
import { getIncidents, getAllResources, getAllUsers } from "@/lib/data/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Plus,
  ArrowRight,
  Clock,
  User,
  Building2,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { DemoClockControl } from "@/components/clock/DemoClockControl";

export default async function IncidentsIndexPage() {
  const user = await getCurrentUser();
  const incidents = await getIncidents();
  const resources = await getAllResources();
  const users = getAllUsers();

  const getResource = (id?: string) => resources.find((r) => r.id === id);
  const getUser = (id?: string) => users.find((u) => u.id === id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="warning">Draft Intake</Badge>;
      case "open":
        return <Badge variant="default" className="bg-indigo-600 text-white">Open</Badge>;
      case "under_review":
        return <Badge variant="outline" className="border-indigo-400 text-indigo-700 bg-indigo-50">Under Review</Badge>;
      case "disputed":
        return <Badge variant="destructive">Disputed Appeal</Badge>;
      case "resolved":
        return <Badge variant="success">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="uppercase text-[9px] font-bold">Critical</Badge>;
      case "high":
        return <Badge variant="destructive" className="uppercase text-[9px] font-bold bg-rose-500">High</Badge>;
      case "medium":
        return <Badge variant="warning" className="uppercase text-[9px] font-bold">Medium</Badge>;
      default:
        return <Badge variant="secondary" className="uppercase text-[9px] font-bold">Low</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 text-white p-6 sm:p-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="uppercase text-xs font-bold border-0">
                  Lifecycle Step 9
                </Badge>
                <span className="text-rose-200 text-xs">• Accountable Incident Resolution</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                Incident & Dispute Governance Desk
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Zero automated penalties. Community-reported and diff-detected incidents follow auditable multi-step due process: intake, borrower statement, station manager finding, and campus administrative arbitration.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/judge">
                <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold">
                  Judge Script
                </Button>
              </Link>
              <Link href="/incidents/new">
                <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-1.5 shadow-sm">
                  <Plus className="w-4 h-4" />
                  Report Incident
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Demo Clock Quick Access */}
        <DemoClockControl />

        {/* Incidents Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Active Cases & Resolution Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Track full lifecycle: Draft &rarr; Open &rarr; Under Review &rarr; Resolved &rarr; Disputed.
              </p>
            </div>
            <Badge variant="outline">{incidents.length} Recorded</Badge>
          </div>

          {incidents.length === 0 ? (
            <Card className="border-dashed border-slate-300 p-8 text-center bg-white">
              <p className="text-xs text-slate-500">No incidents recorded yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.map((inc) => {
                const resource = getResource(inc.resource_id);
                const reporter = getUser(inc.reporter_id);
                const borrower = getUser(inc.affected_user_id);

                return (
                  <Card key={inc.id} className="border-slate-200 hover:border-slate-300 transition-shadow shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(inc.status)}
                          {getSeverityBadge(inc.severity)}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">#{inc.id}</span>
                      </div>

                      <CardTitle className="text-base text-slate-900 mt-2 line-clamp-1">
                        {inc.title || `${inc.type.toUpperCase()}: ${resource?.name || "Equipment"}`}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{resource?.name || "Equipment Station"} • {resource?.location}</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs">
                      <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-2 leading-relaxed">
                        {inc.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400">Borrower:</span>{" "}
                          <span className="font-semibold text-slate-800">{borrower?.full_name || inc.affected_user_name || "Borrower"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Reported by:</span>{" "}
                          <span className="font-semibold text-slate-800">{reporter?.full_name || inc.reporter_name || "Technician"}</span>
                        </div>
                      </div>

                      {inc.resolution_notes && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px]">
                          <strong>Resolution:</strong> {inc.resolution_notes}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(inc.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        <Link href={`/incidents/${inc.id}`}>
                          <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            View Case &amp; Actions
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

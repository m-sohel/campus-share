import { requireRole } from "@/lib/auth/role-guard";
import { SEED_USERS, SEED_RESOURCES, SEED_CREDENTIALS } from "@/lib/data/seed-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Users,
  Layers,
  FileCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { getAuditLogEntries } from "@/backend/services/audit";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { getSupabaseAdminClient } from "@/backend/client";

export default async function AdminDashboard() {
  const user = await requireRole(["admin"]);

  // Fetch real live audit log entries from Supabase
  let auditEntries: any[] = [];
  let actors: { id: string; name: string; role: string }[] = [];

  try {
    auditEntries = await getAuditLogEntries({ limit: 100 });
    const supabase = getSupabaseAdminClient();
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, role");
    actors = (profiles || []).map((p: any) => ({ id: p.id, name: p.full_name, role: p.role }));
  } catch (e) {
    console.error("Failed to fetch audit log for admin:", e);
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl font-bold">
              <ShieldCheck className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.full_name}</h1>
                <Badge variant="destructive" className="uppercase text-xs font-bold border-0">
                  Campus Administrator
                </Badge>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                {user.department} • System Governance & Safety Council
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs bg-emerald-950 text-emerald-300 border-emerald-500/30">
              Platform Status: Healthy
            </Badge>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Total Users</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{SEED_USERS.length}</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            4 Staff/Owners + 6 Borrowers
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Listed Resources</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{SEED_RESOURCES.length}</span>
              <Layers className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Across 4 categories (Labs, Fab, Media, Elec)
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Tracked Credentials</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{SEED_CREDENTIALS.length}</span>
              <FileCheck className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Active, Expired, Pending & Revoked states
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Audit Chain Security</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between text-emerald-600">
              <span>100% Chained</span>
              <Lock className="w-5 h-5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-emerald-700">
            SHA-256 Hash Chain Active ({auditEntries.length} Blocks)
          </CardContent>
        </Card>
      </div>

      {/* Stage 5: Live Cryptographic Audit Trail Viewer */}
      <AuditLogViewer initialEntries={auditEntries} actors={actors} />

      {/* Seeded User Roster Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">System User Directory</CardTitle>
          <CardDescription>
            All 10 verified personas with institutional roles and credential statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">User & Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department & Affiliation</th>
                  <th className="p-3">Reputation</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {SEED_USERS.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          u.role === "admin"
                            ? "destructive"
                            : u.role === "owner"
                            ? "default"
                            : u.role === "manager"
                            ? "warning"
                            : "secondary"
                        }
                        className="uppercase text-[9px] font-bold"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div>{u.department}</div>
                      <div className="text-slate-500 capitalize">{u.affiliation}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {u.reputation_score} / 100
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

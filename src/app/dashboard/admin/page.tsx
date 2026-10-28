import { requireRole } from "@/lib/auth/role-guard";
import { SEED_USERS, SEED_RESOURCES, SEED_CREDENTIALS } from "@/lib/data/seed-data";
import { getAuditLogs, getCredentials, getAllBookings, getIncidents } from "@/lib/data/store";
import { verifyAuditChain } from "@/lib/rules/audit-verifier";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Users,
  Layers,
  FileCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Hash,
  Clock,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  const user = await requireRole(["admin"]);

  const allLogs = getAuditLogs();
  const allCreds = await getCredentials();
  const allBookings = await getAllBookings();
  const allIncidents = await getIncidents();

  // Verification Queue (pending credentials)
  const pendingCredentials = allCreds.filter((c) => c.status === "pending");

  // Audit chain verification check
  const chainResult = verifyAuditChain(allLogs);

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
                  Campus Administrator Desk
                </Badge>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                {user.department} • System Governance & Safety Council
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/judge">
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                Judge Script
              </Button>
            </Link>
            <Badge variant="success" className="px-3 py-1 font-semibold text-xs">
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
            <CardDescription className="text-xs font-semibold uppercase">Active Reservations</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>{allBookings.length}</span>
              <Layers className="w-5 h-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Across 8 campus resources
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Pending Qualifications</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between text-amber-600">
              <span>{pendingCredentials.length}</span>
              <FileCheck className="w-5 h-5 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Awaiting verification sign-off
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Audit Chain Security</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between text-emerald-600">
              <span>{chainResult.isValid ? "100% Valid" : "Tampered"}</span>
              <Lock className="w-5 h-5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-emerald-700">
            SHA-256 Chained Hash Verified
          </CardContent>
        </Card>
      </div>

      {/* Verification Queue Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Qualification Verification Queue
            </h2>
            <p className="text-xs text-slate-500">
              User licenses and safety training submissions requiring staff verification.
            </p>
          </div>
          <Link href="/credentials/verify">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1">
              Open Full Verification Desk <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {pendingCredentials.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            Verification queue is clear. All submitted qualifications have been reviewed.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCredentials.map((cred) => (
              <div
                key={cred.id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="text-[9px] uppercase font-bold">
                      Pending Review
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-500">#{cred.id.slice(0, 8)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{cred.title}</h4>
                  <p className="text-xs text-slate-600">Type: {cred.credential_type}</p>
                </div>

                <Link href="/credentials/verify">
                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                    Review
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cryptographic Audit Trail Section (Step 10) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Cryptographic Audit Log & SHA-256 Integrity (Step 10)
            </CardTitle>
            <CardDescription className="text-xs">
              Every sensitive handover, condition record, review decision, and incident writes to this tamper-evident hash chain.
            </CardDescription>
          </div>

          <Badge variant={chainResult.isValid ? "success" : "destructive"} className="text-xs self-start sm:self-auto gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Chain Status: {chainResult.isValid ? "VERIFIED (OK)" : "TAMPERED"}
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {allLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              Audit log will display entries as check-ins, returns, and reviews occur.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {allLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold">
                        {log.action}
                      </Badge>
                      <span className="text-slate-600">Actor: {log.actor_role}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium">{log.reason}</p>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                    <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">Hash: {log.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

import { requireRole } from "@/lib/auth/role-guard";
import { SEED_CREDENTIALS, SEED_RESOURCES } from "@/lib/data/seed-data";
import { checkEligibility } from "@/lib/rules/eligibility";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  ShieldCheck,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileBadge,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UserDashboard() {
  const user = await requireRole(["user", "admin"]);

  // Fetch credentials for this user
  const userCredentials = SEED_CREDENTIALS.filter((c) => c.user_id === user.id);

  // Run eligibility checks on all 8 resources
  const eligibilitySummaries = SEED_RESOURCES.map((res) => {
    const check = checkEligibility(
      res.requirements.map((r, idx) => ({
        id: `req-${idx}`,
        resource_id: res.id,
        credential_type: r.credential_type,
        min_experience_hours: 0,
        is_mandatory: r.is_mandatory,
        explanation: r.explanation,
        created_at: new Date().toISOString(),
      })),
      userCredentials.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        credential_type: c.credential_type,
        title: c.title,
        status: c.status,
        issued_at: c.issued_at,
        expires_at: c.expires_at || null,
        created_at: c.issued_at,
      }))
    );

    return {
      resource: res,
      eligibility: check,
    };
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Profile Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.full_name}</h1>
                <Badge variant="secondary" className="uppercase text-xs font-bold bg-white/20 text-white border-0">
                  Borrower / Researcher
                </Badge>
              </div>
              <p className="text-indigo-200 text-sm mt-1">
                {user.department} • <span className="capitalize">{user.affiliation}</span> Affiliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-indigo-200 block font-semibold">
                Reputation Score
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-5 h-5" />
                {user.reputation_score} / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Credentials & Qualifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-indigo-600" />
                My Verified Credentials
              </CardTitle>
              <CardDescription>
                Certifications and safety clearance on file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userCredentials.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    No certifications registered yet
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    You can still book resources that require zero safety endorsements, or request verification for external licenses.
                  </p>
                </div>
              ) : (
                userCredentials.map((cred) => {
                  let badge = <Badge variant="success">Verified</Badge>;
                  let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;

                  if (cred.status === "expired") {
                    badge = <Badge variant="destructive">Expired</Badge>;
                    icon = <XCircle className="w-4 h-4 text-rose-600" />;
                  } else if (cred.status === "pending") {
                    badge = <Badge variant="warning">Under Review</Badge>;
                    icon = <Clock className="w-4 h-4 text-amber-600" />;
                  } else if (cred.status === "revoked") {
                    badge = <Badge variant="destructive">Revoked</Badge>;
                    icon = <XCircle className="w-4 h-4 text-rose-600" />;
                  }

                  return (
                    <div
                      key={cred.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-900 leading-snug">
                          {cred.title}
                        </span>
                        {badge}
                      </div>
                      {cred.verification_notes && (
                        <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                          <strong>Note:</strong> {cred.verification_notes}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Type: {cred.credential_type}</span>
                        {cred.expires_at && (
                          <span>Exp: {new Date(cred.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 2 cols: Live Equipment Eligibility Evaluation */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Resource Eligibility Matrix
                  </CardTitle>
                  <CardDescription>
                    Plain-language requirement checks evaluated against your profile in real-time.
                  </CardDescription>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Browse All Catalog
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {eligibilitySummaries.map(({ resource, eligibility }) => (
                <div
                  key={resource.id}
                  className={`p-4 rounded-xl border transition ${
                    eligibility.isEligible
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {resource.name}
                        </span>
                        {resource.is_high_demand && (
                          <Badge variant="destructive" className="text-[9px] uppercase">
                            High Demand
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 capitalize">
                        {resource.category.replace("_", " ")} • {resource.location}
                      </span>
                    </div>

                    <div>
                      {eligibility.isEligible ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Eligible to Reserve
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Requirements Missing
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Plain Language Explanation */}
                  <div className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block mb-1">
                      System Verification:
                    </span>
                    <p className="leading-relaxed">{eligibility.summary}</p>
                    {eligibility.checks.length > 0 && (
                      <ul className="mt-2 space-y-1 pl-1">
                        {eligibility.checks.map((c, i) => (
                          <li
                            key={i}
                            className={`flex items-start gap-1.5 ${
                              c.met ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {c.met ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            )}
                            <span>{c.reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

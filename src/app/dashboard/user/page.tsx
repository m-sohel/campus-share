import { requireRole } from "@/lib/auth/role-guard";
import { SEED_CREDENTIALS, SEED_RESOURCES, SEED_USERS } from "@/lib/data/seed-data";
import { checkEligibility } from "@/lib/rules/eligibility";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileBadge,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookResourceButton } from "@/components/bookings/BookResourceButton";
import { UserBookingsList, UserBookingItem } from "@/components/bookings/UserBookingsList";
import { getSupabaseAdminClient } from "@/backend/client";
import { explainBookingDecision } from "@/lib/rules/decision-explanation";
import { Booking, Resource } from "@/types";
import { FairUseMeter } from "@/components/fairness/FairUseMeter";
import { getUserWaitlistEntries } from "@/backend/services/waitlist";
import { WaitlistBreakdownCard } from "@/components/waitlist/WaitlistBreakdownCard";
import { Clock } from "lucide-react";

export default async function UserDashboard() {
  const user = await requireRole(["user", "admin"]);

  const seedUser = SEED_USERS.find((u) => u.email === user.email || u.id === user.id);
  const targetId = seedUser?.id || user.id;

  // Fetch credentials for this user
  const userCredentials = SEED_CREDENTIALS.filter((c) => c.user_id === targetId || c.user_id === user.id);

  // Fetch active bookings for this user
  let userBookingItems: UserBookingItem[] = [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false });

    if (bookings && bookings.length > 0) {
      const { data: allResources } = await supabase.from("resources").select("*");
      const resMap = new Map((allResources || []).map((r) => [r.id, r]));

      userBookingItems = (bookings as Booking[]).map((b) => {
        const res = resMap.get(b.resource_id) as Resource | undefined;
        const exp = explainBookingDecision({
          booking: b,
          resource: res,
        });
        return {
          booking: b,
          resource: res,
          explanation: exp,
        };
      });
    }
  } catch (e) {
    console.error("Failed to load user bookings:", e);
  }

  // Fetch active waitlist positions & offers for this user
  let userWaitlists: any[] = [];
  try {
    userWaitlists = await getUserWaitlistEntries(targetId);
  } catch (e) {
    console.error("Failed to load user waitlists:", e);
  }

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
              {user.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.full_name}</h1>
                <Badge variant="secondary" className="uppercase text-xs font-bold bg-white/20 text-white border-0">
                  {user.role} Persona
                </Badge>
              </div>
              <p className="text-indigo-200 text-sm mt-1">
                {user.email} • {user.department || "General Campus"} ({user.affiliation || "University"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-indigo-200 block font-semibold">
                Reputation
              </span>
              <span className="text-2xl font-extrabold text-white">
                {user.reputation_score || 100}%
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-indigo-200 block font-semibold">
                Credentials
              </span>
              <span className="text-2xl font-extrabold text-white">
                {userCredentials.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage 7: Fair Use Meter & Quota Progress */}
      <FairUseMeter userId={user.id} />

      {/* Verified Credentials Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Training & Credentials</h2>
            <p className="text-sm text-slate-600">
              Verified certifications that unlock access to specialized campus gear.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/login">Switch Persona</Link>
          </Button>
        </div>

        {userCredentials.length === 0 ? (
          <Card className="border-dashed border-2 p-8 text-center text-slate-500 bg-white">
            <FileBadge className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="font-medium text-slate-700">No credentials currently on file.</p>
            <p className="text-xs text-slate-500 mt-1">
              Select other personas from the login page (e.g., Sarah Jenkins) to view qualified researcher permissions.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCredentials.map((cred) => {
              let badgeVariant: "default" | "secondary" | "destructive" | "warning" = "default";
              if (cred.status === "expired") badgeVariant = "destructive";
              if (cred.status === "pending") badgeVariant = "warning";
              if (cred.status === "revoked") badgeVariant = "destructive";

              return (
                <Card key={cred.id} className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={badgeVariant} className="uppercase text-[10px] font-bold">
                        {cred.status}
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {cred.expires_at ? `Exp: ${cred.expires_at.slice(0, 10)}` : "Permanent"}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-2">
                      {cred.title}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono text-slate-500">
                      Type: {cred.credential_type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Issued: {cred.issued_at.slice(0, 10)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage 7: Active Waitlist Positions & Vacated Slot Offers */}
      {userWaitlists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Your Waitlist Positions & Priority Breakdown
              </h2>
              <p className="text-sm text-slate-600">
                Transparent multi-factor ranking. Offers are automatically delivered here with a 2-hour window.
              </p>
            </div>
            <Badge variant="outline" className="font-semibold text-xs border-amber-200 text-amber-700 bg-amber-50">
              {userWaitlists.length} Active Queue Positions
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userWaitlists.map((entry) => (
              <WaitlistBreakdownCard
                key={entry.id}
                entry={entry}
                viewerRole="user"
              />
            ))}
          </div>
        </div>
      )}

      {/* Your Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Your Reservations & Request History
            </h2>
            <p className="text-sm text-slate-600">
              Track status in real time and inspect the "Why" panel for full decision transparency.
            </p>
          </div>
          <Badge variant="outline" className="font-semibold text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
            {userBookingItems.length} Reservations
          </Badge>
        </div>

        <UserBookingsList bookings={userBookingItems} userId={targetId} />
      </div>

      {/* Real-Time Prerequisite Eligibility Matrix */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Equipment Access & Eligibility Status</h2>
          <p className="text-sm text-slate-600">
            Real-time evaluation generated by the pure TypeScript engine (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">/lib/rules/eligibility.ts</code>)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eligibilitySummaries.map(({ resource, eligibility }) => (
            <Card
              key={resource.id}
              className={`border transition shadow-sm ${
                eligibility.isEligible
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {resource.category.replace("_", " ")}
                  </Badge>
                  {eligibility.isEligible ? (
                    <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Eligible to Book
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Requirements Missing
                    </Badge>
                  )}
                </div>

                <CardTitle className="text-base font-bold text-slate-900 mt-2">
                  {resource.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {resource.location} • {resource.institution}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2.5 pt-0 text-xs">
                {eligibility.checks.length === 0 ? (
                  <p className="text-slate-500 italic">No special credentials mandatory. Open access.</p>
                ) : (
                  <div className="space-y-1.5">
                    {eligibility.checks.map((chk) => (
                      <div
                        key={chk.requirement.credential_type}
                        className="rounded-md p-2 bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{chk.requirement.credential_type}</div>
                          <div className="text-[11px] text-slate-600">{chk.reason}</div>
                        </div>
                        <Badge
                          variant={chk.status === "verified" ? "default" : chk.status === "expired" || chk.status === "revoked" ? "destructive" : "warning"}
                          className="uppercase text-[9px] font-bold shrink-0"
                        >
                          {chk.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Max {resource.max_duration_hours}h • {resource.requires_supervision ? "Supervised" : "Self-serve"}
                  </span>
                  <BookResourceButton
                    resource={{
                      ...resource,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }}
                    isEligible={eligibility.isEligible}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

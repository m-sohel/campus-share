import { requireRole } from "@/lib/auth/role-guard";
import { getAllBookings, getNotifications, getCredentials, getAllResources, getIncidents } from "@/lib/data/store";
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
  QrCode,
  ArrowRight,
  Bell,
  Calendar,
  History,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UserDashboard() {
  const user = await requireRole(["user", "admin"]);

  // Fetch credentials for this user
  const userCredentials = await getCredentials(user.id);
  const allResources = await getAllResources();

  // Fetch user reservations
  const allBookings = await getAllBookings();
  const userBookings = allBookings.filter((b) => b.user_id === user.id);

  // Split bookings by categories
  const activeAndUpcoming = userBookings.filter(
    (b) => b.status === "approved" || b.status === "in_use" || b.status === "confirmed"
  );
  const pendingRequests = userBookings.filter(
    (b) =>
      b.status === "pending_review" ||
      b.status === "pending_verification" ||
      b.status === "waitlisted" ||
      b.status === "rejected"
  );
  const pastBookings = userBookings.filter(
    (b) => b.status === "returned" || b.status === "completed" || b.status === "flagged_incident"
  );

  // Notifications
  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Incidents involving this user
  const allIncidents = await getIncidents();
  const userIncidents = allIncidents.filter((i) => i.affected_user_id === user.id);

  // Run eligibility checks on all resources
  const eligibilitySummaries = allResources.map((res) => {
    const check = checkEligibility(
      (res.requirements || []).map((r, idx) => ({
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
            <Link href="/judge">
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                Judge Script
              </Button>
            </Link>

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

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Active / Upcoming
          </span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">
            {activeAndUpcoming.length}
          </span>
          <span className="text-[11px] text-slate-500">Passes & In-Use</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Requests in Queue
          </span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {pendingRequests.length}
          </span>
          <span className="text-[11px] text-slate-500">Under faculty review</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Completed Sessions
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
            {pastBookings.length}
          </span>
          <span className="text-[11px] text-slate-500">Condition diff logged</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
            Unread Alerts
          </span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
            {unreadCount}
          </span>
          <span className="text-[11px] text-slate-500">Notification updates</span>
        </div>
      </div>

      {/* Active & Upcoming Bookings (with QR passes) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              Active & Upcoming Reservations
            </h2>
            <p className="text-xs text-slate-500">
              Present digital QR passes to station technicians for physical check-in and handover.
            </p>
          </div>
          <Link href="/bookings">
            <Button variant="outline" size="sm" className="text-xs">
              View Handover Hub
            </Button>
          </Link>
        </div>

        {activeAndUpcoming.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50">
            No active or upcoming bookings right now. Explore the catalog below to request equipment access.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAndUpcoming.map((b) => {
              const res = allResources.find((r) => r.id === b.resource_id);
              const isApproved = b.status === "approved";
              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl border border-indigo-200 bg-white shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={isApproved ? "success" : "default"}
                        className={`text-[9px] uppercase font-bold ${!isApproved ? "bg-indigo-600" : ""}`}
                      >
                        {isApproved ? "Approved • Ready for Handover" : "Currently In Use"}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-400">#{b.id}</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{res?.name}</h3>
                    <p className="text-xs text-slate-500">{res?.location}</p>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">
                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Slot: {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="italic text-slate-600 line-clamp-1">&quot;{b.purpose}&quot;</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Clearance
                    </span>

                    <Link href={`/bookings/${b.id}`}>
                      <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold">
                        <QrCode className="w-3.5 h-3.5" /> View Pass & Diff
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Incidents & Inquiries (Step 9 Due Process) */}
      {userIncidents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Incidents &amp; Variance Inquiries Requiring Response
            </h3>
            <Badge variant="destructive">{userIncidents.length} Pending Due Process</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl border-2 border-rose-300 bg-rose-50/40 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                      Status: {inc.status} • {inc.severity}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400">#{inc.id}</span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{inc.title || `${inc.type.toUpperCase()} Report`}</h4>
                  <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-rose-200 leading-relaxed">
                    {inc.description}
                  </p>

                  <div className="text-[11px] text-rose-800 bg-rose-100/60 p-2 rounded border border-rose-200">
                    <strong>Due Process Guaranteed:</strong> You may submit your factual statement and physical photos before any manager finding is made.
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-rose-200">
                  <span className="text-[11px] text-slate-500 font-mono">Booking: #{inc.booking_id}</span>
                  <Link href={`/incidents/${inc.id}`}>
                    <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      View Due Process &amp; Respond
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests Queue & Status */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Requests & Application Status
            </h3>
            <Badge variant="outline">{pendingRequests.length} Active</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((b) => {
              const res = allResources.find((r) => r.id === b.resource_id);
              let statusBadge = <Badge variant="warning">Under Review</Badge>;
              let statusExplanation = "Awaiting human review by station owner / manager.";

              if (b.status === "waitlisted") {
                statusBadge = <Badge variant="outline" className="border-amber-400 text-amber-800">Waitlisted</Badge>;
                statusExplanation = "Contested slot. You are in fair-share priority line.";
              } else if (b.status === "rejected") {
                statusBadge = <Badge variant="destructive">Declined</Badge>;
                statusExplanation = b.rejection_reason || "Declined with plain-language explanation.";
              }

              return (
                <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{res?.name}</span>
                    {statusBadge}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{statusExplanation}</p>
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    &quot;{b.purpose}&quot;
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: Credentials & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: My Verified Credentials */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-indigo-600" />
                  My Qualifications
                </CardTitle>
                <Link href="/credentials/request">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    + Request
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-xs">
                Certifications and safety clearance on file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userCredentials.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs">
                  No certifications registered yet. Request endorsements to unlock Class 4 laser cutters and cleanrooms.
                </div>
              ) : (
                userCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-xs text-slate-900 leading-snug">
                        {cred.title}
                      </span>
                      <Badge variant="success" className="text-[9px]">Verified</Badge>
                    </div>
                    {cred.verification_notes && (
                      <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                        {cred.verification_notes}
                      </p>
                    )}
                  </div>
                ))
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Resource Eligibility Matrix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Plain-language requirement checks evaluated in real time.
                  </CardDescription>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm" className="text-xs">
                    Full Catalog
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {eligibilitySummaries.map(({ resource, eligibility }) => (
                <div
                  key={resource.id}
                  className={`p-3.5 rounded-xl border transition ${
                    eligibility.isEligible
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-bold text-sm text-slate-900">{resource.name}</span>
                      <span className="text-xs text-slate-500 block">
                        {resource.category.replace("_", " ")} • {resource.location}
                      </span>
                    </div>

                    <div>
                      {eligibility.isEligible ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Eligible to Reserve
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="w-3 h-3" /> Prerequisites Missing
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-white/80 p-2 rounded border border-slate-100">
                    {eligibility.summary}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

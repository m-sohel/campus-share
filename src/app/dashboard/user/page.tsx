import { requireRole } from "@/lib/auth/role-guard";
import { getAllBookings, getNotifications, getCredentials, getAllResources, getIncidents } from "@/lib/data/store";
import { checkEligibility } from "@/lib/rules/eligibility";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileBadge,
  Sparkles,
  QrCode,
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
      <div className="rounded-3xl bg-gradient-to-r from-dusty-olive-950 via-soft-celadon-950 to-muted-teal-950 text-white p-6 sm:p-8 shadow-md border border-celadon-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-tea-green-300 text-2xl font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
                <Badge variant="accent" className="uppercase text-xs font-bold border-0">
                  Borrower / Researcher
                </Badge>
              </div>
              <p className="text-dusty-olive-300 text-sm mt-1">
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

            <div className="bg-white/10 backdrop-blur rounded-2xl px-4 py-2 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-wider text-dusty-olive-300 block font-semibold">
                Reputation Score
              </span>
              <span className="text-2xl font-extrabold text-tea-green-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-5 h-5 text-celadon-400" />
                {user.reputation_score} / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Active / Upcoming
          </span>
          <span className="text-2xl font-extrabold text-celadon-700 mt-1 block">
            {activeAndUpcoming.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Passes &amp; In-Use</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Requests in Queue
          </span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
            {pendingRequests.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Under faculty review</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Completed Sessions
          </span>
          <span className="text-2xl font-extrabold text-muted-teal-700 mt-1 block">
            {pastBookings.length}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Condition diff logged</span>
        </div>

        <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider text-dusty-olive-500 font-semibold block">
            Unread Alerts
          </span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
            {unreadCount}
          </span>
          <span className="text-[11px] text-dusty-olive-500">Notification updates</span>
        </div>
      </div>

      {/* Active & Upcoming Bookings (with QR passes) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-dusty-olive-950 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-celadon-700" />
              Active &amp; Upcoming Reservations
            </h2>
            <p className="text-xs text-dusty-olive-600">
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
          <div className="p-8 rounded-2xl border border-dashed border-dusty-olive-300 text-center text-xs text-dusty-olive-500 bg-dusty-olive-50/40">
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
                  className="p-5 rounded-2xl border border-dusty-olive-200/90 bg-white hover:border-celadon-400 shadow-xs flex flex-col justify-between space-y-3 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={isApproved ? "success" : "teal"}
                        className="text-[9px] uppercase font-bold"
                      >
                        {isApproved ? "Approved • Ready for Handover" : "Currently In Use"}
                      </Badge>
                      <span className="text-[10px] font-mono text-dusty-olive-400">#{b.id.slice(0, 12)}</span>
                    </div>

                    <h3 className="font-bold text-base text-dusty-olive-950">{res?.name}</h3>
                    <p className="text-xs text-dusty-olive-600">{res?.location}</p>

                    <div className="bg-dusty-olive-50/60 p-2.5 rounded-xl border border-dusty-olive-200/60 text-xs text-dusty-olive-800">
                      <div className="flex items-center gap-1 text-dusty-olive-500 mb-1">
                        <Clock className="w-3.5 h-3.5 text-celadon-700" />
                        <span>
                          Slot: {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="italic text-dusty-olive-700 line-clamp-1">&quot;{b.purpose}&quot;</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-dusty-olive-100">
                    <span className="text-[11px] text-celadon-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-celadon-700" /> Verified Clearance
                    </span>

                    <Link href={`/bookings/${b.id}`}>
                      <Button size="sm" className="h-8 text-xs bg-celadon-700 hover:bg-celadon-800 text-white gap-1.5 font-bold shadow-xs">
                        <QrCode className="w-3.5 h-3.5" /> View Pass &amp; Diff
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
            <h3 className="font-bold text-base text-dusty-olive-950 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Incidents &amp; Variance Inquiries Requiring Response
            </h3>
            <Badge variant="destructive">{userIncidents.length} Pending Due Process</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl border-2 border-rose-300 bg-rose-50/50 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                      Status: {inc.status} • {inc.severity}
                    </Badge>
                    <span className="text-[10px] font-mono text-dusty-olive-400">#{inc.id.slice(0, 12)}</span>
                  </div>

                  <h4 className="font-bold text-sm text-dusty-olive-950">{inc.title || `${inc.type.toUpperCase()} Report`}</h4>
                  <p className="text-xs text-dusty-olive-800 bg-white/90 p-2.5 rounded-xl border border-rose-200 leading-relaxed">
                    {inc.description}
                  </p>

                  <div className="text-[11px] text-rose-900 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200">
                    <strong>Due Process Guaranteed:</strong> You may submit your factual statement and physical photos before any manager finding is made.
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-rose-200">
                  <span className="text-[11px] text-dusty-olive-600 font-mono">Booking: #{inc.booking_id.slice(0, 12)}</span>
                  <Link href={`/incidents/${inc.id}`}>
                    <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 shadow-xs">
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
            <h3 className="font-bold text-base text-dusty-olive-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Requests &amp; Application Status
            </h3>
            <Badge variant="outline">{pendingRequests.length} Active</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((b) => {
              const res = allResources.find((r) => r.id === b.resource_id);
              let statusBadge = <Badge variant="warning">Under Review</Badge>;
              let statusExplanation = "Awaiting human review by station owner / manager.";

              if (b.status === "waitlisted") {
                statusBadge = <Badge variant="teal">Waitlisted</Badge>;
                statusExplanation = "Contested slot. You are in fair-share priority line.";
              } else if (b.status === "rejected") {
                statusBadge = <Badge variant="destructive">Declined</Badge>;
                statusExplanation = b.rejection_reason || "Declined with plain-language explanation.";
              }

              return (
                <div key={b.id} className="p-4 rounded-2xl border border-dusty-olive-200/90 bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-dusty-olive-950">{res?.name}</span>
                    {statusBadge}
                  </div>
                  <p className="text-xs text-dusty-olive-600 leading-relaxed">{statusExplanation}</p>
                  <p className="text-[11px] text-dusty-olive-600 italic bg-dusty-olive-50/60 p-2 rounded-xl border border-dusty-olive-200/60">
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
          <Card className="border-dusty-olive-200/90 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-dusty-olive-950">
                  <FileBadge className="w-5 h-5 text-celadon-700" />
                  My Qualifications
                </CardTitle>
                <Link href="/credentials/request">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    + Request
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-xs text-dusty-olive-500">
                Certifications and safety clearance on file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userCredentials.length === 0 ? (
                <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-amber-950 text-xs">
                  No certifications registered yet. Request endorsements to unlock Class 4 laser cutters and cleanrooms.
                </div>
              ) : (
                userCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3 rounded-xl border border-dusty-olive-200/80 bg-dusty-olive-50/50 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-xs text-dusty-olive-950 leading-snug">
                        {cred.title}
                      </span>
                      <Badge variant="success" className="text-[9px]">Verified</Badge>
                    </div>
                    {cred.verification_notes && (
                      <p className="text-[11px] text-dusty-olive-600 bg-white p-2 rounded-lg border border-dusty-olive-200/70">
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
          <Card className="border-dusty-olive-200/90 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-dusty-olive-950">
                    <Sparkles className="w-5 h-5 text-celadon-700" />
                    Resource Eligibility Matrix
                  </CardTitle>
                  <CardDescription className="text-xs text-dusty-olive-500">
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
                  className={`p-3.5 rounded-2xl border transition ${
                    eligibility.isEligible
                      ? "border-celadon-300 bg-celadon-50/40"
                      : "border-dusty-olive-200/90 bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-bold text-sm text-dusty-olive-950">{resource.name}</span>
                      <span className="text-xs text-dusty-olive-500 block">
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

                  <p className="text-xs text-dusty-olive-700 leading-relaxed bg-white/90 p-2.5 rounded-xl border border-dusty-olive-100">
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

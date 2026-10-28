import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getAllBookings, getAllResources, getAllUsers } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ClipboardCheck,
  QrCode,
  ArrowRight,
  Clock,
  Building2,
  User,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";

export default async function BookingsListPage() {
  const user = await getCurrentUser();
  const bookings = await getAllBookings();
  const resources = await getAllResources();
  const users = getAllUsers();

  const getResource = (id: string) => resources.find((r) => r.id === id);
  const getUser = (id: string) => users.find((u) => u.id === id);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="uppercase text-xs font-bold bg-white/20 text-white border-0">
                  Lifecycle Steps 7–10
                </Badge>
                <span className="text-indigo-200 text-xs">• Handover & Condition Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                Reservations & Physical Handover Desk
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Execute mobile-first initial check-ins (Step 7), return condition diff inspections (Step 8), review auto-drafted incidents (Step 9), and inspect the tamper-evident audit history (Step 10).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 border border-white/10 text-center">
                <span className="text-[11px] uppercase tracking-wider text-indigo-200 block font-semibold">
                  Total Bookings
                </span>
                <span className="text-2xl font-extrabold text-white">
                  {bookings.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Testing Guide Banner */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs sm:text-sm text-indigo-950 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-indigo-950">
              Stage 4 Quick Testing Matrix
            </strong>
            <p className="text-indigo-800 leading-relaxed text-xs">
              1. <strong>Epilog Laser Cutter:</strong> Approved reservation ready for Step 7 Check-in (or scan QR pass). Handover signs off and transitions status to In Use.<br />
              2. <strong>Keysight Oscilloscope:</strong> Currently in use, ready for Step 8 Return. Mark 1 item as damaged to test live condition diffing and auto-draft incident creation.<br />
              3. <strong>Prusa MK4 3D Printer:</strong> Currently in use, ready for clean return test (all OK).<br />
              4. <strong>Sony FX3 Camera Kit:</strong> Completed booking showcasing full side-by-side diff history.
            </p>
          </div>
        </div>

        {/* Bookings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((b) => {
            const res = getResource(b.resource_id);
            const borrower = getUser(b.user_id);

            return (
              <Card key={b.id} className="border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-start justify-between gap-2">
                      <StatusBadge status={b.status} />
                      <span className="text-[10px] font-mono text-slate-400">#{b.id.slice(0, 10)}</span>
                    </div>
                    <CardTitle className="text-base leading-snug mt-2">
                      {res?.name || "Equipment Station"}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      {res?.location || "Campus Facility"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs text-slate-700">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        {borrower?.full_name || "Borrower"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Fairness: {b.fairness_score}/10
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Reservation Window:
                      </span>
                      <p className="font-semibold text-slate-900 text-xs">
                        {new Date(b.start_time).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                        {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <p className="text-slate-600 italic text-[11px] line-clamp-2">
                      &quot;{b.purpose}&quot;
                    </p>
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link href={`/bookings/${b.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    Details & Diff <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {b.status === "approved" && (
                      <Link href={`/bookings/${b.id}/check-in`}>
                        <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Check-in
                        </Button>
                      </Link>
                    )}

                    {b.status === "in_use" && (
                      <Link href={`/bookings/${b.id}/return`}>
                        <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1">
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Return
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="success" className="text-[10px] uppercase font-bold">
          Approved (Ready for Check-in)
        </Badge>
      );
    case "in_use":
      return (
        <Badge variant="default" className="bg-indigo-600 text-[10px] uppercase font-bold">
          In Use
        </Badge>
      );
    case "returned":
      return (
        <Badge variant="success" className="text-[10px] uppercase font-bold">
          Returned
        </Badge>
      );
    case "flagged_incident":
      return (
        <Badge variant="destructive" className="text-[10px] uppercase font-bold">
          Flagged Incident
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
          Completed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[10px] uppercase">{status}</Badge>;
  }
}

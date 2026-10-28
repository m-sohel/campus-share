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
import { DemoClockControl } from "@/components/clock/DemoClockControl";

export default async function BookingsListPage() {
  const user = await getCurrentUser();
  const bookings = await getAllBookings();
  const resources = await getAllResources();
  const users = getAllUsers();

  const getResource = (id: string) => resources.find((r) => r.id === id);
  const getUser = (id: string) => users.find((u) => u.id === id);

  return (
    <div className="min-h-screen bg-dusty-olive-50/40 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-dusty-olive-950 via-soft-celadon-950 to-muted-teal-950 text-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="accent" className="uppercase text-xs font-bold border-0">
                  Lifecycle Steps 7–10
                </Badge>
                <span className="text-tea-green-300 text-xs font-semibold">• Handover &amp; Condition Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">
                Reservations &amp; Physical Handover Desk
              </h1>
              <p className="text-dusty-olive-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Execute mobile-first initial check-ins (Step 7), return condition diff inspections (Step 8), review auto-drafted incidents (Step 9), and inspect the tamper-evident audit history (Step 10).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 border border-white/10 text-center">
                <span className="text-[11px] uppercase tracking-wider text-tea-green-300 block font-semibold">
                  Total Bookings
                </span>
                <span className="text-2xl font-extrabold text-white">
                  {bookings.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Clock Quick Access */}
        <DemoClockControl />

        {/* Quick Testing Guide Banner */}
        <div className="rounded-2xl border border-soft-celadon-300 bg-soft-celadon-50/80 p-4 text-xs sm:text-sm text-celadon-950 flex items-start gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-celadon-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-celadon-950 font-bold">
              Stage 4 Quick Testing Matrix
            </strong>
            <p className="text-celadon-900 leading-relaxed text-xs">
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
              <Card key={b.id} className="border-dusty-olive-200/90 shadow-xs hover:border-celadon-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
                <div>
                  <CardHeader className="pb-3 border-b border-dusty-olive-100 bg-dusty-olive-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <StatusBadge status={b.status} />
                      <span className="text-[10px] font-mono text-dusty-olive-400">#{b.id.slice(0, 10)}</span>
                    </div>
                    <CardTitle className="text-base leading-snug mt-2 text-dusty-olive-950">
                      {res?.name || "Equipment Station"}
                    </CardTitle>
                    <CardDescription className="text-xs text-dusty-olive-600">
                      {res?.location || "Campus Facility"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs text-dusty-olive-700">
                    <div className="flex items-center justify-between text-dusty-olive-800">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <User className="w-3.5 h-3.5 text-celadon-700" />
                        {borrower?.full_name || "Borrower"}
                      </span>
                      <span className="text-[11px] text-dusty-olive-500 font-mono">
                        Fairness: {b.fairness_score}/10
                      </span>
                    </div>

                    <div className="bg-dusty-olive-50 p-2.5 rounded-xl border border-dusty-olive-200/80 space-y-1">
                      <span className="text-[11px] text-dusty-olive-500 font-medium block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-dusty-olive-400" /> Reservation Window:
                      </span>
                      <p className="font-semibold text-dusty-olive-950 text-xs">
                        {new Date(b.start_time).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                        {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <p className="text-dusty-olive-600 italic text-[11px] line-clamp-2">
                      &quot;{b.purpose}&quot;
                    </p>
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3.5 bg-dusty-olive-50/60 border-t border-dusty-olive-100 flex items-center justify-between gap-2">
                  <Link href={`/bookings/${b.id}`} className="text-xs font-bold text-celadon-800 hover:text-celadon-950 flex items-center gap-1">
                    Details &amp; Diff <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {b.status === "approved" && (
                      <Link href={`/bookings/${b.id}/check-in`}>
                        <Button size="sm" className="h-8 text-xs bg-celadon-700 hover:bg-celadon-800 text-white gap-1 font-bold">
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Check-in
                        </Button>
                      </Link>
                    )}

                    {b.status === "in_use" && (
                      <Link href={`/bookings/${b.id}/return`}>
                        <Button size="sm" className="h-8 text-xs bg-muted-teal-700 hover:bg-muted-teal-800 text-white gap-1 font-bold">
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
        <Badge variant="teal" className="text-[10px] uppercase font-bold">
          In Use
        </Badge>
      );
    case "returned":
      return (
        <Badge variant="default" className="text-[10px] uppercase font-bold">
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

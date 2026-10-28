import { getCurrentUser } from "@/lib/auth/role-guard";
import { getAllBookings, getAllResources } from "@/lib/data/store";
import { CreateIncidentForm } from "@/components/incidents/CreateIncidentForm";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewIncidentPage({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string; type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/incidents/new");
  }

  const { booking_id, type } = await searchParams;
  const bookings = await getAllBookings();
  const resources = await getAllResources();

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation */}
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Incident Governance
        </Link>

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 text-white p-6 sm:p-8 shadow-md">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="uppercase text-xs font-bold border-0">
              Community Accountability
            </Badge>
            <span className="text-rose-200 text-xs">• Due Process Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Report Equipment Incident or Protocol Issue
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
            Submit physical damage, late returns, no-shows, safety discrepancies, or equipment failure. Incidents are reviewed by station technicians and Campus Administration with auditable due process.
          </p>
        </div>

        {/* Form Card */}
        <CreateIncidentForm
          bookings={bookings}
          resources={resources}
          currentUserId={user.id}
          initialBookingId={booking_id}
          initialType={type}
        />
      </div>
    </div>
  );
}

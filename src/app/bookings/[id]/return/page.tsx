import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getBookingById, getResourceById, getUserById, getConditionRecords } from "@/lib/data/store";
import { ReturnForm } from "@/components/bookings/ReturnForm";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReturnPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReturnPage({ params }: ReturnPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=/bookings/${id}/return`);
  }

  // Only manager, owner, or admin can perform return inspection
  if (user.role !== "manager" && user.role !== "owner" && user.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Technician Clearance Required</h1>
        <p className="text-sm text-slate-600">
          Post-session return inspections must be signed off by a facility technician, resource owner, or lab administrator.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Switch to Jordan Taylor (Technician)
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const booking = await getBookingById(id);
  if (!booking) {
    notFound();
  }

  const resource = await getResourceById(booking.resource_id);
  if (!resource) {
    notFound();
  }

  const borrower = getUserById(booking.user_id);
  const conditionRecords = await getConditionRecords(booking.id);
  const initialRecord = conditionRecords.find((c) => c.stage === "check_in") || null;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Booking Details
          </Link>
          <span className="text-[11px] font-mono text-slate-500">ID: {booking.id}</span>
        </div>

        {/* Page Title & Explanation */}
        <div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
              8
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              Return Inspection & Condition Verification
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Inspect equipment condition and compare directly against the Step 7 baseline. If any degradation is found, an incident is auto-drafted for review (zero automated penalties).
          </p>
        </div>

        {/* Form */}
        <ReturnForm
          booking={booking}
          resource={resource}
          borrower={borrower}
          technicianName={`${user.full_name} (${user.department || user.role})`}
          initialRecord={initialRecord}
        />
      </div>
    </div>
  );
}

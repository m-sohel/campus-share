import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { getBookingById, getResourceById, getUserById } from "@/lib/data/store";
import { CheckInForm } from "@/components/bookings/CheckInForm";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckInPageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=/bookings/${id}/check-in`);
  }

  // Only manager, owner, or admin can perform check-in
  if (user.role !== "manager" && user.role !== "owner" && user.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-dusty-olive-950">Technician Clearance Required</h1>
        <p className="text-sm text-dusty-olive-600">
          Physical check-in inspections must be conducted by a facility technician, resource owner, or lab administrator.
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

  return (
    <div className="min-h-screen bg-dusty-olive-50/40 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-dusty-olive-600 hover:text-dusty-olive-950 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Booking Details
          </Link>
          <span className="text-[11px] font-mono text-dusty-olive-500">ID: {booking.id.slice(0, 12)}</span>
        </div>

        {/* Page Title & Explanation */}
        <div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-xl bg-celadon-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              7
            </span>
            <h1 className="text-2xl font-bold text-dusty-olive-950">
              Physical Check-in &amp; Handover
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-dusty-olive-600 mt-1.5 leading-relaxed">
            Perform physical inspection with borrower present. Signing off this checklist establishes the verified baseline condition and transitions status to <strong>In Use</strong>.
          </p>
        </div>

        {/* Form */}
        <CheckInForm
          booking={booking}
          resource={resource}
          borrower={borrower}
          technicianName={`${user.full_name} (${user.department || user.role})`}
        />
      </div>
    </div>
  );
}

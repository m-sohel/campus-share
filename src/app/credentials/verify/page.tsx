import { requireRole } from "@/lib/auth/role-guard";
import { getCredentials } from "@/lib/data/store";
import { SEED_USERS } from "@/lib/data/seed-data";
import { VerificationQueue } from "@/components/credentials/VerificationQueue";
import { FileCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Profile } from "@/types";

export default async function CredentialVerificationPage() {
  const currentUser = await requireRole(["owner", "manager", "admin"]);
  const allCredentials = await getCredentials();

  const profiles: Profile[] = SEED_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    department: u.department,
    affiliation: u.affiliation,
    avatar_url: null,
    reputation_score: u.reputation_score,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div>
        <Link
          href={`/dashboard/${currentUser.role}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-dusty-olive-600 hover:text-dusty-olive-950 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-soft-celadon-100 border border-soft-celadon-200 flex items-center justify-center text-celadon-700 shadow-xs">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-dusty-olive-950 tracking-tight">
              Safety Credential Verification Queue
            </h1>
            <p className="text-xs sm:text-sm text-dusty-olive-600 mt-0.5">
              Review and sign off on equipment certifications, laser safety clearances, and training requests.
            </p>
          </div>
        </div>
      </div>

      <VerificationQueue
        initialCredentials={allCredentials}
        profiles={profiles}
        currentUser={currentUser}
      />
    </div>
  );
}

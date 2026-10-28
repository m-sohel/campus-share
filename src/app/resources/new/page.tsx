import { requireRole } from "@/lib/auth/role-guard";
import { ResourceForm } from "@/components/resources/ResourceForm";

export default async function NewResourcePage() {
  const user = await requireRole(["owner", "admin"]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          List a New Campus or Makerspace Resource
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Make underutilized machinery and laboratories safely discoverable by qualified researchers and students.
        </p>
      </div>

      <ResourceForm initialResource={{ owner_id: user.id }} />
    </div>
  );
}


import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/role-guard";
import { getResourceById } from "@/lib/data/store";
import { ResourceForm } from "@/components/resources/ResourceForm";

interface EditResourceProps {
  params: Promise<{ id: string }>;
}

export default async function EditResourcePage({ params }: EditResourceProps) {
  const { id } = await params;
  const user = await requireRole(["owner", "admin"]);
  const resource = await getResourceById(id);

  if (!resource) {
    notFound();
  }

  // Ensure only the resource owner or an admin can edit
  if (user.role !== "admin" && resource.owner_id !== user.id) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-sm text-slate-600 mt-2">
          Only the designated owner of this resource or a campus safety administrator can modify its specifications.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Edit Resource Specifications
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Update specifications, safety guidelines, and inspection checklist for {resource.name}.
        </p>
      </div>

      <ResourceForm initialResource={resource} isEditing={true} />
    </div>
  );
}


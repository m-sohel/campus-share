import { getAllResources, getCredentials } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { ResourceCatalog } from "@/components/resources/ResourceCatalog";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Compass } from "lucide-react";

export default async function ResourcesDiscoveryPage() {
  const currentUser = await getCurrentUser();
  const resources = await getAllResources();
  const userCredentials = currentUser ? await getCredentials(currentUser.id) : [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            Equipment & Facilities Discovery
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus & Makerspace Catalog
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Discover shared precision fabrication, media kits, electronic benches, and specialized labs.
          </p>
        </div>

        {currentUser && (currentUser.role === "owner" || currentUser.role === "admin") && (
          <Link href="/resources/new">
            <Button className="font-semibold gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              List New Resource
            </Button>
          </Link>
        )}
      </div>

      <ResourceCatalog
        initialResources={resources}
        currentUser={currentUser}
        userCredentials={userCredentials}
      />
    </div>
  );
}


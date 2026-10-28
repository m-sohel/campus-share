import Link from "next/link";
import { getAllResources, getCredentials } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/auth/role-guard";
import { ResourceCatalog } from "@/components/resources/ResourceCatalog";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ArrowRight,
  FileBadge,
  Lock,
  Award,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const resources = await getAllResources();
  const userCredentials = currentUser ? await getCredentials(currentUser.id) : [];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-soft-celadon-50/80 via-white to-dusty-olive-50/40 py-14 sm:py-20 border-b border-dusty-olive-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          {/* Judge Evaluation Callout Banner */}
          <div className="mb-6 mx-auto max-w-2xl bg-tea-green-100/80 border border-tea-green-300/90 rounded-2xl p-4 text-tea-green-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-left">
              <Award className="w-5 h-5 text-tea-green-800 shrink-0" />
              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-tea-green-950">
                  Hackathon Judge Evaluation Tour
                </strong>
                <p className="text-xs text-tea-green-900/90 leading-snug">
                  Follow the 5-minute interactive script covering the complete 10-step lifecycle.
                </p>
              </div>
            </div>
            <Link href="/judge" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" variant="accent" className="w-full sm:w-auto text-xs font-bold gap-1 shadow-xs">
                Open /judge Script <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-soft-celadon-100 border border-soft-celadon-200 text-celadon-900 text-xs font-bold mb-6 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-celadon-700" />
            University Campus &amp; Community Makerspace Trust Network
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-dusty-olive-950 tracking-tight max-w-4xl mx-auto leading-tight">
            Unlock High-Value Campus &amp; Makerspace Resources
          </h1>

          <p className="mt-4 text-base sm:text-lg text-dusty-olive-700 max-w-2xl mx-auto leading-relaxed">
            A trusted resource-sharing platform where verified owners list equipment, users prove eligibility with credentials, and every booking is governed by plain-language accountability.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="font-semibold gap-2 shadow-xs">
                Enter Platform &amp; Evaluation Console
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#catalog">
              <Button size="lg" variant="outline" className="font-semibold">
                Explore Shared Equipment Catalog
              </Button>
            </a>
          </div>

          {/* 3 Pillars */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            <div className="p-6 rounded-2xl border border-dusty-olive-200/90 bg-white shadow-xs hover:border-celadon-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-celadon-100 text-celadon-700 flex items-center justify-center mb-3">
                <FileBadge className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-dusty-olive-950">Credential-Backed Eligibility</h3>
              <p className="text-xs text-dusty-olive-600 mt-1.5 leading-relaxed">
                Automated checks verify laser safety, cleanroom protocol, and drone licenses with zero unexplained denials.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-dusty-olive-200/90 bg-white shadow-xs hover:border-celadon-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-tea-green-100 text-tea-green-800 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-dusty-olive-950">Verified Condition Records</h3>
              <p className="text-xs text-dusty-olive-600 mt-1.5 leading-relaxed">
                Step 7 check-in and Step 8 return inspections with photo checklists ensure full accountability for expensive hardware.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-dusty-olive-200/90 bg-white shadow-xs hover:border-celadon-300 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-muted-teal-100 text-muted-teal-700 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-dusty-olive-950">Append-Only Audit Chain</h3>
              <p className="text-xs text-dusty-olive-600 mt-1.5 leading-relaxed">
                Every state transition and access decision writes to a SHA-256 cryptographically chained log for complete transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6">
        <ResourceCatalog
          initialResources={resources}
          currentUser={currentUser}
          userCredentials={userCredentials}
        />
      </section>
    </div>
  );
}

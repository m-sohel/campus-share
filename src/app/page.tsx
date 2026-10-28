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
} from "lucide-react";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const resources = await getAllResources();
  const userCredentials = currentUser ? await getCredentials(currentUser.id) : [];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-white py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          {/* Judge Evaluation Callout Banner */}
          <div className="mb-6 mx-auto max-w-2xl bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-left">
              <Award className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                  Hackathon Judge Evaluation Tour
                </strong>
                <p className="text-xs text-amber-800">
                  Follow the 5-minute interactive script covering the complete 10-step lifecycle.
                </p>
              </div>
            </div>
            <Link href="/judge" className="shrink-0 w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1 shadow-sm">
                Open /judge Script <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            University Campus & Community Makerspace Trust Network
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Unlock High-Value Campus & Makerspace Resources
          </h1>

          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            A trusted resource-sharing platform where verified owners list equipment, users prove eligibility with credentials, and every booking is governed by plain-language accountability.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="font-semibold gap-2 shadow-md">
                Enter Platform & Evaluation Console
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
            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                <FileBadge className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Credential-Backed Eligibility</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Automated checks verify laser safety, cleanroom protocol, and drone licenses with zero unexplained denials.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Verified Condition Records</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Step 7 check-in and Step 8 return inspections with photo checklists ensure full accountability for expensive hardware.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Append-Only Audit Chain</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Every state transition and access decision writes to a SHA-256 cryptographically chained log for complete transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section with Full Interactive Filters & Live Eligibility */}
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

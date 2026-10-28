"use client";

import { useState } from "react";
import Link from "next/link";
import { SEED_RESOURCES } from "@/lib/data/seed-data";
import { ResourceCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ArrowRight,
  MapPin,
  Lock,
  FileBadge,
} from "lucide-react";

const CATEGORIES: { label: string; value: ResourceCategory | "all" }[] = [
  { label: "All Equipment", value: "all" },
  { label: "Fabrication", value: "fabrication" },
  { label: "Electronics", value: "electronics" },
  { label: "Media Gear", value: "media" },
  { label: "Labs & Spaces", value: "labs_spaces" },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | "all">("all");

  const filteredResources =
    selectedCategory === "all"
      ? SEED_RESOURCES
      : SEED_RESOURCES.filter((r) => r.category === selectedCategory);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-white py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
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
                Explore 8 Seeded Resources
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

      {/* Catalog Section */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Shared Equipment & Facilities Catalog
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Showing {filteredResources.length} available resources across 4 active categories.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredResources.map((res) => (
            <Card
              key={res.id}
              className="group overflow-hidden border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={res.image_url}
                    alt={res.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-white/95 text-slate-900 backdrop-blur font-semibold text-[10px] uppercase">
                      {res.category.replace("_", " ")}
                    </Badge>
                  </div>
                  {res.is_high_demand && (
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold shadow-sm">
                        High Demand
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{res.location}</span>
                  </div>
                  <CardTitle className="text-base font-bold leading-snug text-slate-900 group-hover:text-indigo-600 transition">
                    {res.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 text-xs text-slate-600">
                  <p className="line-clamp-2 leading-relaxed">{res.description}</p>

                  <div className="space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Institution:</span>
                      <span className="font-semibold text-slate-800 capitalize">{res.institution}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Max Duration:</span>
                      <span className="font-semibold text-slate-800">{res.max_duration_hours}h max</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Min Notice:</span>
                      <span className="font-semibold text-slate-800">{res.min_lead_time_hours}h lead</span>
                    </div>
                  </div>

                  {res.requirements.length > 0 && (
                    <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded border border-amber-200 flex items-start gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Requires:</strong> {res.requirements[0].credential_type}</span>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 pt-0">
                <Link href="/login" className="block w-full">
                  <Button variant="default" size="sm" className="w-full font-medium gap-1.5">
                    Check Eligibility & Book
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

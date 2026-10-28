"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Resource, ResourceCategory, Credential, Profile } from "@/types";
import { checkEligibility } from "@/lib/rules/eligibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Lock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

interface ResourceCatalogProps {
  initialResources: Resource[];
  currentUser: Profile | null;
  userCredentials: Credential[];
}

const CATEGORIES: { label: string; value: ResourceCategory | "all" }[] = [
  { label: "All Equipment", value: "all" },
  { label: "Fabrication", value: "fabrication" },
  { label: "Electronics", value: "electronics" },
  { label: "Media Gear", value: "media" },
  { label: "Labs & Spaces", value: "labs_spaces" },
];

export function ResourceCatalog({
  initialResources,
  currentUser,
  userCredentials,
}: ResourceCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | "all">("all");
  const [selectedInstitution, setSelectedInstitution] = useState<"all" | "university" | "makerspace">("all");
  const [selectedCost, setSelectedCost] = useState<"all" | "free" | "deposit">("all");
  const [onlyEligible, setOnlyEligible] = useState(false);

  // Compute eligibility for every resource for current user
  const resourcesWithEligibility = useMemo(() => {
    return initialResources.map((res) => {
      const eligibility = checkEligibility(res.requirements || [], userCredentials);
      return {
        ...res,
        eligibility,
      };
    });
  }, [initialResources, userCredentials]);

  // Apply Search and Filters
  const filteredResources = useMemo(() => {
    return resourcesWithEligibility.filter((res) => {
      // 1. Category Filter
      if (selectedCategory !== "all" && res.category !== selectedCategory) {
        return false;
      }

      // 2. Institution Filter
      if (selectedInstitution !== "all" && res.institution !== selectedInstitution) {
        return false;
      }

      // 3. Cost Filter
      if (selectedCost === "free" && res.deposit_required_cents > 0) {
        return false;
      }
      if (selectedCost === "deposit" && res.deposit_required_cents === 0) {
        return false;
      }

      // 4. "I'm eligible for this" Filter
      if (onlyEligible && !res.eligibility.isEligible) {
        return false;
      }

      // 5. Search Query (name, description, location, category)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = res.name.toLowerCase().includes(query);
        const matchesDesc = res.description.toLowerCase().includes(query);
        const matchesLocation = res.location.toLowerCase().includes(query);
        const matchesCategory = res.category.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesLocation || matchesCategory;
      }

      return true;
    });
  }, [
    resourcesWithEligibility,
    selectedCategory,
    selectedInstitution,
    selectedCost,
    onlyEligible,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedInstitution("all");
    setSelectedCost("all");
    setOnlyEligible(false);
  };

  const isFiltered =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedInstitution !== "all" ||
    selectedCost !== "all" ||
    onlyEligible;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tool name, room, laser, 3D printer, oscilloscope..."
              className="pl-9 h-10 text-sm"
            />
          </div>

          {/* Quick Stats & Action */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              Showing <strong>{filteredResources.length}</strong> of {initialResources.length} stations
            </span>
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-700 h-8 gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Institution Filter */}
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value as "all" | "university" | "makerspace")}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Campuses & Facilities</option>
              <option value="university">University Lab Only</option>
              <option value="makerspace">Community Makerspace Only</option>
            </select>

            {/* Cost Filter */}
            <select
              value={selectedCost}
              onChange={(e) => setSelectedCost(e.target.value as "all" | "free" | "deposit")}
              className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Any Pricing</option>
              <option value="free">Free / No Deposit</option>
              <option value="deposit">Deposit Required</option>
            </select>

            {/* "I'm eligible for this" Toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-indigo-50/50 transition">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                I&apos;m eligible for this
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No matching equipment or spaces found
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {onlyEligible
                ? "You currently have the 'I'm eligible for this' filter active. Try unchecking it to view all resources, or request safety credentials."
                : "No resources matched your current keyword or filters. Try adjusting your query or resetting all filters."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5 text-xs font-semibold">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </Button>
            {currentUser?.role === "user" && (
              <Link href="/credentials/request">
                <Button size="sm" className="gap-1.5 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Request Training
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredResources.map((res) => {
            const { isEligible, checks } = res.eligibility;

            return (
              <Card
                key={res.id}
                className="group overflow-hidden border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={res.image_url || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800"}
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

                  {/* Header & Location */}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{res.location}</span>
                    </div>
                    <CardTitle className="text-base font-bold leading-snug text-slate-900 group-hover:text-indigo-600 transition">
                      <Link href={`/resources/${res.id}`} className="hover:underline">
                        {res.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>

                  {/* Body Content */}
                  <CardContent className="p-4 pt-1 space-y-3 text-xs text-slate-600">
                    <p className="line-clamp-2 leading-relaxed">{res.description}</p>

                    {/* Metadata specs */}
                    <div className="space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Institution:</span>
                        <span className="font-semibold text-slate-800 capitalize">{res.institution}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Max Session:</span>
                        <span className="font-semibold text-slate-800">{res.max_duration_hours}h max</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Notice Required:</span>
                        <span className="font-semibold text-slate-800">{res.min_lead_time_hours}h advance</span>
                      </div>
                    </div>

                    {/* Live Eligibility Pill */}
                    <div className="pt-1">
                      {isEligible ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Eligible to Request</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">
                            Requires: {checks[0]?.requirement.credential_type.replace(/_/g, " ") || "Training"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-0">
                  <Link href={`/resources/${res.id}`} className="block w-full">
                    <Button variant="default" size="sm" className="w-full font-medium gap-1.5">
                      View Details & Eligibility
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


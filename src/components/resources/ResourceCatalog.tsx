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
  Lock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
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

  // Filter resources
  const filteredResources = useMemo(() => {
    return resourcesWithEligibility.filter((res) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = res.name.toLowerCase().includes(query);
        const matchesDesc = res.description.toLowerCase().includes(query);
        const matchesLoc = res.location.toLowerCase().includes(query);
        const matchesCat = res.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesLoc && !matchesCat) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== "all" && res.category !== selectedCategory) {
        return false;
      }

      // 3. Institution
      if (selectedInstitution !== "all" && res.institution !== selectedInstitution) {
        return false;
      }

      // 4. Cost
      if (selectedCost === "free" && (res.deposit_required_cents || 0) > 0) {
        return false;
      }
      if (selectedCost === "deposit" && (res.deposit_required_cents || 0) === 0) {
        return false;
      }

      // 5. Only Eligible
      if (onlyEligible && !res.eligibility.isEligible) {
        return false;
      }

      return true;
    });
  }, [
    resourcesWithEligibility,
    searchQuery,
    selectedCategory,
    selectedInstitution,
    selectedCost,
    onlyEligible,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedInstitution("all");
    setSelectedCost("all");
    setOnlyEligible(false);
  };

  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedInstitution !== "all" ||
    selectedCost !== "all" ||
    onlyEligible;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="rounded-2xl border border-dusty-olive-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dusty-olive-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tool name, room, laser, 3D printer, oscilloscope..."
              className="pl-9 h-10 text-xs sm:text-sm"
            />
          </div>

          {/* Quick Stats & Action */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-dusty-olive-600">
              Showing <strong>{filteredResources.length}</strong> of {initialResources.length} stations
            </span>
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-celadon-800 hover:text-celadon-950 h-8 gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dusty-olive-100">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat.value
                    ? "bg-celadon-700 text-white shadow-xs"
                    : "bg-dusty-olive-100/80 text-dusty-olive-800 hover:bg-dusty-olive-200/70"
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
              className="h-9 px-2.5 rounded-lg border border-dusty-olive-300 bg-white text-xs font-medium text-dusty-olive-900 focus:outline-none focus:ring-2 focus:ring-celadon-600"
            >
              <option value="all">All Campuses &amp; Facilities</option>
              <option value="university">University Lab Only</option>
              <option value="makerspace">Community Makerspace Only</option>
            </select>

            {/* Cost Filter */}
            <select
              value={selectedCost}
              onChange={(e) => setSelectedCost(e.target.value as "all" | "free" | "deposit")}
              className="h-9 px-2.5 rounded-lg border border-dusty-olive-300 bg-white text-xs font-medium text-dusty-olive-900 focus:outline-none focus:ring-2 focus:ring-celadon-600"
            >
              <option value="all">Any Pricing</option>
              <option value="free">Free / No Deposit</option>
              <option value="deposit">Deposit Required</option>
            </select>

            {/* "I'm eligible for this" Toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dusty-olive-200 bg-soft-celadon-50/70 cursor-pointer hover:bg-soft-celadon-100/70 transition-colors">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="w-4 h-4 text-celadon-700 rounded accent-celadon-700 cursor-pointer"
              />
              <span className="font-semibold text-dusty-olive-900 flex items-center gap-1 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-celadon-700" />
                I&apos;m eligible for this
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-dusty-olive-300 bg-white p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-soft-celadon-100 flex items-center justify-center mx-auto text-celadon-700">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-dusty-olive-950">
              No matching equipment or spaces found
            </h3>
            <p className="text-xs text-dusty-olive-600 mt-1 leading-relaxed">
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
                className="group overflow-hidden border-dusty-olive-200/90 shadow-xs hover:border-celadon-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative h-44 w-full bg-dusty-olive-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={res.image_url || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800"}
                      alt={res.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <Badge variant="outline" className="bg-white/95 text-dusty-olive-900 border-dusty-olive-200 backdrop-blur font-bold text-[10px] uppercase">
                        {res.category.replace("_", " ")}
                      </Badge>
                    </div>

                    {res.is_high_demand && (
                      <div className="absolute top-2.5 right-2.5">
                        <Badge variant="destructive" className="text-[10px] uppercase font-bold shadow-xs">
                          High Demand
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Header & Location */}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-1 text-[11px] text-dusty-olive-500 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-dusty-olive-400 shrink-0" />
                      <span className="truncate">{res.location}</span>
                    </div>
                    <CardTitle className="text-base font-bold leading-snug text-dusty-olive-950 group-hover:text-celadon-800 transition-colors">
                      <Link href={`/resources/${res.id}`} className="hover:underline">
                        {res.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>

                  {/* Body Content */}
                  <CardContent className="p-4 pt-1 space-y-3 text-xs text-dusty-olive-600">
                    <p className="line-clamp-2 leading-relaxed text-dusty-olive-700">{res.description}</p>

                    {/* Metadata specs */}
                    <div className="space-y-1 text-[11px] bg-dusty-olive-50 p-2.5 rounded-xl border border-dusty-olive-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-dusty-olive-500">Institution:</span>
                        <span className="font-semibold text-dusty-olive-800 capitalize">{res.institution}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-dusty-olive-500">Max Session:</span>
                        <span className="font-semibold text-dusty-olive-800">{res.max_duration_hours}h max</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-dusty-olive-500">Notice Required:</span>
                        <span className="font-semibold text-dusty-olive-800">{res.min_lead_time_hours}h advance</span>
                      </div>
                    </div>

                    {/* Live Eligibility Pill */}
                    <div className="pt-1">
                      {isEligible ? (
                        <div className="flex items-center gap-1.5 text-celadon-900 bg-celadon-50 px-2.5 py-1.5 rounded-lg border border-celadon-200 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-celadon-700 shrink-0" />
                          <span>Eligible to Request</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-dusty-olive-800 bg-dusty-olive-100/70 px-2.5 py-1.5 rounded-lg border border-dusty-olive-200 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-dusty-olive-500 shrink-0" />
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
                    <Button variant="default" size="sm" className="w-full font-semibold gap-1.5">
                      View Details &amp; Eligibility
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

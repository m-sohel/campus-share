import { Resource } from "@/types";

/**
 * Calculates listing completeness percentage and identifies missing sections.
 * Pure function with zero external or server dependencies.
 */
export function calculateListingCompleteness(resource: Partial<Resource>): {
  score: number;
  percentage: number;
  isComplete: boolean;
  missing: string[];
} {
  let score = 0;
  const missing: string[] = [];

  if (resource.name && resource.name.trim().length >= 3) {
    score += 15;
  } else {
    missing.push("Resource Title");
  }

  if (resource.category) {
    score += 10;
  } else {
    missing.push("Category Selection");
  }

  if (resource.location && resource.location.trim().length >= 3) {
    score += 10;
  } else {
    missing.push("Location / Room Number");
  }

  if (resource.description && resource.description.trim().length >= 20) {
    score += 15;
  } else {
    missing.push("Detailed Description (20+ chars)");
  }

  if (resource.rules && resource.rules.trim().length >= 10) {
    score += 10;
  } else {
    missing.push("Usage Rules");
  }

  if (resource.safety_notes && resource.safety_notes.trim().length >= 5) {
    score += 10;
  } else {
    missing.push("Safety & Warning Notes");
  }

  if (resource.condition_checklist && resource.condition_checklist.length > 0) {
    score += 10;
  } else {
    missing.push("Inspection Condition Checklist");
  }

  if (resource.availability_slots && resource.availability_slots.length > 0) {
    score += 10;
  } else {
    missing.push("Weekly Availability Schedule");
  }

  if (resource.image_url && resource.image_url.trim().length > 0) {
    score += 10;
  } else {
    missing.push("Resource Photo URL");
  }

  return {
    score,
    percentage: Math.min(100, score),
    isComplete: score >= 80,
    missing,
  };
}


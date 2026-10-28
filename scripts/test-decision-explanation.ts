import { explainBookingDecision } from "../src/lib/rules/decision-explanation";
import { Booking, Resource, Profile } from "../src/types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log("=== RUNNING DECISION EXPLANATION (WHY PANEL) UNIT TESTS ===\n");

const dummyResource: Resource = {
  id: "res-1",
  owner_id: "owner-1",
  name: "Epilog Laser Cutter",
  category: "fabrication",
  description: "High power laser",
  location: "Room 101",
  institution: "university",
  rules: "Always wear laser goggles.",
  requires_supervision: true,
  min_lead_time_hours: 2,
  max_duration_hours: 4,
  is_high_demand: true,
  deposit_required_cents: 0,
  status: "available",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const dummyReviewer: Profile = {
  id: "owner-1",
  email: "owner@campusshare.edu",
  full_name: "Prof. Elena Rostova",
  role: "owner",
  reputation_score: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 1: Approved Booking
{
  const booking: Booking = {
    id: "b-1",
    resource_id: "res-1",
    user_id: "u-1",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    status: "approved",
    purpose: "Capstone Research",
    fairness_score: 1.0,
    reviewed_by: dummyReviewer.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const explanation = explainBookingDecision({
    booking,
    resource: dummyResource,
    reviewer: dummyReviewer,
  });

  assert(explanation.badgeVariant === "success", "Approved booking gets success badge");
  assert(explanation.headline.includes("Prof. Elena Rostova"), "Mentions reviewer in headline");
  assert(explanation.decisionNarrative.includes("officially authorized"), "Contains authorized narrative");
  assert(explanation.policyGuidelines.some((g) => g.includes("Mandatory Supervision")), "Reflects resource rules");
}

// Test 2: Rejected Booking with Required Reason
{
  const booking: Booking = {
    id: "b-2",
    resource_id: "res-1",
    user_id: "u-2",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    status: "rejected",
    purpose: "Testing",
    fairness_score: 1.0,
    rejection_reason: "High voltage certification expired last month.",
    reviewed_by: dummyReviewer.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const explanation = explainBookingDecision({
    booking,
    resource: dummyResource,
    reviewer: dummyReviewer,
  });

  assert(explanation.badgeVariant === "destructive", "Rejected booking gets destructive badge");
  assert(explanation.humanReason === "High voltage certification expired last month.", "Records human reason");
  assert(explanation.decisionNarrative.includes("High voltage certification expired"), "Narrative includes human reason");
}

// Test 3: Waitlisted Booking
{
  const booking: Booking = {
    id: "b-3",
    resource_id: "res-1",
    user_id: "u-3",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    status: "waitlisted",
    purpose: "Workshop",
    fairness_score: 1.0,
    rejection_reason: "Slot currently held by Capstone team. Placed in position #1.",
    reviewed_by: dummyReviewer.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const explanation = explainBookingDecision({
    booking,
    resource: dummyResource,
    reviewer: dummyReviewer,
  });

  assert(explanation.badgeVariant === "warning", "Waitlist gets warning badge");
  assert(explanation.decisionNarrative.includes("active waitlist"), "Narrative describes waitlist");
}

// Test 4: Cancelled Booking
{
  const booking: Booking = {
    id: "b-4",
    resource_id: "res-1",
    user_id: "u-4",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    status: "cancelled",
    purpose: "Workshop",
    fairness_score: 1.0,
    cancellation_reason: "Schedule conflict with exam.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const explanation = explainBookingDecision({
    booking,
    resource: dummyResource,
  });

  assert(explanation.badgeVariant === "secondary", "Cancelled gets secondary badge");
  assert(explanation.humanReason === "Schedule conflict with exam.", "Contains cancellation reason");
}

console.log("\n✨ ALL DECISION EXPLANATION UNIT TESTS PASSED!\n");


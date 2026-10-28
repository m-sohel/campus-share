import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  reviewBooking,
  getBookingById,
  calculateResourceUtilization,
  resetDemoStore,
  getAuditLogs,
} from "../src/lib/data/store";
import { DEMO_USERS } from "../src/lib/data/demo-users";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runStage6Tests() {
  console.log("\n🧪 RUNNING STAGE 6: JUDGE EXPERIENCE & DASHBOARDS TESTS...\n");

  // 1. Test Demo Users Persona Availability
  console.log("--- 1. Testing Seeded Personas ---");
  const roles = ["owner", "manager", "user", "admin"];
  for (const role of roles) {
    const user = DEMO_USERS.find((u) => u.role === role);
    assert(Boolean(user), `Demo user for role '${role}' exists (${user?.full_name})`);
  }

  // 2. Test Notification Centre Store
  console.log("\n--- 2. Testing Notification Centre ---");
  const sarahId = "00000000-0000-0000-0000-000000000005";
  const sarahNotifs = await getNotifications(sarahId);
  assert(sarahNotifs.length > 0, `Sarah Jenkins has ${sarahNotifs.length} seeded notifications`);

  const unreadBefore = sarahNotifs.filter((n) => !n.is_read).length;
  assert(unreadBefore > 0, `Sarah has ${unreadBefore} unread notifications`);

  // Test mark single notification as read
  const firstUnread = sarahNotifs.find((n) => !n.is_read);
  if (firstUnread) {
    const markSuccess = await markNotificationAsRead(firstUnread.id);
    assert(markSuccess, "Single notification marked as read successfully");
  }

  // Test mark all notifications as read
  await markAllNotificationsAsRead(sarahId);
  const sarahNotifsAfter = await getNotifications(sarahId);
  const unreadAfter = sarahNotifsAfter.filter((n) => !n.is_read).length;
  assert(unreadAfter === 0, "Mark all as read cleared all unread indicators for user");

  // 3. Test Booking Review Workflow (Step 6 of lifecycle)
  console.log("\n--- 3. Testing Booking Review Flow (Step 6) ---");
  const pendingBooking = await getBookingById("b-pending-review-cleanroom");
  assert(Boolean(pendingBooking), "Pending cleanroom booking #b-pending-review-cleanroom found");
  assert(pendingBooking?.status === "pending_review", "Initial status is 'pending_review'");

  const reviewReason = "Safety credentials and cleanroom protocol verified by faculty custodian.";
  const reviewed = await reviewBooking({
    booking_id: "b-pending-review-cleanroom",
    decision: "approved",
    reason: reviewReason,
    reviewer_id: "00000000-0000-0000-0000-000000000002", // Elena Rostova
    reviewer_role: "owner",
  });

  assert(reviewed.status === "approved", "Booking transitioned from 'pending_review' to 'approved'");
  const logs = getAuditLogs();
  const hasReviewAudit = logs.some((l) => l.action === "BOOKING_APPROVED" && l.resource_id === "b-pending-review-cleanroom");
  assert(hasReviewAudit, "Audit trail logged BOOKING_APPROVED with reason");

  // 4. Test Resource Utilisation % Calculation
  console.log("\n--- 4. Testing Resource Utilisation Calculation ---");
  const laserUtil = await calculateResourceUtilization("20000000-0000-0000-0000-000000000001");
  assert(laserUtil.percentage > 0 && laserUtil.percentage <= 100, `Laser cutter utilisation calculated at ${laserUtil.percentage}%`);
  assert(Boolean(laserUtil.label), `Utilisation label: "${laserUtil.label}"`);

  // 5. Test Demo Data Reset
  console.log("\n--- 5. Testing Demo Data Reset ---");
  resetDemoStore();
  const resetBooking = await getBookingById("b-pending-review-cleanroom");
  assert(resetBooking?.status === "pending_review", "Reset safely restored pending booking back to 'pending_review'");

  const resetNotifs = await getNotifications(sarahId);
  assert(resetNotifs.some((n) => !n.is_read), "Reset restored unread notification state for judge replay");

  console.log("\n🎉 ALL STAGE 6 JUDGE EXPERIENCE & DASHBOARD TESTS PASSED 100%!\n");
}

runStage6Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});


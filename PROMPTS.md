Here is the prompt split into 10 chunks. I also applied the tiering from my last message, so the order differs from the original build order. You get a complete, judge-testable journey first, then the differentiators, then the extras.

**How to use this**

1. Paste **Chunk 0** first and save it as `CLAUDE.md` / `.cursorrules` (or your tool's rules file) so the AI remembers it.
2. Paste one chunk at a time. Test it using the "Done when" list, commit, then move on.
3. Don't start a chunk until the previous one passes. If something breaks, use the **Fix prompt** at the bottom.
4. Chunks 1-6 are **Tier 1** (must be flawless), 7-8 are **Tier 2**, and 9-10 are **Tier 3** (only if time allows).

---

## Chunk 0: Project brief and rules (paste first, once)

```
You are a senior full-stack engineer and product designer. We are building **CampusShare** for a 48-hour hackathon, as a team of two. It must be a working, publicly deployed product, not a prototype of disconnected screens.

PROBLEM: Institutions own valuable underused resources (labs, makerspace tools, cameras, test devices, meeting rooms). Nearby students, researchers and startup teams can't afford them. Ordinary booking systems ignore trust, safety, eligibility, fairness and accountability. We are building a trusted resource-sharing platform: verified owners list resources with conditions, users discover them, prove eligibility, request access, and complete the full lifecycle with condition records, incident handling, fair allocation and an auditable history.

FOCUSED USE CASE (do not broaden): one university campus plus a partner community makerspace. Categories: Labs/Spaces, Fabrication Equipment (3D printers, laser cutters), Electronics/Test Devices (oscilloscopes), Media Gear (cameras, drones). Users: students, researchers, early-stage startup teams. All data is fictional.

ROLES: User/Borrower, Owner, Manager/Technician (delegated by an owner), Admin. Permissions must be enforced server-side, not just hidden in the UI.

THE 10-STEP LIFECYCLE a judge must be able to complete alone:
1 Owner lists a resource with conditions. 2 User discovers it and sees an eligibility check. 3 User submits a booking request. 4 System verifies requirements. 5 Owner/manager reviews. 6 Approve / reject / waitlist. 7 Check-in with initial condition record. 8 Return with final condition record. 9 Delay/damage/conflict is reported and handled. 10 Both parties see the full history.

TECH STACK: Next.js (App Router, TypeScript) + Tailwind + shadcn/ui; Supabase (Postgres + Auth); Vercel; zod; date-fns. Keep business rules (eligibility, conflicts, fairness scoring, audit hashing) in pure TypeScript modules under /lib/rules, separate from UI.

NON-NEGOTIABLE PRINCIPLES:
- No placeholders, dead buttons, or "coming soon" screens. Every visible button works.
- Every important decision shows a plain-language explanation of WHY.
- No important access, safety or penalty decision is made by an unexplained automated system. AI only assists, humans decide.
- Every important action writes to an audit log.
- Responsive, accessible (labels, keyboard nav, AA contrast), with loading, empty and error states and toasts.
- No secrets in the repo; use .env and provide .env.example.
- Keep it simple. Prefer fewer features that work perfectly over many that half-work.

We will build in stages. I will give you one stage at a time. Finish each stage fully, then tell me exactly what to manually test. Do not build ahead. Reply "Ready" and wait for Stage 1.
```

---

## Chunk 1: Foundation (schema, auth, roles, seed, deploy)

```
STAGE 1: Foundation.

Before coding, briefly output: (a) the data model (tables, key columns, relations), (b) the booking state machine (statuses and allowed transitions), (c) the audit_log design.

Then build:
1. Scaffold Next.js + Tailwind + shadcn/ui + Supabase client, with a clean app layout (navbar with role-aware links, footer with privacy notice link).
2. Database schema with migrations: profiles (role: user/owner/manager/admin), resources, resource_requirements, availability_slots, blackout_dates, credentials (user training/membership with expiry and verified status), bookings, booking_events, condition_records, incidents, notifications, audit_log, waitlist_entries.
3. Auth (email/password) with role-based route protection and server-side permission helpers (e.g. requireRole()). Include simple rate limiting on login.
4. Idempotent seed script (`npm run seed`): 4 owners/managers/admin accounts plus 6 users with varied credential states; 8 realistic resources across the 4 categories (e.g. Prusa 3D printer, laser cutter, oscilloscope, DSLR camera kit, drone, PCB lab, meeting room, electronics bench) each with rules, requirements and weekly availability. Include one high-demand resource. Leave bookings for a later stage.
5. Deploy to Vercel with Supabase connected, so we have a public URL from day one.

DONE WHEN: I can log in as each seeded role, see a role-specific placeholder dashboard (real data, not lorem ipsum), and the public URL works. Tell me how to test this.
```

---

## Chunk 2: Listings, discovery and eligibility

```
STAGE 2: Resource listings, discovery and the eligibility engine.

1. Owner can create/edit a resource: title, category, location (building/room), description, usage rules, safety notes, required qualifications, supervision needed (yes/no), deposit or credit cost, max booking duration, weekly availability slots, blackout dates, and a condition checklist (list of items to inspect, e.g. "lens clean", "no scratches"). Show a "Listing completeness" indicator. Photos are optional: use a single image URL field for now, no uploads.
2. Discovery page: card grid with search and filters (category, location, free/credit, "I'm eligible for this"). Include good empty states.
3. Eligibility engine in /lib/rules/eligibility.ts (pure functions): for a given user and resource, return a per-requirement result: pass/fail/expired/pending-verification, with a plain-language reason and a "how to fix" action (e.g. "Laser Safety Training: missing. Request training"). Handle credential expiry.
4. Resource detail page showing the eligibility checklist for the logged-in user, usage rules, safety notes, availability, and a "Request booking" button (disabled with a clear reason if blocked).
5. Credential flow: a user can submit a credential or training request; the owner/admin sees a verification queue and approves/rejects it (writes to audit_log).
6. Add unit tests for the eligibility engine.

DONE WHEN: As owner I can list a new resource; as different users I see different eligibility results with clear fix instructions; verifying a credential changes the result.
```

---

## Chunk 3: Booking requests, conflicts and approval

```
STAGE 3: Booking request, conflict detection and approval workflow.

1. Booking request form: pick date/time slot (from availability), purpose, team size, supervisor name (if required), and a digital acknowledgment of usage rules.
2. Conflict detection in /lib/rules/conflicts.ts (pure, unit-tested): overlapping bookings, blackout dates, outside availability, over max duration. On conflict, suggest the 3 nearest free slots. Prevent double-booking at the database level (constraint or transaction) so two users can't take the same slot.
3. On submit, the system auto-runs the eligibility check and records the result on the request. Failed requirements block submission with reasons.
4. Owner/manager request inbox: shows request details, requester eligibility summary, and conflicts. Actions: Approve, Reject, Waitlist. Rejection and waitlist REQUIRE a reason.
5. "Why was my request approved/rejected/waitlisted?" panel on every request, written in plain language, visible to the user.
6. Cancellation flow for users and owners, with reason.
7. Every action writes an audit_log entry (actor, role, action, entity, reason, timestamp). Create simple in-app notifications for each status change (just a list for now).

DONE WHEN: A user requests a slot, an owner approves it, a second user trying the same slot sees a conflict and alternative slots, and the "why" panel explains each outcome.
```

---

## Chunk 4: Check-in, return and condition diff

```
STAGE 4: Check-in and return.

1. Check-in (run by manager/owner, mobile-first): for an approved booking, show the resource's condition checklist. Record each item's state (OK / minor issue / damaged), notes, timestamp, and who handed over. Photo upload is optional; skip it unless it's quick. Booking status becomes "In use".
2. Return flow: same checklist, same fields. Booking status becomes "Returned".
3. Condition diff in /lib/rules/condition.ts (pure, unit-tested): compare initial vs. return state, flag any item that got worse, and display both records side by side with changes highlighted.
4. If anything worsened, auto-DRAFT an incident (status "Draft" for manager review). The system never penalises automatically.
5. Show a QR code on each approved booking that opens its check-in page (use a small QR library).
6. Late return detection: if the return time passes the booking end, flag it as late. Write all events to audit_log.

DONE WHEN: I can check a booking in, return it with one item worse, see the side-by-side diff with the change highlighted, and see a draft incident created.
```

---

## Chunk 5: Audit trail and transaction history

```
STAGE 5: Auditable history.

1. Make audit_log append-only: no update or delete allowed (DB trigger or permission), enforced server-side.
2. Add a hash chain: each entry stores hash = SHA-256(previous_hash + canonical JSON of entry content). Put this in /lib/rules/audit.ts as pure, unit-tested functions.
3. Admin page "Audit log": filterable by actor, action, entity and date, plus a "Verify integrity" button that recomputes the chain and shows pass/fail (and the first broken entry if any).
4. Booking timeline component: a human-readable, chronological history of every event for a booking (requested, eligibility checked, approved, checked in, condition recorded, returned, incident, etc.). Visible to both the user and the owner, with sensitive details limited by role.
5. Make sure every action from earlier stages writes through one shared audit function. Fix any that don't.

DONE WHEN: After completing a booking journey, both user and owner see the same complete timeline; admin can verify the chain passes; manually tampering with a row in the database makes verification fail.
```

---

## Chunk 6: /judge page and dashboards (do this before anything else optional)

```
STAGE 6: Judge experience and dashboards.

1. Create a public /judge page: a short intro to the project, one-click "Log in as..." buttons for each seeded role (Owner, Manager, User, Admin), and a numbered step-by-step script of the 10-step lifecycle where each step has a deep link to the right screen for the right role. A judge must complete a full journey in under 5 minutes with no help. Add a "Reset demo data" button that safely reseeds.
2. Role dashboards with real data:
   - User: upcoming, active, past bookings, requests and their status, notifications.
   - Owner/Manager: pending approvals, today's check-ins/returns, open incidents, a simple utilisation % per resource.
   - Admin: verification queue, recent audit entries, integrity status.
3. In-app notification centre (bell icon, unread count, mark as read).
4. Seed realistic bookings in every status so dashboards never look empty.
5. Polish pass: consistent design, nice typography and spacing, empty/loading/error states, mobile layout check.

DONE WHEN: Someone who has never seen the app can open /judge, follow the script, and complete listing-to-return alone. Test it yourself on a fresh browser and on mobile.
```

---

## Chunk 7: Fairness engine and waitlist (your main differentiator)

```
STAGE 7: Fair allocation.

Before coding, output the fairness rules and the waitlist priority formula for my approval.

1. Fairness rules in /lib/rules/fairness.ts (pure, unit-tested), configurable by admin in a settings page: max active bookings per user, max hours per week per category, cooling-off after consecutive long bookings. Violations block or flag requests with a plain-language explanation.
2. Waitlist: when a request can't be approved due to demand, the user joins a waitlist. Priority score = weighted sum of: waiting time, hours used in the last 30 days (less use means higher priority), declared project deadline (verified by owner), and no-show/late history. Show the score with a full per-factor breakdown to the user and the owner.
3. When a booking is cancelled, the top waitlisted user is offered the slot with an accept window (e.g. 2 hours). If they decline or the window expires, it goes to the next person. Notify each person.
4. Owner can override any outcome, but must enter a reason, and the override is audited and shown in the timeline.
5. No-show/late strikes lower priority and trigger a manager review. They never cause automatic bans.
6. "Fair Use Meter" on the user dashboard showing usage vs. quota.
7. In the seed data, make one high-demand resource with a visible waitlist so judges can see this immediately.

DONE WHEN: A heavy user and a light user both join the same waitlist; the light user ranks higher and the breakdown shows exactly why; cancelling a booking offers the slot to the top person.
```

---

## Chunk 8: Incidents, notifications and demo clock

```
STAGE 8: Incidents and time-based flows.

1. Incident workflow: types (damage, late return, no-show, misuse, safety), severity, description, linked booking, evidence (text and optional image URL), and status (Draft, Open, Under Review, Resolved, Disputed). Users or owners can report; draft incidents from Stage 4 appear in the manager's queue.
2. The affected user can respond to an incident. The manager records a decision with notes. A user can dispute a decision, and the admin resolves disputes. Every step is audited and visible in the timeline.
3. Notifications for: request received, approved/rejected/waitlisted, slot offered, reminder before booking, return due, overdue, incident opened, cancellation.
4. Admin-only "Demo clock" control: fast-forward time by 1 hour / 1 day, so reminders, overdue returns and waitlist offer expiry trigger instantly for judges. All time-based logic must use this app clock, not the real clock.
5. Overdue flow: when a return is overdue, notify the user and the owner, and let the manager open an incident from the notification.

DONE WHEN: I can report damage, respond as the user, decide as the manager, dispute, resolve as admin, and then use the Demo clock to trigger an overdue notification.
```

---

## Chunk 9: AI features and analytics (stretch)

```
STAGE 9 (stretch): AI assistance and impact analytics.

1. Smart matching: a natural-language search box ("I need to prototype a PCB enclosure this weekend") that returns ranked resources with a one-line explanation of why each matches. Use an LLM API if a key is set; otherwise fall back to keyword/tag scoring so it always works. It only suggests and never grants access. Label it "AI suggestion".
2. Incident summariser: a button for managers that drafts a short incident summary. Clearly label it "AI draft, review before use". It must be editable and never auto-applied or used to decide.
3. Owner analytics page: utilisation %, idle hours unlocked, number of distinct users served, and a simple chart over time. This demonstrates real-world impact.
4. Hash-verified audit badge on booking timelines ("Tamper-evident history verified").

DONE WHEN: Matching works with and without an API key; the summary is editable and labelled; analytics show meaningful numbers from the seed data.
```

---

## Chunk 10: Tests, accessibility, README and final polish

```
STAGE 10: Quality, docs and submission readiness.

1. Make sure unit tests exist and pass for: eligibility, conflicts, fairness scoring, condition diff, audit chain. Add one Playwright e2e test for the full lifecycle if time allows.
2. Accessibility pass: labels, focus states, keyboard navigation, alt text, colour contrast, plain-language error messages.
3. Security pass: confirm permission checks on every server action/route, input validation with zod, no secrets in the repo, privacy notice page, signed or restricted access to any uploads.
4. Check for console errors, broken links and dead buttons across every role.
5. Write README.md with: project overview, problem and users, setup steps, env variables (.env.example), architecture diagram (Mermaid), data model, the 10-step workflow, demo credentials and testing notes for judges, features completed vs. unfinished, known limitations, future scope, privacy/security/fairness considerations, and a DISCLOSURE section listing every library, template, and AI tool used.
6. Give me a final manual test checklist and a list of anything unfinished so I can document it honestly.

DONE WHEN: A fresh clone can be set up from the README, and all checklists pass on the deployed URL.
```

---

## Fix prompt (use any time something breaks)

```
Something is broken. Here is what I did, what I expected, and what happened: [describe + paste error/screenshot]. Find the root cause rather than patching the symptom, fix it, and check that nothing from earlier stages broke. Then tell me how to re-test it.
```

---

**Tips**

- **Chunks 1 to 6 are the ones that win you points.** If you're behind schedule, skip 9 entirely and shrink 7 and 8 rather than rushing 1 to 6.
- **Commit after every chunk.** Judges may check your development history, and it protects you if the AI breaks something later.
- **Suggested split:** one person drives chunks 1, 3, 5 and 7 (backend and rules), the other drives 2, 4, 6 and 8 (UI and flows). Don't both edit the same files at once. Merge often.
- **Deadline checkpoints:** aim to finish chunks 1 to 3 by hour 14, chunks 4 to 6 by hour 26, chunks 7 to 8 by hour 38, and leave the last 10 hours for chunk 10, the PDF and your demo video.

If you'd like, I can draft the project PDF outline next so you can fill it in as you build.

- **KASIM :** one person drives chunks 1, 3, 5 and 7 (backend and rules)
- **SOHEL :** the other drives 2, 4, 6 and 8 (UI and flows). Don't both edit the same files at once. Merge often.
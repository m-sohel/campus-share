import { ResourceCategory } from "@/types";

export interface SeedUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: "user" | "owner" | "manager" | "admin";
  department: string;
  affiliation: "university" | "makerspace" | "startup";
  reputation_score: number;
}

export const SEED_USERS: SeedUser[] = [
  // 1. Admin
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@campusshare.edu",
    password: "Password123!",
    full_name: "Dr. Arthur Vance",
    role: "admin",
    department: "Campus Innovation & Safety Directorate",
    affiliation: "university",
    reputation_score: 100,
  },
  // 2. Owner: University Lab Director
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "owner.lab@campusshare.edu",
    password: "Password123!",
    full_name: "Prof. Elena Rostova",
    role: "owner",
    department: "Dept of Electrical & Computer Engineering",
    affiliation: "university",
    reputation_score: 99,
  },
  // 3. Owner: Community Makerspace Lead
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "owner.makerspace@campusshare.edu",
    password: "Password123!",
    full_name: "Marcus Chen",
    role: "owner",
    department: "Downtown Community Makerspace Guild",
    affiliation: "makerspace",
    reputation_score: 98,
  },
  // 4. Manager: Delegated Technician
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "manager.tech@campusshare.edu",
    password: "Password123!",
    full_name: "Jordan Taylor",
    role: "manager",
    department: "Makerspace Safety & Equipment Operations",
    affiliation: "makerspace",
    reputation_score: 96,
  },
  // 5. User: Fully qualified researcher
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "user.researcher@campusshare.edu",
    password: "Password123!",
    full_name: "Sarah Jenkins",
    role: "user",
    department: "Robotics & Autonomous Systems Lab",
    affiliation: "university",
    reputation_score: 98,
  },
  // 6. User: Student with expired credentials
  {
    id: "00000000-0000-0000-0000-000000000006",
    email: "user.expired@campusshare.edu",
    password: "Password123!",
    full_name: "Liam Patel",
    role: "user",
    department: "Mechanical & Aerospace Engineering",
    affiliation: "university",
    reputation_score: 87,
  },
  // 7. User: Media student with pending certification
  {
    id: "00000000-0000-0000-0000-000000000007",
    email: "user.pending@campusshare.edu",
    password: "Password123!",
    full_name: "Amara Okafor",
    role: "user",
    department: "Interactive Media & Design",
    affiliation: "university",
    reputation_score: 92,
  },
  // 8. User: Early-stage startup founder
  {
    id: "00000000-0000-0000-0000-000000000008",
    email: "user.startup@campusshare.edu",
    password: "Password123!",
    full_name: "David Kim",
    role: "user",
    department: "NeuroTech Incubation Fellow",
    affiliation: "startup",
    reputation_score: 95,
  },
  // 9. User: Fresh newcomer with zero certifications
  {
    id: "00000000-0000-0000-0000-000000000009",
    email: "user.new@campusshare.edu",
    password: "Password123!",
    full_name: "Zoe Martinez",
    role: "user",
    department: "Undergraduate Design Studio",
    affiliation: "university",
    reputation_score: 100,
  },
  // 10. User: Member with revoked credential & incident history
  {
    id: "00000000-0000-0000-0000-000000000010",
    email: "user.revoked@campusshare.edu",
    password: "Password123!",
    full_name: "Lucas Wright",
    role: "user",
    department: "Drone Racing & Prototyping Club",
    affiliation: "university",
    reputation_score: 65,
  },
];

export interface SeedCredential {
  id: string;
  user_id: string;
  credential_type: string;
  title: string;
  status: "pending" | "verified" | "expired" | "revoked";
  issued_at: string;
  expires_at?: string | null;
  verification_notes?: string;
}

export const SEED_CREDENTIALS: SeedCredential[] = [
  // Sarah Jenkins (All verified & valid)
  {
    id: "10000000-0000-0000-0000-000000000001",
    user_id: "00000000-0000-0000-0000-000000000005",
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2 Certification",
    status: "verified",
    issued_at: "2026-01-15T00:00:00Z",
    expires_at: "2027-01-15T00:00:00Z",
    verification_notes: "Passed optical beam alignment exam with 96%.",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    user_id: "00000000-0000-0000-0000-000000000005",
    credential_type: "cleanroom_safety",
    title: "Class 1000 Cleanroom Protocol & Chemical Safety",
    status: "verified",
    issued_at: "2026-02-01T00:00:00Z",
    expires_at: "2027-02-01T00:00:00Z",
    verification_notes: "Completed gowning and acid handling workshop.",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    user_id: "00000000-0000-0000-0000-000000000005",
    credential_type: "3d_print_certified",
    title: "Advanced FDM & Resin 3D Printing Operator",
    status: "verified",
    issued_at: "2026-01-10T00:00:00Z",
    expires_at: "2027-01-10T00:00:00Z",
  },
  // Liam Patel (Expired laser cert)
  {
    id: "10000000-0000-0000-0000-000000000004",
    user_id: "00000000-0000-0000-0000-000000000006",
    credential_type: "laser_safety_l2",
    title: "Laser Safety Officer Level 2 Certification",
    status: "expired",
    issued_at: "2025-08-01T00:00:00Z",
    expires_at: "2026-08-01T00:00:00Z", // expired
    verification_notes: "Requires annual refresher course before operation.",
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    user_id: "00000000-0000-0000-0000-000000000006",
    credential_type: "3d_print_certified",
    title: "Basic 3D Printing Operator",
    status: "verified",
    issued_at: "2026-03-01T00:00:00Z",
    expires_at: "2027-03-01T00:00:00Z",
  },
  // Amara Okafor (Pending drone cert)
  {
    id: "10000000-0000-0000-0000-000000000006",
    user_id: "00000000-0000-0000-0000-000000000007",
    credential_type: "drone_operator_license",
    title: "Commercial Drone Pilot Safety Endorsement",
    status: "pending",
    issued_at: "2026-10-20T00:00:00Z",
    verification_notes: "Flight hours log submitted; awaiting manager review.",
  },
  {
    id: "10000000-0000-0000-0000-000000000007",
    user_id: "00000000-0000-0000-0000-000000000007",
    credential_type: "cinema_camera_safety",
    title: "Cinema Rig & Sensor Protection Handling",
    status: "verified",
    issued_at: "2026-04-10T00:00:00Z",
    expires_at: "2027-04-10T00:00:00Z",
  },
  // David Kim (Startup resident verified)
  {
    id: "10000000-0000-0000-0000-000000000008",
    user_id: "00000000-0000-0000-0000-000000000008",
    credential_type: "electronics_lab_safety",
    title: "High-Voltage & ESD Circuit Testing Authorization",
    status: "verified",
    issued_at: "2026-01-20T00:00:00Z",
    expires_at: "2027-01-20T00:00:00Z",
  },
  // Lucas Wright (Revoked drone cert)
  {
    id: "10000000-0000-0000-0000-000000000009",
    user_id: "00000000-0000-0000-0000-000000000010",
    credential_type: "drone_operator_license",
    title: "Commercial Drone Pilot Safety Endorsement",
    status: "revoked",
    issued_at: "2026-02-14T00:00:00Z",
    expires_at: "2027-02-14T00:00:00Z",
    verification_notes: "Revoked following flight zone boundary violation near helipad.",
  },
];

export interface SeedResource {
  id: string;
  owner_id: string;
  manager_id?: string | null;
  name: string;
  category: ResourceCategory;
  description: string;
  location: string;
  institution: "university" | "makerspace";
  rules: string;
  requires_supervision: boolean;
  min_lead_time_hours: number;
  max_duration_hours: number;
  is_high_demand: boolean;
  deposit_required_cents: number;
  status: "available" | "maintenance" | "archived";
  image_url: string;
  requirements: Array<{
    credential_type: string;
    is_mandatory: boolean;
    explanation: string;
  }>;
}

export const SEED_RESOURCES: SeedResource[] = [
  // 1. Fabrication: Epilog Fusion Pro 48 (HIGH-DEMAND)
  {
    id: "20000000-0000-0000-0000-000000000001",
    owner_id: "00000000-0000-0000-0000-000000000002", // Prof. Elena Rostova
    manager_id: "00000000-0000-0000-0000-000000000004", // Jordan Taylor
    name: "Epilog Fusion Pro 48 Laser Cutter (120W CO2)",
    category: "fabrication",
    description: "Industrial-grade dual-laser cutter and engraver. Ideal for rapid prototyping in acrylic, wood, leather, and anodized metals. 165 IPS cutting speed with camera alignment.",
    location: "Campus Central Engineering Building, Room 142",
    institution: "university",
    rules: "No PVC, vinyl, or toxic resins. Safety glasses must be worn during operation. Never leave machine unattended while laser is firing.",
    requires_supervision: false,
    min_lead_time_hours: 4,
    max_duration_hours: 2,
    is_high_demand: true, // HIGH DEMAND
    deposit_required_cents: 0,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60",
    requirements: [
      {
        credential_type: "laser_safety_l2",
        is_mandatory: true,
        explanation: "Required by campus fire safety code for all Class 4 CO2 laser cutters.",
      },
    ],
  },
  // 2. Fabrication: Prusa MK4 3D Printing Station
  {
    id: "20000000-0000-0000-0000-000000000002",
    owner_id: "00000000-0000-0000-0000-000000000003", // Marcus Chen
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "Prusa MK4 FDM 3D Printing Station",
    category: "fabrication",
    description: "High-speed 32-bit open-frame 3D printer with Nextruder. Capable of printing PLA, PETG, ASA, and Polycarbonate with input shaping.",
    location: "Downtown Community Makerspace, Bay B",
    institution: "makerspace",
    rules: "Clean PEI bed with 99% IPA before and after prints. Bring your own certified filament or purchase spools at the front desk.",
    requires_supervision: false,
    min_lead_time_hours: 2,
    max_duration_hours: 6,
    is_high_demand: false,
    deposit_required_cents: 0,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1631553127988-3486a4221146?w=800&auto=format&fit=crop&q=60",
    requirements: [
      {
        credential_type: "3d_print_certified",
        is_mandatory: true,
        explanation: "Ensures user knows slicer profiles and hot-end nozzle clearance.",
      },
    ],
  },
  // 3. Electronics: Keysight Oscilloscope
  {
    id: "20000000-0000-0000-0000-000000000003",
    owner_id: "00000000-0000-0000-0000-000000000002",
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "Keysight Infiniium 4-Channel 1GHz Digital Oscilloscope",
    category: "electronics",
    description: "Precision 1 GHz digital storage oscilloscope with 5 GSa/s per channel. Includes active differential probes, serial protocol decoding (I2C, SPI, CAN), and arbitrary waveform generator.",
    location: "North Engineering Quad, Microelectronics Lab 304",
    institution: "university",
    rules: "Always wear anti-static wrist strap connected to bench ground. Do not exceed max probe input ratings (50V max). Disconnect probes when returning.",
    requires_supervision: false,
    min_lead_time_hours: 2,
    max_duration_hours: 4,
    is_high_demand: false,
    deposit_required_cents: 0,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=60",
    requirements: [
      {
        credential_type: "electronics_lab_safety",
        is_mandatory: true,
        explanation: "Ensures proper ESD grounding and differential probe usage to avoid instrument damage.",
      },
    ],
  },
  // 4. Electronics: Soldering Bench
  {
    id: "20000000-0000-0000-0000-000000000004",
    owner_id: "00000000-0000-0000-0000-000000000003",
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "Hakko FX-951 Precision Soldering & SMD Rework Bench",
    category: "electronics",
    description: "Temperature-controlled soldering station with hot-air rework nozzle, stereomicroscope, fume extractor arm, and desoldering pump.",
    location: "Downtown Community Makerspace, Electronics Bench #3",
    institution: "makerspace",
    rules: "Fume extractor must be running at all times. Tin iron tip before switching off. Wipe sponge and brass wool after each session.",
    requires_supervision: false,
    min_lead_time_hours: 1,
    max_duration_hours: 3,
    is_high_demand: false,
    deposit_required_cents: 0,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&auto=format&fit=crop&q=60",
    requirements: [],
  },
  // 5. Media: Sony FX3 Kit
  {
    id: "20000000-0000-0000-0000-000000000005",
    owner_id: "00000000-0000-0000-0000-000000000002",
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "Sony FX3 Cinema Line Full-Frame Camera Kit",
    category: "media",
    description: "4K 120fps cinema camera package. Includes Sony 24-70mm f/2.8 GM II lens, XLR top audio handle, 2x 160GB CFexpress Type A cards, 3x batteries, and Pelican storm case.",
    location: "School of Media Arts Equipment Cage, Desk 2",
    institution: "university",
    rules: "Check lens elements and sensor before sign-out. Never change lenses in windy or dusty environments. Keep camera strapped or mounted on tripod.",
    requires_supervision: false,
    min_lead_time_hours: 6,
    max_duration_hours: 8,
    is_high_demand: false,
    deposit_required_cents: 5000, // $50 deposit
    status: "available",
    image_url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=60",
    requirements: [
      {
        credential_type: "cinema_camera_safety",
        is_mandatory: true,
        explanation: "Protects high-value full-frame cinema glass and optical image stabilization mechanisms.",
      },
    ],
  },
  // 6. Media: DJI Inspire 3 Drone
  {
    id: "20000000-0000-0000-0000-000000000006",
    owner_id: "00000000-0000-0000-0000-000000000003",
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "DJI Inspire 3 8K Aerial Drone System",
    category: "media",
    description: "Full-frame 8K cinema drone with RTK centimeter-level positioning, obstacle sensing, and dual-operator controller set for aerial filming.",
    location: "Downtown Community Makerspace, Flight Equipment Vault",
    institution: "makerspace",
    rules: "Flights strictly limited to designated campus test fields. Requires certified spotter. Flights must be logged in the FAA airspace portal.",
    requires_supervision: true,
    min_lead_time_hours: 24,
    max_duration_hours: 4,
    is_high_demand: false,
    deposit_required_cents: 10000,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=60",
    requirements: [
      {
        credential_type: "drone_operator_license",
        is_mandatory: true,
        explanation: "Federal aviation and campus policy mandate certified pilots for drones exceeding 2kg.",
      },
    ],
  },
  // 7. Labs/Spaces: Micro-Fabrication Cleanroom
  {
    id: "20000000-0000-0000-0000-000000000007",
    owner_id: "00000000-0000-0000-0000-000000000002",
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "Micro-Fabrication & PCB Prototyping Cleanroom Lab",
    category: "labs_spaces",
    description: "Class 1000 research cleanroom equipped with spin-coater, UV mask aligner, wet chemical benches, and profilometer for silicon & PCB micro-lithography.",
    location: "Nanotechnology Institute, Basement Level Suite B-12",
    institution: "university",
    rules: "Full bunny suit, nitrile gloves, and shoe covers required. Chemical waste must be poured into dedicated neutralization containers.",
    requires_supervision: true,
    min_lead_time_hours: 12,
    max_duration_hours: 4,
    is_high_demand: false,
    deposit_required_cents: 0,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=60",
    requirements: [
      {
        credential_type: "cleanroom_safety",
        is_mandatory: true,
        explanation: "Required for bio-hazard and acidic chemical vapor compliance.",
      },
    ],
  },
  // 8. Labs/Spaces: Hardware Pitch Room
  {
    id: "20000000-0000-0000-0000-000000000008",
    owner_id: "00000000-0000-0000-0000-000000000003",
    manager_id: "00000000-0000-0000-0000-000000000004",
    name: "Collaborative Hardware Showcase & Pitch Conference Room",
    category: "labs_spaces",
    description: "Modern modular meeting room with 75-inch 4K wireless presentation display, whiteboard walls, high-speed Gigabit fiber, and product demonstration staging tables.",
    location: "Downtown Community Makerspace, Innovation Wing Room 201",
    institution: "makerspace",
    rules: "Erase whiteboards after session. Reset modular tables to standard layout. No soldering or spray adhesives permitted.",
    requires_supervision: false,
    min_lead_time_hours: 1,
    max_duration_hours: 3,
    is_high_demand: false,
    deposit_required_cents: 0,
    status: "available",
    image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60",
    requirements: [],
  },
];


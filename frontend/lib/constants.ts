export const ID = {
  users: {
    alice: "aaaaaaaa-1111-4111-a111-111111111111",
    bob: "aaaaaaaa-2222-4222-a222-222222222222",
    carol: "aaaaaaaa-3333-4333-a333-333333333333",
    dave: "aaaaaaaa-4444-4444-a444-444444444444",
    eve: "aaaaaaaa-5555-4555-a555-555555555555",
    frank: "aaaaaaaa-6666-4666-a666-666666666666",
  },

  programs: {
    webDev: "bbbbbbbb-0000-4000-b000-000000000001",
    dataSci: "bbbbbbbb-0000-4000-b000-000000000002",
    business: "bbbbbbbb-0000-4000-b000-000000000003",
  },

  modules: {
    htmlCss: "cccccccc-0000-4000-c000-000000000001",
    javascript: "cccccccc-0000-4000-c000-000000000002",
    react: "cccccccc-0000-4000-c000-000000000003",
    python: "cccccccc-0000-4000-c000-000000000004",
    pandas: "cccccccc-0000-4000-c000-000000000005",
    strategy: "cccccccc-0000-4000-c000-000000000006",
    marketing: "cccccccc-0000-4000-c000-000000000007",
  },

  lessons: {
    htmlIntro: "dddddddd-0000-4000-d000-000000000001",
    htmlForms: "dddddddd-0000-4000-d000-000000000002",
    cssBasics: "dddddddd-0000-4000-d000-000000000003",
    jsIntro: "dddddddd-0000-4000-d000-000000000004",
    jsFunctions: "dddddddd-0000-4000-d000-000000000005",
    reactIntro: "dddddddd-0000-4000-d000-000000000006",
    pyIntro: "dddddddd-0000-4000-d000-000000000007",
    pandasDf: "dddddddd-0000-4000-d000-000000000008",
    stratIntro: "dddddddd-0000-4000-d000-000000000009",
    mktIntro: "dddddddd-0000-4000-d000-000000000010",
  },

  enrollments: {
    aliceWebDev: "eeeeeeee-0000-4000-e000-000000000001",
    bobWebDev: "eeeeeeee-0000-4000-e000-000000000002",
    carolWebDev: "eeeeeeee-0000-4000-e000-000000000003",
    daveWebDev: "eeeeeeee-0000-4000-e000-000000000004",
    eveDataSci: "eeeeeeee-0000-4000-e000-000000000005",
    bobDataSci: "eeeeeeee-0000-4000-e000-000000000006",
    carolBusiness: "eeeeeeee-0000-4000-e000-000000000007",
    frankWebDev: "eeeeeeee-0000-4000-e000-000000000008",
  },

  orphanLessonId: "00000000-0000-4000-0000-000000000000",
};
// --- USER ID TO USERNAME MAP ---
export const USER_MAP: Record<string, string> = {
  [ID.users.alice]: "Alice Smith",
  [ID.users.bob]: "Bob Johnson",
  [ID.users.carol]: "Carol Williams",
  [ID.users.dave]: "Dave Brown",
  [ID.users.eve]: "Eve Miller",
  [ID.users.frank]: "Frank Davis",
};

export const ENDPOINTS = [
  // Programs
  { m: "GET", p: "/programs", desc: "List all published programs" },
  {
    m: "GET",
    p: "/programs/:programId",
    desc: "Get program with modules and lessons",
  },

  // Enrollments
  {
    m: "GET",
    p: "/enrollments/:enrollmentId",
    desc: "Full enrollment progress breakdown",
  },
  {
    m: "POST",
    p: "/enrollments/:enrollmentId/lessons/:lessonId/complete",
    desc: "Manual lesson completion",
  },

  // Webhook
  {
    m: "POST",
    p: "/quizzes/webhook",
    desc: "Quiz completion webhook (idempotent)",
  },

  // Admin — Program Insights
  {
    m: "GET",
    p: "/admin/programs/:programId/learners",
    desc: "All learners with pacing analysis",
  },
  {
    m: "GET",
    p: "/admin/programs/:programId/at-risk-learners",
    desc: "Learners flagged as at risk",
  },

  // Admin — Data Quality
  {
    m: "GET",
    p: "/admin/data-quality/report",
    desc: "Data quality anomaly report",
  },
  {
    m: "POST",
    p: "/admin/data-quality/fix-inconsistent-progress",
    desc: "Repair incorrect progress values",
  },
];

// ---------------- Helpers ----------------
export const AVATAR_COLORS = [
  "from-violet-500 to-pink-500",
  "from-emerald-400 to-sky-500",
  "from-rose-400 to-orange-400",
  "from-yellow-400 to-orange-400",
  "from-emerald-400 to-violet-500",
];

export function progressColor(pct = 0) {
  if (pct >= 100) return "text-emerald-400";
  if (pct >= 50) return "text-violet-400";
  if (pct >= 20) return "text-amber-400";
  return "text-red-400";
}

export function shortId(id?: string) {
  return id ? id.slice(0, 8) : "unknown";
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-pink-500",
  "from-emerald-400 to-sky-500",
  "from-rose-400 to-orange-400",
  "from-yellow-400 to-orange-400",
  "from-sky-400 to-violet-500",
  "from-pink-400 to-rose-500",
];

export function avatarGradient(userId: string) {
  const code = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

export function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "today";
}

const SKILL_DEFS = [
  { label: "product marketing", terms: ["product marketing", "product marketer"] },
  { label: "go-to-market", terms: ["go-to-market", "gtm"] },
  { label: "messaging", terms: ["messaging", "message testing", "narrative"] },
  { label: "positioning", terms: ["positioning", "competitive positioning"] },
  { label: "customer research", terms: ["customer research", "customer interviews", "research", "persona"] },
  { label: "cross-functional collaboration", terms: ["cross-functional", "partnered with product", "partnered with sales", "sales/product"] },
  { label: "sales enablement", terms: ["sales enablement", "enablement", "sales one-pagers", "battlecards"] },
  { label: "pricing", terms: ["pricing", "packaging", "pricing strategy"] },
  { label: "lifecycle marketing", terms: ["lifecycle marketing", "lifecycle campaigns"] },
  { label: "hubspot", terms: ["hubspot"] },
  { label: "sql", terms: ["sql"] },
  { label: "salesforce", terms: ["salesforce"] },
  { label: "quota ownership", terms: ["quota", "quota-carrying", "attainment"] },
  { label: "closing", terms: ["closing", "closed", "deal ownership"] },
  { label: "outbound prospecting", terms: ["outbound prospecting", "outbound", "prospecting"] },
  { label: "meddicc", terms: ["meddicc", "meddpicc"] },
  { label: "enterprise sales", terms: ["enterprise sales", "enterprise ae", "multi-threaded"] },
  { label: "backend engineering", terms: ["backend engineering", "backend engineer", "backend"] },
  { label: "node.js or python", terms: ["node.js", "node", "python"] },
  { label: "node.js", terms: ["node.js", "node"] },
  { label: "python", terms: ["python"] },
  { label: "microservices", terms: ["microservices", "services"] },
  { label: "rest apis", terms: ["rest api", "rest apis", "rest", "api", "apis"] },
  { label: "postgresql", terms: ["postgresql", "postgres"] },
  { label: "cloud deployment", terms: ["cloud deployment", "aws", "gcp", "ecs", "google cloud"] },
  { label: "aws", terms: ["aws", "ecs"] },
  { label: "gcp", terms: ["gcp", "google cloud"] },
  { label: "testing", terms: ["testing", "test coverage", "unit tests", "integration tests"] },
  { label: "kubernetes", terms: ["kubernetes", "k8s"] },
  { label: "event-driven", terms: ["event-driven", "kafka", "queues", "event streams"] },
  { label: "pci", terms: ["pci"] },
  { label: "soc2", terms: ["soc2", "soc 2"] }
];

const LOCS = ["san francisco", "austin", "new york", "seattle", "los angeles", "dallas", "boston", "new jersey"];
export const REJECT_REASON_EXAMPLES = [
  "Wrong location",
  "Below minimum years",
  "Missing mandatory skill evidence",
  "No relevant function match",
  "Insufficient evidence for required experience"
];

const OWNERSHIP_VERBS = ["led", "owned", "built", "launched", "managed", "closed", "delivered", "designed", "implemented", "partnered", "migrated", "created", "drove"];
const GENERIC_PHRASES = ["strong leadership", "excellent communication", "team player", "hardworking", "results-driven", "dynamic", "proven track record", "fast-paced environment"];
const BUZZWORDS = ["strategic", "innovative", "scalable", "world-class", "data-driven", "growth", "impact", "synergy", "transformation", "cutting-edge", "optimized"];

const n = (s) => String(s || "").toLowerCase();
const unique = (items) => [...new Set(items.filter(Boolean))];

function years(text) {
  const matches = [...String(text || "").matchAll(/(\d+(?:\.\d+)?)\+?\s+years?/gi)].map((m) => Number(m[1]));
  return Math.max(0, ...matches);
}

function sentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasAny(text, terms) {
  const lower = n(text);
  return terms.some((term) => hasTerm(lower, term));
}

function hasTerm(lowerText, term) {
  const lowerTerm = n(term);
  if (/^[a-z0-9.+#-]+$/.test(lowerTerm)) {
    const escaped = lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(lowerText);
  }
  return lowerText.includes(lowerTerm);
}

function isNegativeEvidence(sentence) {
  return /\b(no|not|without|unclear|limited|missing)\b|does not|not listed|not clear/i.test(sentence);
}

function skillDef(skill) {
  return SKILL_DEFS.find((def) => def.label === skill);
}

function detectSkills(text) {
  const resumeSentences = sentences(text);
  return SKILL_DEFS.filter((def) => resumeSentences.some((sentence) => hasAny(sentence, def.terms) && !isNegativeEvidence(sentence))).map((def) => def.label);
}

function skillEvidence(skill, text) {
  const def = skillDef(skill);
  if (!def) return "";
  return sentences(text).find((sentence) => hasAny(sentence, def.terms) && !isNegativeEvidence(sentence)) || "";
}

function title(text) {
  if (/account executive|\benterprise ae\b|\bmid-market ae\b/i.test(text)) return "Account Executive";
  if (/product marketing|product marketer/i.test(text)) return "Product Marketing";
  if (/backend|software engineer|platform engineer|full-stack engineer/i.test(text)) return "Backend Engineer";
  if (/data engineer/i.test(text)) return "Data Engineer";
  if (/marketing manager|director of marketing/i.test(text)) return "Marketing";
  if (/sdr manager/i.test(text)) return "Sales Development";
  if (/manager/i.test(text)) return "Manager";
  return "Unknown";
}

function roleFamily(text) {
  if (/product marketing|product marketer/i.test(text)) return "product marketing";
  if (/account executive|\bae\b|sales|sdr/i.test(text)) return "sales";
  if (/backend|software engineer|platform engineer|full-stack engineer|developer/i.test(text)) return "engineering";
  if (/marketing/i.test(text)) return "marketing";
  return "unknown";
}

function location(text) {
  return LOCS.find((loc) => n(text).includes(loc)) || "Unknown";
}

function locationMatches(candidateLocation, reqLocation) {
  if (!reqLocation || reqLocation === "Flexible") return true;
  return n(candidateLocation).includes(n(reqLocation).split(",")[0]);
}

function extractJobTitle(jobDescription) {
  const direct = jobDescription.match(/hiring\s+(?:a|an)?\s*([^\.]+?)\s+(?:in|for)/i)?.[1];
  const needed = jobDescription.match(/^\s*([^\.]+?)\s+needed\s+(?:in|for)/i)?.[1];
  return (direct || needed || "Target Role").replace(/^(a|an)\s+/i, "").trim();
}

function normalizeRequirementSkills(skills) {
  let normalized = [...skills];
  if (normalized.includes("node.js or python")) {
    normalized = normalized.filter((skill) => !["node.js", "python"].includes(skill));
  }
  if (normalized.includes("cloud deployment")) {
    normalized = normalized.filter((skill) => !["aws", "gcp"].includes(skill));
  }
  return normalized;
}

export function extractRequirements(jobDescription) {
  const lower = n(jobDescription);
  const preferredMatch = jobDescription.match(/\bpreferred\b\s*:?\s*/i);
  const requiredText = preferredMatch ? jobDescription.slice(0, preferredMatch.index) : jobDescription;
  const preferredText = preferredMatch ? jobDescription.slice(preferredMatch.index + preferredMatch[0].length) : "";
  const requiredSkills = normalizeRequirementSkills(detectSkills(requiredText)).slice(0, 8);
  const preferredSkills = normalizeRequirementSkills(detectSkills(preferredText)).filter((skill) => !requiredSkills.includes(skill)).slice(0, 8);
  const allSkills = detectSkills(jobDescription);

  return {
    jobTitle: extractJobTitle(jobDescription),
    requiredSkills: requiredSkills.length ? requiredSkills : allSkills.slice(0, 6),
    preferredSkills: preferredSkills.length ? preferredSkills : allSkills.filter((skill) => !requiredSkills.includes(skill)).slice(0, 5),
    minYearsExperience: years(jobDescription) || 3,
    location: LOCS.find((loc) => lower.includes(loc)) || "Flexible",
    certifications: ["license", "certification", "pci", "soc2"].filter((c) => lower.includes(c)),
    industry: ["saas", "fintech", "hr tech", "payments"].find((i) => lower.includes(i)) || "general",
    keywords: allSkills.slice(0, 10)
  };
}

function parse(candidate) {
  const rawResumeText = candidate.rawResumeText || "";
  return {
    ...candidate,
    rawResumeText,
    parsedTitle: title(rawResumeText),
    parsedSkills: detectSkills(rawResumeText),
    parsedYearsExperience: years(rawResumeText),
    location: location(rawResumeText),
    roleFamily: roleFamily(rawResumeText)
  };
}

function buildCoverage(parsed, req) {
  return req.requiredSkills.map((skill) => {
    const def = skillDef(skill);
    const evidence = skillEvidence(skill, parsed.rawResumeText);
    const supported = parsed.parsedSkills.includes(skill);
    const partial = !supported && def?.terms.some((term) => term.length > 5 && n(parsed.rawResumeText).includes(term.split(" ")[0]));

    return {
      skill,
      signal: supported ? "supported" : partial ? "partial" : "missing",
      evidence: supported ? evidence || `Resume explicitly names ${skill}.` : partial ? "Related language appears, but direct ownership is unclear." : "No supporting evidence found."
    };
  });
}

function actionSentences(text) {
  return sentences(text).filter((sentence) => hasAny(sentence, OWNERSHIP_VERBS) || /\d/.test(sentence));
}

function evidenceItems(parsed, req, coverage) {
  const supportedEvidence = coverage
    .filter((item) => item.signal === "supported" && item.evidence && item.evidence !== `Resume explicitly names ${item.skill}.`)
    .map((item) => item.evidence);
  const roleEvidence = actionSentences(parsed.rawResumeText);
  const preferredEvidence = req.preferredSkills
    .filter((skill) => parsed.parsedSkills.includes(skill))
    .map((skill) => skillEvidence(skill, parsed.rawResumeText))
    .filter(Boolean);

  return unique([...supportedEvidence, ...roleEvidence, ...preferredEvidence]).slice(0, 6);
}

function evidenceQuality(parsed, coverage, evidence) {
  const lower = n(parsed.rawResumeText);
  const supportedCount = coverage.filter((item) => item.signal === "supported").length;
  const listedSkills = parsed.parsedSkills.length;
  const actions = actionSentences(parsed.rawResumeText);
  const flags = [];

  if (GENERIC_PHRASES.some((phrase) => lower.includes(phrase))) flags.push("Generic wording");
  if (listedSkills >= 8 && actions.length <= 1) flags.push("Heavy keyword list with limited proof");
  if (supportedCount > 0 && evidence.length < 2) flags.push("Weak supporting evidence");
  if (!hasAny(parsed.rawResumeText, OWNERSHIP_VERBS)) flags.push("Unclear ownership of work");
  if (BUZZWORDS.filter((word) => lower.includes(word)).length >= 4) flags.push("High buzzword density");
  if (parsed.parsedTitle === "Unknown" || parsed.parsedYearsExperience === 0) flags.push("Unclear career story");
  if (flags.includes("Generic wording") && flags.includes("High buzzword density") && !/\d/.test(parsed.rawResumeText)) {
    flags.push("Resume language may be optimized or generic");
  }

  let level = "Weak evidence";
  const ownershipIsClear = !flags.includes("Unclear ownership of work") && !flags.includes("Weak supporting evidence");

  if (supportedCount >= Math.max(3, Math.ceil(coverage.length * 0.65)) && evidence.length >= 3 && flags.length <= 1 && ownershipIsClear) {
    level = "Strong evidence";
  } else if (supportedCount >= Math.max(2, Math.ceil(coverage.length * 0.4)) || evidence.length >= 2) {
    level = "Moderate evidence";
  }

  return { level, flags: unique(flags) };
}

function roleMatches(req, parsed, coveragePct) {
  const targetFamily = roleFamily(req.jobTitle);
  if (targetFamily === "unknown") return true;
  if (targetFamily === parsed.roleFamily) return true;
  if (targetFamily === "product marketing" && parsed.roleFamily === "marketing" && coveragePct >= 45) return true;
  return false;
}

function topCounts(items) {
  return Object.entries(
    items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));
}

function score(parsed, req) {
  const coverage = buildCoverage(parsed, req);
  const supported = coverage.filter((item) => item.signal === "supported").length;
  const partial = coverage.filter((item) => item.signal === "partial").length;
  const coveragePct = req.requiredSkills.length ? Math.round(((supported + partial * 0.5) / req.requiredSkills.length) * 100) : 0;
  const missingMustHaves = coverage.filter((item) => item.signal === "missing").map((item) => item.skill);
  const evidence = evidenceItems(parsed, req, coverage);
  const quality = evidenceQuality(parsed, coverage, evidence);
  const hardDisqualifiers = [];
  const risks = [];
  const positives = [];

  if (parsed.parsedYearsExperience >= req.minYearsExperience) {
    positives.push(`${parsed.parsedYearsExperience} years meets the minimum requirement.`);
  } else {
    hardDisqualifiers.push("Below minimum years");
  }

  if (!locationMatches(parsed.location, req.location)) hardDisqualifiers.push("Wrong location");
  if (coveragePct < 50) hardDisqualifiers.push("Missing mandatory skill evidence");
  if (!roleMatches(req, parsed, coveragePct)) hardDisqualifiers.push("No relevant function match");
  if (quality.level === "Weak evidence" && coveragePct < 55) hardDisqualifiers.push("Insufficient evidence for required experience");

  const preferredHits = req.preferredSkills.filter((skill) => parsed.parsedSkills.includes(skill));
  if (preferredHits.length) positives.push(`Nice-to-have evidence: ${preferredHits.slice(0, 3).join(", ")}.`);
  if (coveragePct >= 70) positives.push(`${supported} must-haves have direct supporting evidence.`);

  if (coverage.some((item) => item.signal === "partial")) risks.push("Some must-haves are only partially supported.");
  if (quality.level === "Weak evidence") risks.push("Evidence is thin; verify direct ownership and outcomes.");
  risks.push(...quality.flags);

  const yearPoints = Math.min(15, Math.round((parsed.parsedYearsExperience / Math.max(1, req.minYearsExperience)) * 15));
  const scoreValue = Math.round(
    coveragePct * 0.58 +
      yearPoints +
      preferredHits.length * 3 +
      (locationMatches(parsed.location, req.location) ? 7 : 0) +
      (quality.level === "Strong evidence" ? 10 : quality.level === "Moderate evidence" ? 5 : 0)
  );
  const secondaryScore = Math.max(0, Math.min(100, scoreValue));

  let screeningBucket = "Review";
  if (
    hardDisqualifiers.length >= 2 ||
    coveragePct < 35 ||
    (hardDisqualifiers.includes("Below minimum years") && coveragePct < 65) ||
    (hardDisqualifiers.includes("Wrong location") && coveragePct < 75)
  ) {
    screeningBucket = "Reject";
  } else if (
    hardDisqualifiers.length === 0 &&
    coveragePct >= 65 &&
    parsed.parsedYearsExperience >= req.minYearsExperience &&
    (quality.level === "Strong evidence" || (quality.level === "Moderate evidence" && missingMustHaves.length === 0 && quality.flags.length === 0))
  ) {
    screeningBucket = "Strong screen";
  }

  const evidenceSummary = evidence.length
    ? evidence.slice(0, 2).join(" ")
    : `Resume does not provide concrete examples for ${missingMustHaves.slice(0, 2).join(" or ") || "the core requirements"}.`;
  const whyScreen =
    screeningBucket === "Reject"
      ? `Do not prioritize unless a recruiter overrides: ${unique(hardDisqualifiers).join("; ")}.`
      : `Worth screening because the resume gives evidence such as: ${evidence.slice(0, 2).join(" ") || "limited but relevant signals to verify."}`;
  const missingSummary = missingMustHaves.length ? `Missing evidence for ${missingMustHaves.slice(0, 4).join(", ")}.` : "No missing must-haves found in the first pass.";
  const riskSummary = risks.length ? risks.slice(0, 3).join("; ") : "No major credibility concerns surfaced in the first pass.";

  return {
    score: secondaryScore,
    secondaryScore,
    screeningBucket,
    suggestedDecision: screeningBucket,
    decision: screeningBucket,
    coveragePct,
    coverage,
    skillCoverage: coverage,
    missingMustHaves,
    hardDisqualifiers: unique(hardDisqualifiers),
    rejectFlags: unique(hardDisqualifiers),
    rejectReasonExamples: REJECT_REASON_EXAMPLES,
    evidenceItems: evidence,
    evidenceSummary,
    evidenceQuality: quality.level,
    credibilitySignals: quality.flags,
    positiveSignals: positives,
    risks: unique(risks),
    concerns: unique([...risks, ...hardDisqualifiers]),
    keyNote: evidence[0] || hardDisqualifiers[0] || "Needs recruiter review.",
    whyScreen,
    whatIsMissing: missingSummary,
    whatIsRisky: riskSummary,
    summary: `${whyScreen} ${missingSummary} Risk or unclear: ${riskSummary}`,
    whyInteresting: whyScreen,
    suggestedQuestions: [
      `Which work best proves direct ownership of ${req.requiredSkills.slice(0, 2).join(" and ")}?`,
      evidence[0] ? `Can you walk through the outcome behind this resume evidence: ${evidence[0]}?` : `What concrete project best shows readiness for ${req.jobTitle}?`,
      missingMustHaves[0] ? `I did not see clear evidence for ${missingMustHaves[0]}. How have you handled that area?` : "Which result would your last manager point to as your strongest proof point?",
      quality.flags.length ? `Some resume evidence is ${quality.level.toLowerCase()}. What should we verify in the screen?` : "What scope, metrics, and tradeoffs were you personally accountable for?"
    ]
  };
}

function bucketRank(candidate) {
  return { "Strong screen": 0, Review: 1, Reject: 2 }[candidate.screeningBucket] ?? 9;
}

function qualityRank(candidate) {
  return { "Strong evidence": 0, "Moderate evidence": 1, "Weak evidence": 2 }[candidate.evidenceQuality] ?? 9;
}

export function analyze(jobDescription, candidates, edited) {
  const requirements = edited || extractRequirements(jobDescription);
  const analyzed = candidates
    .map((candidate) => {
      const parsed = parse(candidate);
      const result = score(parsed, requirements);
      return { ...parsed, ...result };
    })
    .sort((a, b) => bucketRank(a) - bucketRank(b) || qualityRank(a) - qualityRank(b) || b.secondaryScore - a.secondaryScore);

  const bucketCounts = { "Strong screen": 0, Review: 0, Reject: 0 };
  analyzed.forEach((candidate) => {
    bucketCounts[candidate.screeningBucket]++;
  });

  return {
    requirements,
    candidates: analyzed,
    summary: {
      totalApplicants: analyzed.length,
      totalCandidates: analyzed.length,
      autoRejected: bucketCounts.Reject,
      needsReview: bucketCounts.Review,
      strongScreen: bucketCounts["Strong screen"],
      bucketCounts,
      decisionCounts: bucketCounts,
      topRejectReasons: topCounts(analyzed.flatMap((candidate) => candidate.hardDisqualifiers)),
      commonMissingMustHaves: topCounts(analyzed.flatMap((candidate) => candidate.missingMustHaves)),
      shortlist: analyzed.filter((candidate) => candidate.screeningBucket === "Strong screen"),
      topScreens: analyzed.filter((candidate) => candidate.screeningBucket === "Strong screen").slice(0, 5)
    }
  };
}

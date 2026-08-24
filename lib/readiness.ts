export type Criticality = "CRITICAL" | "HIGH" | "NORMAL";
export type DeliveryStatus = "ON_TRACK" | "AT_RISK" | "BLOCKED" | "READY";

const WEIGHTS: Record<Criticality, number> = { CRITICAL: 5, HIGH: 3, NORMAL: 1 };

export type ReadinessInput = {
  requirements: { priority: Criticality; status: string; human_review_status: string; mandatory?: boolean }[];
  deliverables: { criticality: Criticality; status: string }[];
  evidence: { verification_status: string }[];
  verification: { status: string }[];
  acceptance: { status: string; evidence_required?: boolean }[];
  targetDeliveryDate?: string | null;
};

export type Blocker = {
  code: string;
  severity: "P0" | "P1" | "P2";
  title: string;
  detail: string;
  objectType?: string;
  objectId?: string;
};

function weightedScore(items: { criticality?: Criticality; priority?: Criticality; status: string; good: string[]; partial?: string[] }[]) {
  if (!items.length) return 100;
  let total = 0;
  let earned = 0;
  for (const item of items) {
    const weight = WEIGHTS[item.criticality ?? item.priority ?? "NORMAL"];
    total += weight;
    earned += weight * (item.good.includes(item.status) ? 1 : item.partial?.includes(item.status) ? 0.5 : 0);
  }
  return Math.round((earned / total) * 100);
}

export function calculateReadiness(input: ReadinessInput) {
  const requirementScore = weightedScore(input.requirements.map(r => ({ priority: r.priority, status: r.status === "VERIFIED" ? "VERIFIED" : r.human_review_status === "APPROVED" && r.status === "OPEN" ? "OPEN" : r.status, good: ["VERIFIED"], partial: ["OPEN", "IN_PROGRESS", "PARTIALLY_VERIFIED"] })));
  const deliverableScore = weightedScore(input.deliverables.map(d => ({ criticality: d.criticality, status: d.status, good: ["DELIVERED", "ACCEPTED"], partial: ["READY", "IN_PROGRESS"] })));
  const evidenceScore = input.evidence.length ? Math.round(input.evidence.filter(e => e.verification_status === "VERIFIED").length / input.evidence.length * 100) : 100;
  const verificationScore = input.verification.length ? Math.round(input.verification.filter(v => v.status === "PASSED").length / input.verification.length * 100) : 100;
  const acceptanceScore = input.acceptance.length ? Math.round(input.acceptance.filter(a => a.status === "ACCEPTED").length / input.acceptance.length * 100) : 100;

  const overall = Math.round(requirementScore * 0.30 + deliverableScore * 0.20 + evidenceScore * 0.20 + verificationScore * 0.20 + acceptanceScore * 0.10);

  const blockers: Blocker[] = [];
  input.requirements.forEach((r) => {
    if (r.priority === "CRITICAL" && r.mandatory !== false && r.human_review_status !== "APPROVED") {
      blockers.push({ code: "REQ_UNAPPROVED", severity: "P0", title: "Critical requirement is not approved", detail: "A mandatory critical requirement still requires human review." });
    }
    if (r.priority === "CRITICAL" && r.mandatory !== false && r.status === "FAILED") {
      blockers.push({ code: "REQ_FAILED", severity: "P0", title: "Critical requirement failed", detail: "A mandatory critical requirement has a failed verification state." });
    }
  });

  if (input.deliverables.some(d => d.criticality === "CRITICAL" && ["OPEN", "IN_PROGRESS", "REJECTED"].includes(d.status))) {
    blockers.push({ code: "DELIVERABLE_OPEN", severity: "P0", title: "Critical deliverable is not ready", detail: "At least one critical deliverable remains open, in progress or rejected." });
  }
  if (input.verification.some(v => v.status === "FAILED")) {
    blockers.push({ code: "VERIFY_FAILED", severity: "P0", title: "Verification failure exists", detail: "At least one verification record is failed." });
  }
  if (input.acceptance.some(a => a.status === "REJECTED")) {
    blockers.push({ code: "ACCEPT_REJECTED", severity: "P0", title: "Acceptance item rejected", detail: "At least one acceptance item is rejected." });
  }
  if (input.targetDeliveryDate) {
    const today = new Date();
    const deadline = new Date(`${input.targetDeliveryDate}T23:59:59Z`);
    const days = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
    if (days < 0 && overall < 100) blockers.push({ code: "OVERDUE", severity: "P1", title: "Delivery date has passed", detail: `Target delivery date was ${input.targetDeliveryDate}.` });
    else if (days <= 7 && overall < 90) blockers.push({ code: "DEADLINE_NEAR", severity: "P1", title: "Delivery deadline is near", detail: `${days} days remain while readiness is below 90%.` });
  }

  const status: DeliveryStatus = blockers.some(b => b.severity === "P0") ? "BLOCKED" : blockers.length || overall < 85 ? "AT_RISK" : overall >= 95 ? "READY" : "ON_TRACK";
  return {
    requirementScore,
    deliverableScore,
    evidenceScore,
    verificationScore,
    acceptanceScore,
    overallScore: overall,
    blockerCount: blockers.length,
    deliveryStatus: status,
    blockers,
    calculationVersion: "v2",
  };
}

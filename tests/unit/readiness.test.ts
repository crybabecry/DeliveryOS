import { describe, expect, it } from "vitest";
import { calculateReadiness } from "@/lib/readiness";

describe("calculateReadiness", () => {
  it("blocks when a critical requirement is failed", () => {
    const r = calculateReadiness({
      requirements: [{ priority: "CRITICAL", status: "FAILED", human_review_status: "APPROVED", mandatory: true }],
      deliverables: [{ criticality: "CRITICAL", status: "ACCEPTED" }],
      evidence: [{ verification_status: "VERIFIED" }],
      verification: [{ status: "FAILED" }],
      acceptance: [{ status: "ACCEPTED" }],
      targetDeliveryDate: null,
    });
    expect(r.deliveryStatus).toBe("BLOCKED");
    expect(r.blockerCount).toBeGreaterThan(0);
  });

  it("returns a ready project when every workflow object is complete", () => {
    const r = calculateReadiness({
      requirements: [{ priority: "NORMAL", status: "VERIFIED", human_review_status: "APPROVED", mandatory: true }],
      deliverables: [{ criticality: "NORMAL", status: "ACCEPTED" }],
      evidence: [{ verification_status: "VERIFIED" }],
      verification: [{ status: "PASSED" }],
      acceptance: [{ status: "ACCEPTED" }],
      targetDeliveryDate: "2099-01-01",
    });
    expect(r.overallScore).toBe(100);
    expect(r.deliveryStatus).toBe("READY");
    expect(r.blockerCount).toBe(0);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateReadiness } from "../readiness";

export async function computeAndPersistReadiness(supabase: SupabaseClient, projectId: string) {
  const [{ data: project }, { data: requirements }, { data: deliverables }, { data: evidence }, { data: verification }, { data: acceptance }] = await Promise.all([
    supabase.from("projects").select("id,organization_id,target_delivery_date").eq("id", projectId).single(),
    supabase.from("requirements").select("priority,status,human_review_status,mandatory").eq("project_id", projectId),
    supabase.from("deliverables").select("criticality,status").eq("project_id", projectId),
    supabase.from("evidence").select("verification_status").eq("project_id", projectId),
    supabase.from("verification_records").select("status").eq("project_id", projectId),
    supabase.from("acceptance_items").select("status,evidence_required").eq("project_id", projectId),
  ]);
  if (!project) throw new Error("Project not found");

  const result = calculateReadiness({
    requirements: (requirements ?? []) as never,
    deliverables: (deliverables ?? []) as never,
    evidence: evidence ?? [],
    verification: verification ?? [],
    acceptance: acceptance ?? [],
    targetDeliveryDate: project.target_delivery_date,
  });

  const { data: snapshotId, error } = await supabase.rpc("record_readiness_snapshot", {
    p_project_id: projectId,
    p_requirement_score: result.requirementScore,
    p_deliverable_score: result.deliverableScore,
    p_evidence_score: result.evidenceScore,
    p_verification_score: result.verificationScore,
    p_acceptance_score: result.acceptanceScore,
    p_overall_score: result.overallScore,
    p_delivery_status: result.deliveryStatus,
    p_blocker_count: result.blockerCount,
    p_explanation: { blockers: result.blockers, dimensions: {
      requirements: result.requirementScore,
      deliverables: result.deliverableScore,
      evidence: result.evidenceScore,
      verification: result.verificationScore,
      acceptance: result.acceptanceScore,
    } },
    p_calculation_version: result.calculationVersion,
  });
  if (error) throw new Error(error.message);
  return { ...result, snapshotId };
}

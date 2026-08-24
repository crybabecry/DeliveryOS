"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function reviewRequirement(formData: FormData) {
  const id = String(formData.get("requirementId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  if (!id || !["APPROVED", "REJECTED"].includes(decision)) redirect("/app/requirements");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: requirement } = await supabase.from("requirements").select("id,project_id,source_text").eq("id", id).single();
  if (!requirement) redirect("/app/requirements");
  const { data: project } = await supabase.from("projects").select("organization_id").eq("id", requirement.project_id).single();
  const { error } = await supabase.from("requirements").update({ human_review_status: decision, status: decision === "APPROVED" ? "OPEN" : "DRAFT" }).eq("id", id);
  if (error) redirect(`/app/requirements?error=${encodeURIComponent(error.message)}`);
  if (decision === "APPROVED") await supabase.rpc("recalculate_requirement_status", { p_requirement_id: id });
  if (project) await supabase.from("activity_log").insert({ organization_id: project.organization_id, project_id: requirement.project_id, actor_id: user.id, action: `REQUIREMENT_${decision}`, object_type: "requirement", object_id: id, metadata: { source_text_length: requirement.source_text.length } });
  revalidatePath("/app/requirements"); revalidatePath("/app/delivery"); revalidatePath(`/app/projects/${requirement.project_id}`);
  redirect(`/app/requirements?project=${encodeURIComponent(requirement.project_id)}`);
}

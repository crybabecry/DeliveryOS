"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { projectSchema } from "@/lib/validation";

export async function createProject(formData: FormData) {
  const parsed = projectSchema.safeParse({ name: formData.get("name"), code: formData.get("code"), description: formData.get("description"), targetDeliveryDate: formData.get("targetDeliveryDate") });
  if (!parsed.success) redirect(`/app/projects/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid project data")}`);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!member) redirect("/app/onboarding");
  const { data: project, error } = await supabase.from("projects").insert({ organization_id: member.organization_id, name: parsed.data.name, code: parsed.data.code, description: parsed.data.description || null, target_delivery_date: parsed.data.targetDeliveryDate || null, created_by: user.id }).select("id").single();
  if (error || !project) redirect(`/app/projects/new?error=${encodeURIComponent(error?.message ?? "Could not create project")}`);
  await supabase.from("activity_log").insert({ organization_id: member.organization_id, project_id: project.id, actor_id: user.id, action: "PROJECT_CREATED", object_type: "project", object_id: project.id });
  redirect(`/app/projects/${project.id}`);
}

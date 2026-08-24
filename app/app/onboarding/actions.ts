"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function createWorkspace(formData: FormData) {
  const organization = String(formData.get("organization") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const existing = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1);
  if (existing.data?.length) redirect("/app");
  const profile = await supabase.from("user_profiles").upsert({ user_id: user.id, display_name: String(user.user_metadata?.display_name ?? "").trim() || null });
  if (profile.error) redirect(`/app/onboarding?error=${encodeURIComponent(profile.error.message)}`);
  const { data: org, error: orgError } = await supabase.from("organizations").insert({ name: organization, slug }).select("id").single();
  if (orgError || !org) redirect(`/app/onboarding?error=${encodeURIComponent(orgError?.message ?? "Could not create workspace")}`);
  const member = await supabase.from("organization_members").insert({ organization_id: org.id, user_id: user.id, role: "OWNER" });
  if (member.error) redirect(`/app/onboarding?error=${encodeURIComponent(member.error.message)}`);
  await supabase.from("subscriptions").insert({ organization_id: org.id, plan_code: "TRIAL", status: "TRIALING" });
  redirect("/app");
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { inviteSchema } from "@/lib/validation";

export async function POST(request:Request){
  const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Unauthenticated"},{status:401});
  const body=await request.json().catch(()=>null);const parsed=inviteSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"Invalid invitation data."},{status:400});
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();if(!membership||!["OWNER","ADMIN"].includes(membership.role))return NextResponse.json({error:"Only owners/admins can invite members."},{status:403});
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!serviceKey)return NextResponse.json({error:"SUPABASE_SERVICE_ROLE_KEY is not configured."},{status:503});
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await admin.auth.admin.inviteUserByEmail(parsed.data.email,{data:{organization_id:membership.organization_id,invited_role:parsed.data.role}});if(error)return NextResponse.json({error:error.message},{status:400});
  const target=data.user?.id;if(target){const {error:memberError}=await supabase.from("organization_members").upsert({organization_id:membership.organization_id,user_id:target,role:parsed.data.role},{onConflict:"organization_id,user_id"});if(memberError)return NextResponse.json({error:memberError.message},{status:400});}
  return NextResponse.json({ok:true});
}

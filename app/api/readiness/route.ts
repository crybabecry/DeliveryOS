import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeAndPersistReadiness } from "@/lib/readiness/service";
export async function POST(request:Request){const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Unauthenticated"},{status:401});const body=await request.json().catch(()=>null) as any;const projectId=String(body?.projectId??"");if(!projectId)return NextResponse.json({error:"projectId is required."},{status:400});try{return NextResponse.json(await computeAndPersistReadiness(supabase,projectId));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Calculation failed."},{status:400});}}

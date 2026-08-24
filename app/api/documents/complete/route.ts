import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
export async function POST(request:Request){
  const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Unauthenticated"},{status:401});
  const body=await request.json().catch(()=>null) as any;const documentId=String(body?.documentId??"").trim();const versionId=String(body?.versionId??"").trim();const checksum=String(body?.checksum??"").trim();const fileSize=Number(body?.fileSize);
  if(!documentId||!versionId||!checksum||!Number.isFinite(fileSize))return NextResponse.json({error:"Invalid completion payload."},{status:400});
  const {data:version}=await supabase.from("document_versions").select("id,document_id,storage_path,file_size,mime_type").eq("id",versionId).eq("document_id",documentId).single();if(!version)return NextResponse.json({error:"Document version not found."},{status:404});
  const downloaded=await supabase.storage.from("documents").download(version.storage_path);if(downloaded.error||!downloaded.data)return NextResponse.json({error:"Uploaded file could not be verified."},{status:400});if(downloaded.data.size!==fileSize)return NextResponse.json({error:"File size mismatch."},{status:400});
  const {data:document}=await supabase.from("documents").select("id,project_id,projects(id,organization_id)").eq("id",documentId).single();if(!document)return NextResponse.json({error:"Document not found."},{status:404});
  await supabase.from("document_versions").update({checksum,file_size:fileSize}).eq("id",versionId);
  const project=Array.isArray(document.projects)?document.projects[0]:document.projects;if(!project)return NextResponse.json({error:"Project context unavailable."},{status:500});
  await supabase.from("documents").update({status:version.mime_type==="application/pdf"?"PROCESSING":"READY"}).eq("id",documentId);
  if(version.mime_type!=="application/pdf")return NextResponse.json({ok:true});
  const {data:job,error}=await supabase.from("processing_jobs").insert({organization_id:project.organization_id,project_id:project.id,job_type:"DOCUMENT_INGESTION",status:"QUEUED",input:{document_id:documentId,document_version_id:versionId,mime_type:version.mime_type}}).select("id").single();
  if(error||!job)return NextResponse.json({error:error?.message||"Could not create processing job."},{status:500});
  await supabase.from("activity_log").insert({organization_id:project.organization_id,project_id:project.id,actor_id:user.id,action:"DOCUMENT_UPLOADED",object_type:"document",object_id:documentId,metadata:{job_id:job.id,version_id:versionId}});
  return NextResponse.json({ok:true,jobId:job.id});
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const MAX_BYTES=25*1024*1024;
const ALLOWED=new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"]);
export async function POST(request:Request){
  const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Unauthenticated"},{status:401});
  const body=await request.json().catch(()=>null) as any;const projectId=String(body?.projectId??"").trim();const name=String(body?.name??"").trim();const mimeType=String(body?.mimeType??"").trim();const fileSize=Number(body?.fileSize);
  if(!projectId||!name||!mimeType||!Number.isFinite(fileSize))return NextResponse.json({error:"projectId, name, mimeType and fileSize are required."},{status:400});
  if(fileSize<=0||fileSize>MAX_BYTES)return NextResponse.json({error:"File exceeds the 25 MB limit."},{status:400});if(!ALLOWED.has(mimeType))return NextResponse.json({error:"Unsupported file type."},{status:400});
  const {data:project,error:projectError}=await supabase.from("projects").select("id,organization_id").eq("id",projectId).single();if(projectError||!project)return NextResponse.json({error:"Project not found."},{status:404});
  const documentId=randomUUID(),versionId=randomUUID();const storagePath=`${project.organization_id}/${project.id}/${documentId}/A/${versionId}-${sanitize(name)}`;
  const documentType=mimeType==="application/pdf"?"CONTRACT_OR_PDF":mimeType.includes("spreadsheet")?"SPREADSHEET":"DOCUMENT";
  const {error:docError}=await supabase.from("documents").insert({id:documentId,project_id:project.id,name,document_type:documentType,status:"UPLOADED",current_revision:"A",created_by:user.id});if(docError)return NextResponse.json({error:docError.message},{status:400});
  if(documentType==="CONTRACT_OR_PDF"){
    const {error}=await supabase.from("contracts").insert({project_id:project.id,name:`Imported source — ${name.slice(0,180)}`,status:"DRAFT",source_document_id:documentId});if(error){await supabase.from("documents").delete().eq("id",documentId);return NextResponse.json({error:error.message},{status:400});}
  }
  const {error:versionError}=await supabase.from("document_versions").insert({id:versionId,document_id:documentId,revision:"A",storage_path:storagePath,checksum:`pending-${versionId}`,mime_type:mimeType,file_size:fileSize,uploaded_by:user.id});if(versionError){await supabase.from("documents").delete().eq("id",documentId);return NextResponse.json({error:versionError.message},{status:400});}
  return NextResponse.json({documentId,versionId,storagePath});
}
function sanitize(value:string){return value.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,180)||"document";}

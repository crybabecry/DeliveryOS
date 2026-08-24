import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { extractRequirementsFromPdf } from "@/lib/ai/extraction";

export const maxDuration = 300;
export async function POST(request:Request){
  const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Unauthenticated"},{status:401});
  const body=await request.json().catch(()=>null) as any;const jobId=String(body?.jobId??"").trim();if(!jobId)return NextResponse.json({error:"jobId is required."},{status:400});
  const {data:job}=await supabase.from("processing_jobs").select("id,project_id,organization_id,status,attempt_count,input").eq("id",jobId).single();if(!job)return NextResponse.json({error:"Job not found."},{status:404});
  if(job.status==="SUCCEEDED")return NextResponse.json({ok:true,alreadyProcessed:true});if(job.status==="RUNNING")return NextResponse.json({error:"Job is already running."},{status:409});
  const input=(job.input??{}) as {document_id?:string;document_version_id?:string};if(!input.document_id||!input.document_version_id)return NextResponse.json({error:"Job input is incomplete."},{status:422});
  await supabase.from("processing_jobs").update({status:"RUNNING",attempt_count:(job.attempt_count??0)+1,started_at:new Date().toISOString(),error_code:null,error_message:null}).eq("id",jobId);
  try {
    const {data:version}=await supabase.from("document_versions").select("id,storage_path,mime_type").eq("id",input.document_version_id).single();
    if(!version||version.mime_type!=="application/pdf")throw new Error("Only PDF documents are processed by the MVP AI extractor.");
    const blob=(await supabase.storage.from("documents").download(version.storage_path)).data;
    if(!blob)throw new Error("Could not download source document.");
    const extraction=await extractRequirementsFromPdf(blob);
    const {data:document}=await supabase.from("documents").select("id,project_id").eq("id",input.document_id).single();if(!document)throw new Error("Document not found.");
    const {data:contract}=await supabase.from("contracts").select("id").eq("source_document_id",document.id).maybeSingle();
    const contractId=contract?.id ?? (await supabase.from("contracts").insert({project_id:document.project_id,name:`Imported source ${document.id}`,status:"DRAFT",source_document_id:document.id}).select("id").single()).data?.id;
    if(!contractId)throw new Error("Contract context could not be created.");
    const rows=extraction.requirements.slice(0,200).map(item=>({project_id:document.project_id,contract_id:contractId,source_document_id:document.id,source_page:typeof item.source_page==="number"&&item.source_page>0?item.source_page:null,source_locator:typeof item.source_page==="number"?`page:${item.source_page}`:null,source_text:String(item.text??"").trim(),normalized_text:String(item.text??"").trim(),category:typeof item.category==="string"?item.category:null,priority:item.priority==="CRITICAL"||item.priority==="HIGH"?item.priority:"NORMAL",mandatory:item.mandatory!==false,status:"DRAFT",verification_method:["DOCUMENT_REVIEW","TEST","INSPECTION","CERTIFICATE","ANALYSIS","DEMONSTRATION"].includes(String(item.verification_method))?String(item.verification_method):null,due_date:/^\d{4}-\d{2}-\d{2}$/.test(String(item.due_date??""))?String(item.due_date):null,ai_confidence:typeof item.confidence==="number"?Math.max(0,Math.min(1,item.confidence)):null,human_review_status:"PENDING"}));
    if(rows.length){const {error}=await supabase.from("requirements").insert(rows);if(error)throw new Error(error.message);}
    await supabase.from("documents").update({status:"READY"}).eq("id",document.id);
    await supabase.from("processing_jobs").update({status:"SUCCEEDED",finished_at:new Date().toISOString(),output:{extracted_requirements:rows.length,contract_id:contractId,model:process.env.OPENAI_MODEL||"gpt-5.6-luna"}}).eq("id",job.id);
    await supabase.from("activity_log").insert({organization_id:job.organization_id,project_id:job.project_id,actor_id:user.id,action:"DOCUMENT_REQUIREMENTS_EXTRACTED",object_type:"document",object_id:document.id,metadata:{job_id:job.id,extracted_requirements:rows.length}});
    return NextResponse.json({ok:true,extractedRequirements:rows.length});
  } catch(e) {
    const msg=e instanceof Error?e.message:"AI extraction failed.";
    await supabase.from("processing_jobs").update({status:"FAILED",finished_at:new Date().toISOString(),error_code:"INGESTION_FAILED",error_message:msg}).eq("id",job.id);
    await supabase.from("documents").update({status:"READY"}).eq("id",input.document_id);
    return NextResponse.json({error:msg},{status:502});
  }
}

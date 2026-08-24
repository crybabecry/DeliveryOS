"use client";
import { ChangeEvent, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"]);

export default function DocumentUploader({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null); const [message,setMessage]=useState<string|null>(null);
  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; setError(null); setMessage(null); if(!file)return;
    if(file.size<=0||file.size>MAX_BYTES){setError("File must be between 1 byte and 25 MB.");return;}
    if(!ALLOWED_TYPES.has(file.type)){setError("Supported formats: PDF, DOC, DOCX, XLS, XLSX.");return;}
    setBusy(true);
    try {
      const prepared=await postJson("/api/documents/prepare",{projectId,name:file.name,mimeType:file.type,fileSize:file.size,documentType:file.type==="application/pdf"?"CONTRACT_OR_PDF":"DOCUMENT"});
      const supabase=createSupabaseBrowserClient();
      const uploaded=await supabase.storage.from("documents").upload(prepared.storagePath,file,{contentType:file.type,upsert:false});
      if(uploaded.error)throw new Error(uploaded.error.message);
      const checksum=await sha256(file);
      const completed=await postJson("/api/documents/complete",{documentId:prepared.documentId,versionId:prepared.versionId,checksum,fileSize:file.size});
      if(completed.jobId){
        const processed=await fetch("/api/documents/process",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobId:completed.jobId})});
        const data=await processed.json().catch(()=>({}));
        if(!processed.ok)throw new Error(data.error||"Document processing failed.");
        setMessage(`Uploaded ${file.name}. ${data.extractedRequirements ?? 0} requirement drafts created.`);
      } else setMessage(`Uploaded ${file.name}.`);
      if(inputRef.current) inputRef.current.value="";
      setTimeout(()=>window.location.reload(),400);
    } catch(e){setError(e instanceof Error?e.message:"Upload failed.");} finally {setBusy(false);}
  }
  return <div className="upload-box"><div className="upload-copy"><strong>Upload a source or supporting document</strong><span>Private Storage · max 25 MB · PDF/DOC/DOCX/XLS/XLSX</span></div><input ref={inputRef} type="file" accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx" hidden onChange={onChange}/><button className="btn btn-primary" type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?"Processing…":"Choose file"}</button>{message?<div className="notice notice-success">{message}</div>:null}{error?<div className="notice notice-error">{error}</div>:null}</div>;
}
async function postJson(url:string,body:unknown){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data as Record<string,any>;}
async function sha256(file:File){const buffer=await file.arrayBuffer();const digest=await crypto.subtle.digest("SHA-256",buffer);return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,"0")).join("");}

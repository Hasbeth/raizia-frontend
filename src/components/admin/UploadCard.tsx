"use client";

import { useRef, useState, type FormEvent } from "react";
import { Link2, Upload } from "lucide-react";
import { OFFICIAL_DOMAINS, STATUS_LABEL, formatBytes, type CategoryNode } from "@/lib/constants";
import type { CreateResult } from "@/lib/types";
import { api, errorMessage, jsonRequest } from "./api";
import { CategoryPicker } from "./CategoryPicker";

function uploadDirect(url:string,method:string,file:File,onProgress:(percent:number)=>void):Promise<void> {
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open(method,url);
    xhr.timeout=240_000;
    xhr.setRequestHeader("Content-Type",file.type||"application/octet-stream");
    xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
    xhr.onload=()=>{
      if(xhr.status>=200&&xhr.status<300) resolve();
      else {
        let message="No pudimos subir el archivo. Intenta de nuevo.";
        try {const data=JSON.parse(xhr.responseText);message=data.error||data.message||message;} catch {}
        reject(new Error(message));
      }
    };
    xhr.onerror=()=>reject(new Error("No pudimos conectar. Revisa tu conexión e intenta de nuevo."));
    xhr.ontimeout=()=>reject(new Error("La subida tardó demasiado. Intenta de nuevo."));
    xhr.send(file);
  });
}
type FileResult = Partial<CreateResult> & { fileName: string; ok: boolean; error?: string };

function ResultMessage({ result }: { result: FileResult }) {
  const label = !result.ok ? "Error" : result.duplicate ? "Duplicado" : result.warning ? "Aviso" : "Éxito";
  return (
    <li className={`rounded-xl border p-3 text-sm ${!result.ok ? "border-clay/30 bg-clay-soft/40" : result.warning ? "border-ochre/30 bg-ochre-soft/40" : "border-forest-100 bg-forest-50"}`}>
      <p className="break-words font-semibold">{label} · {result.fileName}</p>
      <p className="mt-1 break-words leading-relaxed">{result.error || (result.duplicate ? "Este documento ya está en la biblioteca. No creamos otra copia." : result.warning || (result.document?.status === "aprobado" ? "Documento agregado y publicado: ya aparece en la biblioteca y el asistente puede usarlo." : `Documento agregado. Estado: ${result.document ? STATUS_LABEL[result.document.status] : "En revisión"}. Para que aparezca en la biblioteca, apruébalo en la lista de documentos.`))}</p>
    </li>
  );
}

export function UploadCard({ categories, onChanged }: { categories: CategoryNode[]; onChanged: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [ids, setIds] = useState<number[]>([]);
  const [publish, setPublish] = useState(false);
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<FileResult | null>(null);
  function selectFiles(selected: File[]) {
    if (uploadingRef.current) return;
    setFiles(selected);
    setResults([]);
  }
  async function uploadFiles() {
    if (uploadingRef.current || !files.length) return;
    uploadingRef.current = true;
    setUploading(true);
    setResults([]);
    const localResults = files.map((file): FileResult | null => {
      const error = !/\.(pdf|docx)$/i.test(file.name) ? "Solo se admiten archivos PDF o DOCX." : file.size > 30 * 1024 * 1024 ? "El archivo supera el límite de 30 MB." : !file.size ? "El archivo está vacío." : "";
      if (error) return { fileName: file.name, ok: false, error };
      return null;
    });
    try {
      const completed: FileResult[] = [];
      for (const [index, file] of files.entries()) {
        const rejected = localResults[index];
        if (rejected) { completed.push(rejected); continue; }
        try {
          setProgress(`${index + 1}/${files.length} · Preparando ${file.name}…`);
          const ticket = await api<{uploadUrl?:string;path:string;method?:string;local?:boolean}>("/api/admin/uploads",
            jsonRequest("POST",{fileName:file.name,size:file.size,mime:file.type}));
          if (ticket.uploadUrl) {
            await uploadDirect(ticket.uploadUrl,ticket.method||"PUT",file,percent=>setProgress(`${index+1}/${files.length} · ${file.name} · ${percent} % subido`));
            setProgress(`${index+1}/${files.length} · Leyendo e indexando ${file.name}…`);
            const result=await api<CreateResult>("/api/admin/documents/ingest",jsonRequest("POST",{path:ticket.path,fileName:file.name,categoryIds:ids,publicar:publish}));
            completed.push({...result,fileName:file.name,ok:true});
          } else if (ticket.local) {
            const form=new FormData(); form.append("files",file); form.append("categoryIds",JSON.stringify(ids));
            if (publish) form.append("publicar","si");
            const response=await api<{results:FileResult[]}>("/api/admin/documents",{method:"POST",body:form});
            completed.push(response.results[0]||{fileName:file.name,ok:false,error:"No recibimos el resultado de este archivo. Intenta de nuevo."});
          } else {
            throw new Error("No recibimos una dirección de subida. Intenta de nuevo.");
          }
        } catch (error) {
          completed.push({ fileName: file.name, ok: false, error: errorMessage(error) });
        }
      }
      setResults(completed);
      if (completed.some((result) => result.ok)) onChanged();
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      setResults(localResults.map((result, i) => result || { fileName: files[i].name, ok: false, error: errorMessage(error) }));
    } finally { setUploading(false); setProgress(""); uploadingRef.current = false; }
  }
  async function importUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api<CreateResult>("/api/admin/import-url", jsonRequest("POST", { url, categoryIds: ids }));
      setImportResult({ ...result, fileName: result.document.title, ok: true });
      setUrl("");
      onChanged();
    } catch (error) { setImportResult({ fileName: "Importación", ok: false, error: errorMessage(error) }); }
    finally { setImporting(false); }
  }
  return (
    <section id="agregar" className="card scroll-mt-24 p-5 sm:p-7" aria-labelledby="upload-title">
      <h2 id="upload-title" className="font-display text-2xl text-forest-900">Agregar documentos</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Carga los PDF o Word que descargaste o tienes en tu equipo. RAIZIA extrae el texto, lo divide en apartados y lo clasifica por tema; después puedes corregir el título, la entidad y las categorías con «Revisar/Editar». Los PDF escaneados (fotos de papel) no tienen texto legible y quedan como borrador.</p>
      <div className="mt-6 grid gap-7 md:grid-cols-2">
        <div className="min-w-0" aria-busy={uploading}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Upload size={18} aria-hidden="true" /> Cargar desde tu equipo</h3>
          <div onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragging(true); }} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); selectFiles(Array.from(event.dataTransfer.files)); }}
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? "border-forest-600 bg-forest-100" : "border-line-strong bg-ivory/70"}`}>
            <p className="font-medium text-forest-900">Arrastra tus documentos aquí</p>
            <p id="file-hint" className="hint mt-2">PDF o DOCX · Hasta 30 MB por archivo</p>
            <input ref={fileInput} id="admin-upload-files" type="file" multiple accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={uploading} aria-label="Seleccionar archivos PDF o DOCX" aria-describedby="file-hint" tabIndex={-1} onChange={(event) => selectFiles(Array.from(event.target.files || []))} />
            <button type="button" className="btn btn-secondary mt-4" disabled={uploading} onClick={() => fileInput.current?.click()}>Seleccionar archivos</button>
          </div>
          {files.length > 0 && <div className="mt-3">
            <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line-strong bg-paper px-3.5 py-3 text-sm leading-snug">
              <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-forest-700" />
              <span><strong className="font-semibold">Ya revisé estos documentos: publicarlos de inmediato.</strong> Si no lo marcas, quedan en revisión y no aparecen en la biblioteca hasta que los apruebes.</span>
            </label>
            <ul className="max-h-36 space-y-1 overflow-y-auto text-sm text-muted">{files.map((file, i) => <li key={`${file.name}-${i}`} className="break-words">{file.name} · {formatBytes(file.size)}</li>)}</ul>
            <button type="button" className="btn btn-primary mt-3" disabled={uploading} onClick={uploadFiles}>{uploading ? "Procesando archivos…" : `Cargar ${files.length} ${files.length === 1 ? "archivo" : "archivos"}`}</button>
          </div>}
          <div aria-live="polite" aria-atomic="true" className="mt-3">{uploading && <p className="hint">{progress || "Estamos leyendo e indexando cada archivo. Puede tardar un momento."}</p>}<ul className="space-y-2">{results.map((result, i) => <ResultMessage key={i} result={result} />)}</ul></div>
        </div>
        <div className="min-w-0 border-t border-line pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-7">
          <h3 className="mb-3 flex items-start gap-2 font-semibold"><Link2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> Importar desde una dirección oficial</h3>
          <form onSubmit={importUrl} aria-busy={importing}>
            <label htmlFor="official-import-url" className="label">Dirección del documento</label>
            <input id="official-import-url" type="url" className="input" placeholder="https://www.entidad.gov.co/documento.pdf" value={url} onChange={(event) => setUrl(event.target.value)} required disabled={importing} aria-describedby="official-domains" />
            <p id="official-domains" className="hint mt-3 break-words">Solo se aceptan estos dominios oficiales y sus subdominios: {OFFICIAL_DOMAINS.join(", ")}.</p>
            <button className="btn btn-secondary mt-4" disabled={importing}>{importing ? "Importando documento…" : "Importar documento"}</button>
          </form>
          <div aria-live="polite" className="mt-4">{importing && <p className="hint">Estamos consultando la fuente oficial. Puede tardar un momento.</p>}{importResult && <ul><ResultMessage result={importResult} /></ul>}</div>
        </div>
      </div>
      {categories.length > 0 && <details className="mt-6 border-t border-line pt-4">
        <summary className="rounded-lg py-1 text-sm font-semibold text-forest-800">Asignar categorías a los próximos documentos (opcional)</summary>
        <div className="mt-3 max-w-lg"><CategoryPicker categories={categories} selected={ids} onChange={setIds} disabled={uploading || importing} /><p className="hint">Si no seleccionas ninguna, RAIZIA intentará clasificarlos por su contenido.</p></div>
      </details>}
    </section>
  );
}

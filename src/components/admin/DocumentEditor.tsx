"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { DOC_TYPES, STATUSES, STATUS_LABEL, formatBytes, type CategoryNode, type DocumentSummary, type DocStatus } from "@/lib/constants";
import type { CreateResult, DocumentMeta } from "@/lib/types";
import { api, errorMessage, jsonRequest, useAdminResource } from "./api";
import { CategoryPicker } from "./CategoryPicker";
import { Dialog } from "./Dialog";

type Detail = { document: DocumentSummary; chunks: { id: number; heading: string; content: string }[]; totalChunks: number };
type EditorProps = { id: number; categories: CategoryNode[]; categoriesReady: boolean; onClose: () => void; onChanged: () => void; onSaved: () => void };

export function DocumentEditor(props: EditorProps) {
  const titleId = useId();
  const [revision, setRevision] = useState(0);
  const resource = useAdminResource<Detail>(`/api/admin/documents/${props.id}`, revision);
  return (
    <Dialog title="Revisar documento" titleId={titleId} onClose={props.onClose} wide>
      {resource.loading ? <div className="space-y-5 p-7" role="status"><span className="sr-only">Cargando documento…</span>{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16" />)}</div>
        : resource.error ? <div className="p-7"><p className="notice notice-error" role="alert">{resource.error.message}</p><button className="btn btn-secondary mt-4" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></div>
          : resource.data && <EditorForm {...props} initial={resource.data} />}
    </Dialog>
  );
}

function EditorForm({ initial, categories, categoriesReady, onClose, onChanged, onSaved }: EditorProps & { initial: Detail }) {
  const [detail, setDetail] = useState(initial);
  const [meta, setMeta] = useState(() => ({
    title: initial.document.title, entity: initial.document.entity, docType: initial.document.docType,
    docDate: initial.document.docDate, officialUrl: initial.document.officialUrl, summary: initial.document.summary,
    status: initial.document.status, reviewNote: initial.document.reviewNote, categoryIds: initial.document.categories.map((category) => category.id),
  }));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const replacement = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doc = detail.document;
  const baseUrl = `/api/admin/documents/${doc.id}`;
  function field<K extends keyof typeof meta>(name: K, value: (typeof meta)[K]) { setMeta((current) => ({ ...current, [name]: value })); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const approve = submitter instanceof HTMLButtonElement && submitter.value === "approve";
    const patch: DocumentMeta = { ...meta, status: approve ? "aprobado" : meta.status };
    if (!categoriesReady) delete patch.categoryIds;
    setBusy(approve ? "approve" : "save");
    setError("");
    setNotice("");
    try { await api(baseUrl, jsonRequest("PATCH", patch)); onSaved(); }
    catch (error) { setError(errorMessage(error)); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setBusy(""); }
  }
  async function fileAction(file?: File) {
    setBusy(file ? "file" : "reindex");
    setError("");
    setNotice("");
    try {
      let updated: DocumentSummary;
      if (file) {
        if (!/\.(pdf|docx)$/i.test(file.name)) throw new Error("Solo se admiten archivos PDF o DOCX.");
        if (file.size > 30 * 1024 * 1024) throw new Error("El archivo supera el límite de 30 MB.");
        const form = new FormData();
        form.append("file", file);
        const result = await api<CreateResult>(`${baseUrl}/file`, { method: "POST", body: form });
        updated = result.document;
        field("status", updated.status);
      } else {
        updated = (await api<{ document: DocumentSummary }>(`${baseUrl}/reindex`, { method: "POST" })).document;
      }
      setDetail({ document: updated, chunks: [], totalChunks: updated.chunkCount });
      onChanged();
      setNotice(file ? "Archivo reemplazado. El documento volvió a revisión. Tus cambios en los campos siguen aquí; guárdalos al terminar." : "Texto indexado de nuevo. Tus cambios en los campos siguen aquí; guárdalos al terminar.");
      try { setDetail(await api<Detail>(baseUrl)); }
      catch { setError("El archivo se actualizó, pero no pudimos cargar la vista previa. Cierra y abre el editor para consultarla."); }
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(""); if (replacement.current) replacement.current.value = ""; }
  }
  return (
    <form onSubmit={save} aria-busy={!!busy}>
      <fieldset disabled={!!busy} className="min-w-0 space-y-6 p-5 sm:p-7">
        <div><label htmlFor="edit-title" className="label">Título</label><input autoFocus id="edit-title" className="input" required value={meta.title} onChange={(event) => field("title", event.target.value)} /></div>
        <div><label htmlFor="edit-entity" className="label">Entidad emisora</label><input id="edit-entity" className="input" value={meta.entity} onChange={(event) => field("entity", event.target.value)} placeholder="Por ejemplo, Corte Constitucional" /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="edit-type" className="label">Tipo de documento</label><select id="edit-type" className="input" value={meta.docType} onChange={(event) => field("docType", event.target.value)}>{!DOC_TYPES.some((type) => type === meta.docType) && <option value={meta.docType}>{meta.docType || "Selecciona un tipo"}</option>}{DOC_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div><label htmlFor="edit-date" className="label">Fecha</label><input id="edit-date" className="input" value={meta.docDate} pattern="[0-9]{4}(-[0-9]{2}-[0-9]{2})?" onChange={(event) => field("docDate", event.target.value)} placeholder="2024 o 2024-03-15" aria-describedby="edit-date-hint" /><p id="edit-date-hint" className="hint">Usa AAAA o AAAA-MM-DD. Puedes dejarla vacía.</p></div>
        </div>
        <div><label htmlFor="edit-url" className="label">Enlace oficial</label><input id="edit-url" className="input" type="url" value={meta.officialUrl} onChange={(event) => field("officialUrl", event.target.value)} placeholder="https://…" /></div>
        <div><label htmlFor="edit-summary" className="label">Resumen</label><textarea id="edit-summary" className="input" rows={4} value={meta.summary} onChange={(event) => field("summary", event.target.value)} /></div>
        {categoriesReady ? <CategoryPicker categories={categories} selected={meta.categoryIds} onChange={(ids) => field("categoryIds", ids)} /> : <p className="notice notice-info">Las categorías no están disponibles en este momento. Las clasificaciones actuales se conservarán al guardar.</p>}
        <div><label htmlFor="edit-status" className="label">Estado</label><select id="edit-status" className="input" value={meta.status} onChange={(event) => field("status", event.target.value as DocStatus)}>{STATUSES.map((status) => <option key={status} value={status} disabled={status === "aprobado" && doc.chunkCount === 0}>{STATUS_LABEL[status]}</option>)}</select>{doc.chunkCount === 0 && <p className="hint">Para aprobar este documento primero debe tener texto indexado.</p>}</div>
        <div><label htmlFor="edit-note" className="label">Nota de revisión</label><textarea id="edit-note" className="input" rows={3} value={meta.reviewNote} onChange={(event) => field("reviewNote", event.target.value)} placeholder="Anota lo que falta verificar o corregir." /></div>
        <section className="rounded-2xl border border-line bg-ivory p-4" aria-labelledby="file-info-title">
          <h3 id="file-info-title" className="font-semibold text-forest-900">Archivo y texto</h3>
          <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-muted">Nombre</dt><dd className="mt-1 break-all">{doc.fileName}</dd></div>
            <div><dt className="text-muted">Tamaño</dt><dd className="mt-1">{formatBytes(doc.fileSize)}</dd></div>
            <div><dt className="text-muted">Origen</dt><dd className="mt-1">{doc.sourceKind === "upload" ? "Archivo cargado" : "Dirección oficial"}</dd></div>
            <div><dt className="text-muted">Fragmentos indexados</dt><dd className="mt-1">{doc.chunkCount}</dd></div>
          </dl>
          <details className="mt-5 border-t border-line pt-3">
            <summary className="rounded py-1 font-semibold">Texto extraído</summary>
            <p className="hint">Vista previa: {detail.chunks.length} de {detail.totalChunks} fragmentos.</p>
            <div className="mt-3 max-h-72 space-y-5 overflow-y-auto rounded-xl bg-paper p-4 text-sm" tabIndex={0} role="region" aria-label="Vista previa del texto extraído">
              {detail.chunks.length ? detail.chunks.map((chunk) => <section key={chunk.id}>{chunk.heading && <h4 className="mb-2 text-xs font-semibold tracking-wider text-forest-700 uppercase">{chunk.heading}</h4>}<p className="break-words whitespace-pre-wrap leading-relaxed">{chunk.content}</p></section>) : <p className="text-muted">No hay texto disponible en esta vista previa. Si el archivo es escaneado, necesita reconocimiento de texto (OCR).</p>}
            </div>
          </details>
          <p id="replacement-hint" className="hint mt-5">Reemplazar el archivo lo devuelve a revisión. Se aceptan PDF y DOCX de hasta 30 MB.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={replacement} type="file" accept=".pdf,.docx" className="sr-only" tabIndex={-1} aria-label="Seleccionar archivo de reemplazo" aria-describedby="replacement-hint" onChange={(event) => { const file = event.target.files?.[0]; if (file) void fileAction(file); }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => replacement.current?.click()}>{busy === "file" ? "Reemplazando…" : "Reemplazar archivo"}</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileAction()}>{busy === "reindex" ? "Indexando…" : "Volver a indexar"}</button>
            <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Ver original<span className="sr-only"> (abre otra pestaña)</span></a>
          </div>
        </section>
      </fieldset>
      <div className="sticky bottom-0 border-t border-line bg-paper p-5 sm:px-7">
        <div aria-live="polite" className="space-y-3">
          {error && <p ref={errorRef} tabIndex={-1} className="notice notice-error mb-4" role="alert">{error}</p>}
          {notice && <p className="notice notice-info mb-4">{notice}</p>}
        </div>
        <div className="flex flex-wrap gap-2 max-sm:[&>button]:w-full">
          <button type="submit" value="save" className="btn btn-primary" disabled={!!busy}>{busy === "save" ? "Guardando…" : "Guardar cambios"}</button>
          <button type="submit" value="approve" className="btn btn-accent" disabled={!!busy || doc.chunkCount === 0}>{busy === "approve" ? "Aprobando…" : "Guardar y aprobar"}</button>
          <button type="button" className="btn btn-ghost sm:ml-auto" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </form>
  );
}

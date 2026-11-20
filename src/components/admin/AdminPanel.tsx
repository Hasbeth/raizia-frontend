"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { STATUSES, STATUS_LABEL, type CategoryNode, type DocStatus, type DocumentSummary } from "@/lib/constants";
import { api, ApiError, errorMessage, jsonRequest, useAdminResource } from "./api";
import { CategoriesTab } from "./CategoriesTab";
import { ConfirmDialog } from "./ConfirmDialog";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentList, EmptyDocuments } from "./DocumentList";
import { StoragePanel } from "./StoragePanel";
import { UploadCard } from "./UploadCard";

type Library = { documents: DocumentSummary[]; stats: { approved: number; total: number; pending: number; chunks: number; categories: number }; facets: { entities: string[]; docTypes: string[] } };
const tabs = [{ id: "documents", label: "Documentos" }, { id: "categories", label: "Categorías" }] as const;
type Tab = (typeof tabs)[number]["id"];

export function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("documents");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [docType, setDocType] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<DocumentSummary | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => { const timer = setTimeout(() => setSearch(q.trim()), 300); return () => clearTimeout(timer); }, [q]);
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (status) query.set("status", status);
  if (categoryId) query.set("categoryId", categoryId);
  if (docType) query.set("docType", docType);
  const library = useAdminResource<Library>(`/api/admin/documents?${query}`, revision);
  const categoryResource = useAdminResource<{ categories: CategoryNode[] }>("/api/admin/categories", revision);
  const categories = categoryResource.data?.categories || [];
  const stats = library.data?.stats;
  const filtered = !!(q || status || categoryId || docType);
  const loading = library.loading || q.trim() !== search;
  const sessionExpired = (library.error instanceof ApiError && library.error.status === 401) || (categoryResource.error instanceof ApiError && categoryResource.error.status === 401);
  function resetFilters() { setQ(""); setSearch(""); setStatus(""); setCategoryId(""); setDocType(""); }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault(); setTab(tabs[next].id); tabRefs.current[next]?.focus();
  }
  async function logout() {
    setLoggingOut(true); setActionError("");
    try { await api("/api/admin/logout", { method: "POST" }); router.refresh(); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) router.refresh();
      else { setActionError(errorMessage(error)); setLoggingOut(false); }
    }
  }
  async function changeStatus(doc: DocumentSummary) {
    if (busyId !== null) return;
    setBusyId(doc.id); setActionError(""); setNotice("");
    try {
      await api(`/api/admin/documents/${doc.id}`, jsonRequest("PATCH", { status: doc.status === "aprobado" ? "revision" : "aprobado" }));
      setNotice(doc.status === "aprobado" ? "Documento retirado de la consulta pública. Quedó en revisión." : "Documento aprobado. Ya está disponible para consulta.");
      refresh();
    } catch (error) { setActionError(errorMessage(error)); }
    finally { setBusyId(null); }
  }
  return (
    <div className="container-page min-w-0 py-9 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0"><p className="eyebrow">Administración</p><h1 className="mt-3 font-display text-3xl leading-tight text-forest-900 sm:text-4xl">Biblioteca documental</h1><p className="mt-3 max-w-xl leading-relaxed text-muted">Un espacio para revisar las fuentes, organizar los temas y cuidar lo que compartimos.</p></div>
        <button className="btn btn-ghost" disabled={loggingOut} onClick={logout}><LogOut size={17} aria-hidden="true" />{loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</button>
      </header>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Resumen de la biblioteca">
        {[
          { label: "Aprobados", value: stats?.approved, hint: "Disponibles para consulta" },
          { label: "Pendientes de revisión", value: stats?.pending, hint: "Incluye borradores" },
          { label: "Total de documentos", value: stats?.total, hint: "Toda la biblioteca" },
          { label: "Fragmentos indexados", value: stats?.chunks, hint: "De documentos aprobados" },
        ].map((stat) => <div key={stat.label} className="card min-w-0 p-4 sm:p-5"><p className="text-sm leading-snug text-muted">{stat.label}</p>{stat.value === undefined ? <div className="skeleton my-3 h-9 w-14" aria-label="Cargando cifra" /> : <p className="mt-2 font-display text-3xl text-forest-900">{stat.value.toLocaleString("es-CO")}</p>}<p className="mt-2 text-xs leading-relaxed text-muted">{stat.hint}</p></div>)}
      </div>
      <StoragePanel revision={revision} onChanged={refresh} />
      <div aria-live="polite" className="mt-5 space-y-3">{notice && <p className="notice notice-info">{notice}</p>}{actionError && <p className="notice notice-error" role="alert">{actionError}</p>}{sessionExpired && <div className="notice notice-error flex-wrap"><p>Tu sesión terminó. Ingresa de nuevo para continuar.</p><button className="btn btn-secondary btn-sm" onClick={() => router.refresh()}>Volver a iniciar sesión</button></div>}</div>
      <div role="tablist" aria-label="Secciones de administración" className="mt-8 flex gap-2 border-b border-line">
        {tabs.map((item, index) => <button key={item.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => tabKey(event, index)} className={`border-b-2 px-5 py-4 text-sm font-semibold transition-colors ${tab === item.id ? "border-forest-700 text-forest-800" : "border-transparent text-muted hover:bg-forest-50"}`}>{item.label}</button>)}
      </div>
      <div role="tabpanel" id="panel-documents" aria-labelledby="tab-documents" hidden={tab !== "documents"} tabIndex={0} className="min-w-0 space-y-8 pt-7">
        <UploadCard categories={categories} onChanged={refresh} />
        <section aria-labelledby="documents-title" className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="documents-title" className="font-display text-2xl text-forest-900">Documentos de la biblioteca</h2><p className="text-sm text-muted" aria-live="polite">{loading ? "Buscando documentos…" : library.error ? "Listado no disponible" : `${library.data?.documents.length || 0} resultados`}</p></div>
          <div className="card space-y-4 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
              <div className="min-w-0"><label htmlFor="document-search" className="label">Buscar en la biblioteca</label><div className="relative"><Search size={18} className="pointer-events-none absolute top-3.5 left-3 text-muted" aria-hidden="true" /><input id="document-search" type="search" className="input pl-10" placeholder="Nombre, entidad, categoría o contenido" value={q} onChange={(event) => setQ(event.target.value)} /></div></div>
              <div className="min-w-0"><label htmlFor="category-filter" className="label">Categoría</label><select id="category-filter" className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categoryResource.loading}><option value="">Todas las categorías</option>{categories.flatMap((parent) => [<option key={parent.id} value={parent.id}>{parent.name}</option>, ...parent.children.map((child) => <option key={child.id} value={child.id}>— {child.name}</option>)])}</select></div>
              <div className="min-w-0"><label htmlFor="type-filter" className="label">Tipo de documento</label><select id="type-filter" className="input" value={docType} onChange={(event) => setDocType(event.target.value)}><option value="">Todos los tipos</option>{library.data?.facets.docTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
            </div>
            {categoryResource.error && <div className="notice notice-error flex-wrap" role="alert"><p>No pudimos cargar las categorías. {categoryResource.error.message}</p><button className="btn btn-secondary btn-sm" onClick={refresh}>Reintentar</button></div>}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
              {["", ...STATUSES].map((value) => <button key={value} type="button" aria-pressed={status === value} className={`btn btn-sm ${status === value ? "btn-primary" : "btn-ghost bg-sand/60"}`} onClick={() => setStatus(value as DocStatus | "")}>{value ? STATUS_LABEL[value as DocStatus] : "Todos"}{value === "" && stats ? ` (${stats.total})` : value === "aprobado" && stats ? ` (${stats.approved})` : ""}</button>)}
              {filtered && <button className="btn btn-ghost btn-sm sm:ml-auto" onClick={resetFilters}>Limpiar filtros</button>}
            </div>
          </div>
          {library.error ? <div className="notice notice-error flex-wrap" role="alert"><p className="min-w-0 flex-1">{library.error.message}</p><button className="btn btn-secondary btn-sm" onClick={refresh}>Reintentar</button></div>
            : loading ? <div role="status" className="space-y-3"><span className="sr-only">Cargando documentos…</span>{[1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div>
              : library.data?.documents.length ? <DocumentList documents={library.data.documents} busyId={busyId} onEdit={setEditing} onStatus={changeStatus} onDelete={setDeleting} />
                : <EmptyDocuments filtered={filtered} onReset={resetFilters} />}
        </section>
      </div>
      <div role="tabpanel" id="panel-categories" aria-labelledby="tab-categories" hidden={tab !== "categories"} tabIndex={0} className="pt-7"><CategoriesTab categories={categories} loading={categoryResource.loading && !categoryResource.data} error={categoryResource.error} onRetry={refresh} onChanged={refresh} /></div>
      {editing !== null && <DocumentEditor key={editing} id={editing} categories={categories} categoriesReady={!!categoryResource.data && !categoryResource.error} onClose={() => setEditing(null)} onChanged={refresh} onSaved={() => { setEditing(null); setNotice("Cambios guardados."); refresh(); }} />}
      {deleting && <ConfirmDialog title="Eliminar documento" description={`“${deleting.title}” se eliminará de forma permanente, junto con su archivo y el texto indexado. Esta acción no se puede deshacer.`} onClose={() => setDeleting(null)} onConfirm={async () => { await api(`/api/admin/documents/${deleting.id}`, { method: "DELETE" }); setNotice("Documento eliminado."); refresh(); }} />}
    </div>
  );
}

"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Category, CategoryNode } from "@/lib/constants";
import { api, errorMessage, jsonRequest } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";

function CategoryForm({ category, parentId, onCancel, onSaved }: {
  category?: Category; parentId?: number; onCancel: () => void; onSaved: (message: string) => void;
}) {
  const id = useId();
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [keywords, setKeywords] = useState(category?.keywords || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", jsonRequest(category ? "PATCH" : "POST", { name, description, keywords, ...(!category ? { parentId } : {}) }));
      onSaved(category ? "Categoría actualizada." : "Categoría creada.");
      onCancel();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="rounded-2xl border border-forest-200 bg-forest-50/50 p-4" aria-label={category ? `Editar ${category.name}` : parentId ? "Nueva subcategoría" : "Nueva categoría"} aria-busy={busy}>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <div><label className="label" htmlFor={`${id}-name`}>Nombre</label><input autoFocus id={`${id}-name`} className="input" required value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div><label className="label" htmlFor={`${id}-description`}>Descripción</label><textarea id={`${id}-description`} rows={2} className="input" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div><label className="label" htmlFor={`${id}-keywords`}>Palabras clave</label><input id={`${id}-keywords`} className="input" value={keywords} onChange={(event) => setKeywords(event.target.value)} aria-describedby={`${id}-hint`} placeholder="territorio, comunidad, consulta previa" /><p id={`${id}-hint`} className="hint">Sepáralas con comas. El asistente las usa para detectar los temas de una consulta.</p></div>
      </fieldset>
      <div aria-live="polite">{error && <p role="alert" className="notice notice-error mt-4">{error}</p>}</div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Guardando…" : category ? "Guardar categoría" : "Crear categoría"}</button><button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancelar</button></div>
    </form>
  );
}

function CategoryItem({ category, onSaved, onDelete }: { category: Category; onSaved: (message: string) => void; onDelete: (category: Category) => void }) {
  const [editing, setEditing] = useState(false);
  return editing ? <CategoryForm category={category} onCancel={() => setEditing(false)} onSaved={onSaved} /> : (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><h3 className={`${category.parentId ? "text-base font-semibold" : "font-display text-xl"} break-words text-forest-900`}>{category.name}</h3><p className="mt-1 text-xs text-muted">{category.docCount} {category.docCount === 1 ? "documento" : "documentos"}</p></div>
        <div className="flex flex-wrap gap-1"><button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} aria-label={`Editar categoría ${category.name}`}>Editar</button><button className="btn btn-danger btn-sm" onClick={() => onDelete(category)} aria-label={`Eliminar categoría ${category.name}`}>Eliminar</button></div>
      </div>
      {category.description && <p className="mt-3 break-words text-sm leading-relaxed text-muted">{category.description}</p>}
      {category.keywords && <p className="mt-2 break-words text-xs leading-relaxed text-soil"><span className="font-semibold">Palabras clave: </span>{category.keywords}</p>}
    </div>
  );
}

function CategoryCard({ category, onSaved, onDelete }: { category: CategoryNode; onSaved: (message: string) => void; onDelete: (category: Category) => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <article className="card min-w-0 p-5 sm:p-6">
      <CategoryItem category={category} onSaved={onSaved} onDelete={onDelete} />
      {category.children.length > 0 ? <ul className="mt-5 space-y-5 border-l-2 border-forest-100 pl-4">{category.children.map((child) => <li key={child.id}><CategoryItem category={child} onSaved={onSaved} onDelete={onDelete} /></li>)}</ul> : <p className="hint mt-5">Aún no tiene subcategorías.</p>}
      <div className="mt-5 border-t border-line pt-4">{adding ? <CategoryForm parentId={category.id} onCancel={() => setAdding(false)} onSaved={onSaved} /> : <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> Agregar subcategoría<span className="sr-only"> a {category.name}</span></button>}</div>
    </article>
  );
}

export function CategoriesTab({ categories, loading, error, onRetry, onChanged }: {
  categories: CategoryNode[]; loading: boolean; error: Error | null; onRetry: () => void; onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [notice, setNotice] = useState("");
  function saved(message: string) { setNotice(message); onChanged(); }
  return (
    <section aria-labelledby="categories-title" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 id="categories-title" className="font-display text-2xl text-forest-900">Un lugar para cada tema</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Organiza la biblioteca en categorías y subcategorías. Sus palabras clave ayudan al asistente a reconocer los temas.</p></div>
        <button className="btn btn-primary" onClick={() => setAdding(true)} disabled={adding}><Plus size={17} aria-hidden="true" /> Agregar categoría</button>
      </div>
      <div aria-live="polite">{notice && <p className="notice notice-info">{notice}</p>}</div>
      {adding && <div className="max-w-xl"><CategoryForm onCancel={() => setAdding(false)} onSaved={saved} /></div>}
      {error ? <div className="notice notice-error flex-wrap" role="alert"><p className="min-w-0 flex-1">{error.message}</p><button className="btn btn-secondary btn-sm" onClick={onRetry}>Reintentar</button></div>
        : loading ? <div role="status"><p className="sr-only">Cargando categorías…</p><div className="grid gap-5 lg:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-48" />)}</div></div>
          : !categories.length ? <div className="card p-8 text-center"><h3 className="font-display text-2xl text-forest-900">Empecemos por los temas</h3><p className="mt-3 text-muted">Crea tu primera categoría para organizar los documentos.</p></div>
            : <div className="grid items-start gap-5 lg:grid-cols-2">{categories.map((category) => <CategoryCard key={category.id} category={category} onSaved={saved} onDelete={setDeleting} />)}</div>}
      {deleting && <ConfirmDialog title="Eliminar categoría" description={`Se eliminará “${deleting.name}”${deleting.parentId === null ? " y sus subcategorías" : ""} de forma permanente. Los documentos se conservan; solo se retira esta clasificación.`} onClose={() => setDeleting(null)} onConfirm={async () => { await api(`/api/admin/categories/${deleting.id}`, { method: "DELETE" }); saved("Categoría eliminada. Los documentos se conservaron."); }} />}
    </section>
  );
}

"use client";

import { FileText } from "lucide-react";
import { STATUS_LABEL, formatBytes, formatDate, type DocumentSummary } from "@/lib/constants";

type Props = { documents: DocumentSummary[]; busyId: number | null; onEdit: (id: number) => void; onStatus: (doc: DocumentSummary) => void; onDelete: (doc: DocumentSummary) => void };

function Status({ document }: { document: DocumentSummary }) {
  return <span className={`chip ${document.status === "revision" ? "chip-ochre" : document.status === "borrador" ? "chip-neutral" : ""}`}>{STATUS_LABEL[document.status]}</span>;
}

function Categories({ document }: { document: DocumentSummary }) {
  return document.categories.length ? <div className="flex flex-wrap gap-1.5">{document.categories.map((category) => <span className="chip chip-neutral max-w-full break-words" key={category.id}>{category.name}</span>)}</div> : <span className="text-xs text-muted">Sin categoría</span>;
}

function Actions({ document, busyId, onEdit, onStatus, onDelete }: Omit<Props, "documents"> & { document: DocumentSummary }) {
  const busy = busyId === document.id;
  return <div className="flex flex-wrap gap-1.5" aria-label={`Acciones de ${document.title}`}>
    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onEdit(document.id)} aria-label={`Revisar o editar ${document.title}`}>Revisar/Editar</button>
    <button className="btn btn-ghost btn-sm" disabled={busyId !== null || (document.status !== "aprobado" && document.chunkCount === 0)} title={document.status !== "aprobado" && !document.chunkCount ? "Primero se necesita texto indexado" : undefined} onClick={() => onStatus(document)} aria-label={`${document.status === "aprobado" ? "Retirar aprobación de" : "Aprobar"} ${document.title}`}>{busy ? "Actualizando…" : document.status === "aprobado" ? "Retirar" : "Aprobar"}</button>
    <a href={`/api/documents/${document.id}/file`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" aria-label={`Ver original de ${document.title} (abre otra pestaña)`}>Ver original</a>
    <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onDelete(document)} aria-label={`Eliminar ${document.title}`}>Eliminar</button>
  </div>;
}

export function DocumentList(props: Props) {
  return <>
    <div className="card hidden overflow-hidden md:block">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Documentos de la biblioteca y acciones de administración</caption>
        <thead className="border-b border-line bg-sand/50 text-xs text-muted"><tr><th scope="col" className="w-[34%] p-4 font-semibold">Documento</th><th scope="col" className="w-[17%] p-3 font-semibold">Categorías</th><th scope="col" className="w-[19%] p-3 font-semibold">Estado y archivo</th><th scope="col" className="w-[30%] p-4 font-semibold">Acciones</th></tr></thead>
        <tbody className="divide-y divide-line">{props.documents.map((document) => <tr key={document.id} className="align-top hover:bg-ivory/70">
          <th scope="row" className="p-4 font-normal"><p className="break-words font-semibold leading-relaxed text-forest-900">{document.title}</p><p className="mt-2 break-words text-xs leading-relaxed text-muted">{document.entity || "Entidad sin registrar"}</p><p className="mt-1 break-words text-xs text-muted">{document.docType || "Tipo sin registrar"}{document.docDate ? ` · ${formatDate(document.docDate)}` : ""}</p></th>
          <td className="p-3 pt-4"><Categories document={document} /></td>
          <td className="p-3 pt-4"><Status document={document} /><p className="mt-3 text-xs text-muted">{formatBytes(document.fileSize)}</p><p className="mt-1 text-xs text-muted">{document.chunkCount} fragmentos</p></td>
          <td className="p-4"><Actions {...props} document={document} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="space-y-4 md:hidden">{props.documents.map((document) => <li key={document.id} className="card min-w-0 p-5">
      <Status document={document} /><h3 className="mt-3 break-words font-display text-xl leading-snug text-forest-900">{document.title}</h3>
      <p className="mt-2 break-words text-sm text-muted">{document.entity || "Entidad sin registrar"}</p><p className="mt-1 break-words text-xs text-muted">{document.docType || "Tipo sin registrar"}{document.docDate ? ` · ${formatDate(document.docDate)}` : ""}</p>
      <div className="mt-4"><Categories document={document} /></div><p className="mt-3 text-xs text-muted">{formatBytes(document.fileSize)} · {document.chunkCount} fragmentos</p>
      <div className="mt-4 border-t border-line pt-4"><Actions {...props} document={document} /></div>
    </li>)}</ul>
  </>;
}

export function EmptyDocuments({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return <div className="card px-6 py-12 text-center"><FileText size={32} className="mx-auto text-forest-500" aria-hidden="true" /><h3 className="mt-5 font-display text-2xl text-forest-900">{filtered ? "No encontramos coincidencias" : "La biblioteca empieza aquí"}</h3><p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">{filtered ? "Prueba con otras palabras o cambia los filtros para ver más documentos." : "Carga un PDF o DOCX, o importa un documento oficial. Después podrás revisarlo y aprobarlo."}</p>{filtered && <button className="btn btn-secondary mt-5" onClick={onReset}>Limpiar filtros</button>}</div>;
}

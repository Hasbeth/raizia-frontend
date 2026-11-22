"use client";

import { optionLabel, type Field, type ToolData } from "@/lib/tools-config";

/** Controles compartidos por las pantallas agrupadas y los detalles de tutela. */
export function ToolFields({ fields, data, onChange, disabled = false }: { fields: Field[]; data: ToolData; onChange: (name: string, value: string) => void; disabled?: boolean }) {
  return <div className="space-y-4">{fields.map(field => {
    const id = `dato-${field.name}`;
    const value = String(data[field.name] || "");
    if (field.name === "calidad") return <fieldset key={field.name} disabled={disabled}><legend className="label">¿Para quién es?</legend><div className="flex flex-wrap gap-2">{field.options!.map(option => <button key={option} type="button" aria-pressed={value === option || (option === "En representación de otra persona" && /agente|apoderado/.test(value))} className={`btn ${value === option || (option === "En representación de otra persona" && /agente|apoderado/.test(value)) ? "btn-primary" : "btn-secondary"}`} onClick={() => onChange(field.name, option)}>{optionLabel(field.name, option)}</button>)}</div></fieldset>;
    return <div key={field.name}><label htmlFor={id} className="label">{field.label}</label>
      {field.type === "select" ? <select id={id} className="input" value={value} disabled={disabled} onChange={e => onChange(field.name, e.target.value)}><option value="">Elige una opción</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select>
        : field.type === "textarea" ? <textarea id={id} className="input min-h-28" rows={3} maxLength={8000} value={value} disabled={disabled} onChange={e => onChange(field.name, e.target.value)} />
          : <input id={id} className="input" type={field.type === "email" || field.type === "tel" ? field.type : "text"} maxLength={8000} value={value} disabled={disabled} onChange={e => onChange(field.name, e.target.value)} />}
      {field.hint && <p className="mt-1 text-sm text-muted">{field.hint}</p>}
    </div>;
  })}</div>;
}

import { useId } from "react";
import type { CategoryNode } from "@/lib/constants";

export function CategoryPicker({ categories, selected, onChange, disabled = false }: {
  categories: CategoryNode[]; selected: number[]; onChange: (ids: number[]) => void; disabled?: boolean;
}) {
  const hintId = useId();
  return (
    <fieldset disabled={disabled} aria-describedby={hintId} className="min-w-0">
      <legend className="label">Categorías</legend>
      <p id={hintId} className="hint mb-3">Puedes seleccionar varias categorías y subcategorías.</p>
      {!categories.length ? <p className="text-sm text-muted">Todavía no hay categorías disponibles.</p> : (
        <ul className="max-h-60 space-y-2 overflow-y-auto rounded-xl border border-line p-3">
          {categories.map((parent) => (
            <li key={parent.id}>
              {[parent, ...parent.children].map((category) => (
                <label key={category.id} className={`flex min-h-10 cursor-pointer items-start gap-3 rounded-lg py-2 pr-2 text-sm hover:bg-forest-50 ${category.parentId ? "ml-5 pl-3" : "pl-2 font-semibold"}`}>
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-forest-700" checked={selected.includes(category.id)}
                    onChange={(event) => onChange(event.target.checked ? [...selected, category.id] : selected.filter((id) => id !== category.id))} />
                  <span className="min-w-0 break-words">{category.name}</span>
                </label>
              ))}
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

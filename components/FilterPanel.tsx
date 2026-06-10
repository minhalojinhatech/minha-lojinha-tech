import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export type CatalogFilters = {
  brands: string[];
  conditions: string[];
  storage: string[];
  badges: string[];
  minPrice: string;
  maxPrice: string;
};

type FilterGroupKey = "brands" | "conditions" | "storage" | "badges";

const filterGroups: Array<{ key: FilterGroupKey; title: string; options: string[] }> = [
  { key: "brands", title: "Marca", options: ["Apple", "Samsung", "Xiaomi", "Motorola"] },
  { key: "conditions", title: "Condição", options: ["Novo", "Seminovo", "Usado"] },
  { key: "storage", title: "Armazenamento", options: ["64GB", "128GB", "256GB", "512GB"] },
  { key: "badges", title: "Disponibilidade", options: ["Pronta entrega", "Garantia", "Revisado", "Oferta"] }
];

type FilterPanelProps = {
  filters: CatalogFilters;
  activeCount: number;
  onToggle: (key: FilterGroupKey, value: string) => void;
  onPriceChange: (key: "minPrice" | "maxPrice", value: string) => void;
  onClear: () => void;
};

export const emptyCatalogFilters: CatalogFilters = {
  brands: [],
  conditions: [],
  storage: [],
  badges: [],
  minPrice: "",
  maxPrice: ""
};

export function FilterPanel({ filters, activeCount, onToggle, onPriceChange, onClear }: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="catalog-filters">
      <div className="catalog-filters__bar">
        <div className="flex items-center gap-3">
          <span className="catalog-filters__icon">
            <SlidersHorizontal size={18} />
          </span>
          <div>
            <h2>Refinar resultados</h2>
            <p className="text-sm text-gray-500">
              {activeCount > 0 ? `${activeCount} filtro${activeCount > 1 ? "s" : ""} ativo${activeCount > 1 ? "s" : ""}` : "Refine a busca quando precisar"}
            </p>
          </div>
        </div>
        <div className="catalog-filters__actions">
          <button
            disabled={activeCount === 0}
            onClick={onClear}
            type="button"
          >
            Limpar filtros
          </button>
          <button
            onClick={() => setOpen((current) => !current)}
            type="button"
            aria-expanded={open}
          >
            {open ? "Fechar" : "Abrir filtros"}
          </button>
        </div>
      </div>

      <div className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0">
          <div className="catalog-filters__grid">
            {filterGroups.map((group) => (
              <fieldset key={group.title}>
                <legend>{group.title}</legend>
                <div>
                  {group.options.map((option) => (
                    <label key={option}>
                      <input
                        checked={filters[group.key].includes(option)}
                        className="size-4 accent-ink"
                        onChange={() => onToggle(group.key, option)}
                        type="checkbox"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset>
              <legend>Faixa de preço</legend>
              <div className="catalog-filters__price">
                <input
                  inputMode="numeric"
                  onChange={(event) => onPriceChange("minPrice", event.target.value)}
                  placeholder="Min."
                  value={filters.minPrice}
                />
                <input
                  inputMode="numeric"
                  onChange={(event) => onPriceChange("maxPrice", event.target.value)}
                  placeholder="Max."
                  value={filters.maxPrice}
                />
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  );
}

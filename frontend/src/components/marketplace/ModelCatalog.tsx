import React, { useMemo, useState } from "react";
import { Search, Filter, Database } from "lucide-react";
import { useFLModels } from "@/hooks/useMarketplace";
import { ModelCard } from "./ModelCard";

const FILTERS = [
  "All",
  "Chest X-ray",
  "Chest CT Scan",
  "Cardiac MRI",
  "Dermatoscopy",
  "Breast Ultrasound",
  "Retinal Fundus",
  "Blood Microscopy",
  "Abdominal CT",
] as const;

export function ModelCatalog({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const { models, isLoading } = useFLModels();

  const visible = useMemo(() => {
    return models.filter((m) => {
      const matchesFilter = filter === "All" || m.modality === filter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        m.modality.toLowerCase().includes(q) ||
        m.task.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [models, query, filter]);

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by model, modality, or disease…"
            className="h-11 w-full rounded-2xl border border-border/80 bg-card/80 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline-flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                filter === f
                  ? "bg-primary text-white shadow-primary/25"
                  : "border border-border/80 bg-card/80 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-border/60 bg-card/40 p-6 animate-pulse space-y-4">
              <div className="h-6 w-24 rounded-full bg-muted" />
              <div className="h-6 w-3/4 rounded-lg bg-muted" />
              <div className="h-12 w-full rounded-lg bg-muted/60" />
              <div className="h-8 w-1/2 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/50 p-12 text-center">
          <Database className="h-10 w-10 text-primary/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {models.length === 0 ? "No Federated Models Currently Active" : "No Matching Models Found"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md">
            {models.length === 0
              ? "The centralized federated network has no active clinical model tasks published in the database. New models are registered and deployed by backend administrators."
              : `No models match "${query}". Try adjusting your search query or modality filter.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((m) => (
            <ModelCard key={m.id} model={m} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ModelCatalog;

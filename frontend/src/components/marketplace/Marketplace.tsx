import React, { useState } from "react";
import { useFLModel } from "@/hooks/useMarketplace";
import { ModelCatalog } from "./ModelCatalog";
import { ModelOverview } from "./ModelOverview";

export function Marketplace() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useFLModel(selectedId || "");

  return (
    <div className="w-full space-y-6">
      {selected ? (
        <ModelOverview model={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <ModelCatalog onOpen={setSelectedId} />
      )}
    </div>
  );
}

export default Marketplace;

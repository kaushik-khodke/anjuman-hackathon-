import { useSyncExternalStore, useMemo } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type ModelRuntimeState,
} from "@/lib/marketplace-store";
import type { FLModel } from "@/lib/fl-service";

export {
  trainModel,
  toggleAttack,
  toggleDomainShift,
  resetModel,
} from "@/lib/marketplace-store";

/** Subscribe to the whole marketplace store */
export function useFLStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Subscribe to all models list */
export function useFLModels(): { models: FLModel[]; isLoading: boolean } {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    models: store.models,
    isLoading: store.isLoading,
  };
}

/** Subscribe to a single model definition */
export function useFLModel(modelId: string): FLModel | undefined {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => store.models.find((m) => m.id === modelId), [store.models, modelId]);
}

/** Subscribe to all models runtime telemetry */
export function useMarketplace(): Record<string, ModelRuntimeState> {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return store.runtime;
}

/** Subscribe to a single model's live runtime state */
export function useModelState(modelId: string): ModelRuntimeState | undefined {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return store.runtime[modelId];
}

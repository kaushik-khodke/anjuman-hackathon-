import React, { useState } from "react";
import { Network, Scan, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Marketplace } from "@/components/marketplace/Marketplace";
import { useFLStore, useFLModels } from "@/hooks/useMarketplace";
import { ScanDiagnosticModal } from "@/components/features/ScanDiagnosticModal";

export function FederatedImaging() {
  const { models, isLoading } = useFLModels();
  const store = useFLStore();
  const [showScanDiagnostic, setShowScanDiagnostic] = useState(false);

  // Dynamic values calculated from real data
  const modelsCount = models?.length || 0;

  // Calculate unique participating sites from store
  const uniqueSiteIds = new Set<string>();
  if (store?.runtime) {
    Object.values(store.runtime).forEach((rt) => {
      rt.sites?.forEach((s) => {
        if (s.id) uniqueSiteIds.add(s.id);
      });
    });
  }
  const sitesCount = uniqueSiteIds.size;

  // Max epsilon across real registered models
  const maxEpsilon =
    models && models.length > 0
      ? Math.max(...models.map((m) => m.epsilon_max || 0.0))
      : 0.0;

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* 1 Single Minimized Header Card */}
      <div className="glass-card rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-5 md:p-6 backdrop-blur-xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Network className="w-48 h-48 text-primary" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Badges, Title & Concise Bullets */}
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                H-03 Federated AI Network
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ZERO-RAW-IMAGE INVARIANT ACTIVE
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground font-heading">
              Federated Clinical Intelligence Network & Model Catalog
            </h2>

            {/* Bullets */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>
                  <strong className="text-foreground">Privacy-Preserving:</strong> Local DP-SGD (ε ≤ {maxEpsilon.toFixed(1)}) with 0 raw scans transferred
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong className="text-foreground">Scanner Harmonization:</strong> FedBN normalization & Byzantine fault tolerance
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>
                  <strong className="text-foreground">Collaborative Training:</strong> Pool clinical intelligence across {sitesCount} active sites
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>
                  <strong className="text-foreground">Cryptographic Provenance:</strong> SHA-256 parent-child audit lineage proof
                </span>
              </li>
            </ul>

            {/* Quick Diagnostic Action Button for Hospital Clinicians */}
            <div className="pt-2">
              <Button
                onClick={() => setShowScanDiagnostic(true)}
                className="rounded-2xl gradient-primary text-xs font-bold gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
              >
                <Scan className="w-4 h-4" />
                <span>Run Clinical Scan Diagnostics</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  Live IPFS Models
                </span>
              </Button>
            </div>
          </div>

          {/* Right: 4 Metric Pills in 2x2 Grid (Calibrated Compact Size) */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full lg:w-auto">
            <div className="rounded-xl border border-border/80 bg-white/95 dark:bg-card/95 p-2.5 sm:p-3 text-center shadow-sm min-w-[110px]">
              <div className="text-lg sm:text-xl font-black text-foreground font-mono">
                {isLoading ? "..." : `${sitesCount} Sites`}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Federation
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-white/95 dark:bg-card/95 p-2.5 sm:p-3 text-center shadow-sm min-w-[110px]">
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {isLoading ? "..." : `${modelsCount} Models`}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Active Catalog
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-white/95 dark:bg-card/95 p-2.5 sm:p-3 text-center shadow-sm min-w-[110px]">
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                0 Scans
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Raw Shared
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-white/95 dark:bg-card/95 p-2.5 sm:p-3 text-center shadow-sm min-w-[110px]">
              <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {isLoading ? "..." : `ε ≤ ${maxEpsilon.toFixed(1)}`}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Privacy Bound
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Marketplace */}
      <Marketplace />

      {/* Hospital AI Scan Diagnostic Modal */}
      <ScanDiagnosticModal
        open={showScanDiagnostic}
        onClose={() => setShowScanDiagnostic(false)}
        isHospitalContext={true}
      />
    </div>
  );
}

export default FederatedImaging;

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Receipt,
  ShieldCheck,
  Building,
  DollarSign,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  Tag,
  Loader2,
  Sparkles,
  QrCode,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface ChargeItem {
  id?: string;
  service_code: string;
  service_category: string;
  service_name: string;
  standard_price: number;
}

interface LedgerEntry {
  id: string;
  entry_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  posted_at: string;
}

interface Claim {
  id: string;
  uhid: string;
  patient_name: string;
  payer_name: string;
  tpa_name?: string;
  policy_number: string;
  claimed_amount: number;
  approved_amount: number;
  claim_status: string;
}

export function RCMBillingManagement() {
  const [activeSubTab, setActiveSubTab] = useState<"INVOICING" | "CHARGE_MASTER" | "INSURANCE" | "POS">("INVOICING");

  // Charge Master State
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [subtotal, setSubtotal] = useState(4520.0);
  const [tax, setTax] = useState(226.0);
  const [grandTotal, setGrandTotal] = useState(4746.0);
  const [claims, setClaims] = useState<Claim[]>([]);

  // POS State
  const [payAmount, setPayAmount] = useState(4746.0);
  const [payMethod, setPayMethod] = useState<"CASH" | "CARD" | "UPI" | "INSURANCE_SETTLEMENT">("UPI");
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  // Patient Lookup
  const [patientUhid, setPatientUhid] = useState("UHID-2026-0012");
  const [patientName, setPatientName] = useState("Alice Smith");

  useEffect(() => {
    fetchChargeMaster();
    fetchLedger();
    fetchClaims();
  }, []);

  async function fetchChargeMaster() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/rcm/charge-master`);
      if (res.ok) {
        const data = await res.json();
        setCharges(data.items || []);
      }
    } catch (e) {
      console.error("Charge master error:", e);
    }
  }

  async function fetchLedger() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/rcm/ledger/${patientUhid}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerEntries(data.entries || []);
        setSubtotal(data.subtotal || 0);
        setTax(data.tax || 0);
        setGrandTotal(data.grand_total || 0);
        setPayAmount(data.grand_total || 0);
      }
    } catch (e) {
      console.error("Ledger error:", e);
    }
  }

  async function fetchClaims() {
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/rcm/claims`);
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (e) {
      console.error("Claims error:", e);
    }
  }

  async function handleProcessPayment() {
    setIsProcessingPay(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hms/diagnostics-rcm/rcm/payments/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: "p1",
          uhid: patientUhid,
          patient_name: patientName,
          amount: payAmount,
          payment_method: payMethod,
          payment_type: "FINAL_BILL_PAYMENT",
          cashier_name: "Lead Cashier R. Sharma",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReceipt(data.payment);
        fetchLedger();
      }
    } catch (e) {
      console.error("Payment failed:", e);
    } finally {
      setIsProcessingPay(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl border border-border/80 bg-white/90 dark:bg-card/90 p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground font-heading">
                Revenue Cycle Management (RCM) &amp; Financial Ledger
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Consolidated inpatient invoicing, central charge master tariffs, insurance TPA claims, and cashier POS
              </p>
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-muted/40 p-1.5 border border-border/60 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab("INVOICING")}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                activeSubTab === "INVOICING"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📄 Discharge Invoice
            </button>
            <button
              onClick={() => setActiveSubTab("CHARGE_MASTER")}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                activeSubTab === "CHARGE_MASTER"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🏷️ Charge Master
            </button>
            <button
              onClick={() => setActiveSubTab("INSURANCE")}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                activeSubTab === "INSURANCE"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🛡️ Insurance &amp; TPA
            </button>
            <button
              onClick={() => setActiveSubTab("POS")}
              className={`rounded-xl px-3 py-1.5 transition-all ${
                activeSubTab === "POS"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💳 Cashier POS
            </button>
          </div>
        </div>

        {/* 1. Inpatient Consolidated Tax Invoice View */}
        {activeSubTab === "INVOICING" && (
          <div className="pt-5 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-muted/20 text-xs">
              <div>
                <div className="text-sm font-bold text-foreground">Inpatient Running Billing Ledger</div>
                <div className="text-muted-foreground font-mono mt-0.5">
                  Patient: <strong className="text-foreground">{patientName}</strong> · Master UHID: <strong className="text-foreground">{patientUhid}</strong> · Admission ID: <strong className="text-foreground">IPD-2026-0819</strong>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground shadow-sm"
              >
                <Printer className="w-4 h-4 text-primary" /> Print Itemized Tax Invoice
              </button>
            </div>

            {/* Itemized Table */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] bg-muted/10">
                    <th className="py-3 px-4">Service Category</th>
                    <th className="py-3 px-4">Description of Service / Medication</th>
                    <th className="py-3 px-4 text-center">Qty / Days</th>
                    <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ledgerEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary">{e.entry_type}</td>
                      <td className="py-3.5 px-4 font-sans font-medium text-foreground">{e.description}</td>
                      <td className="py-3.5 px-4 text-center font-bold">{e.quantity}</td>
                      <td className="py-3.5 px-4 text-right text-muted-foreground">₹{e.unit_price.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">₹{e.total_amount.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            e.status === "settled"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {e.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Footer */}
              <div className="p-5 bg-muted/30 border-t border-border/60 flex justify-end text-xs font-mono">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Dues:</span>
                    <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Hospital GST (5%):</span>
                    <span className="font-bold text-foreground">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/60 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-foreground">Grand Total Dues:</span>
                    <span className="text-primary text-base">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Central Charge Master Catalog */}
        {activeSubTab === "CHARGE_MASTER" && (
          <div className="pt-5 space-y-4">
            <div className="text-xs text-muted-foreground font-mono">
              Central standard pricing registry for hospital bed tariffs, CPOE diagnostics, and clinical fees.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {charges.map((c) => (
                <div
                  key={c.service_code}
                  className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {c.service_code}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                      {c.service_category}
                    </span>
                  </div>
                  <div className="font-bold text-foreground text-sm font-sans">{c.service_name}</div>
                  <div className="text-lg font-black font-mono text-primary pt-1">
                    ₹{c.standard_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Insurance & TPA Claims Tracker */}
        {activeSubTab === "INSURANCE" && (
          <div className="pt-5 space-y-4">
            <div className="text-xs text-muted-foreground font-mono">
              Cashless hospital pre-authorizations and standardized TPA claim packet submission trackers.
            </div>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] bg-muted/10">
                    <th className="py-3 px-4">Patient &amp; UHID</th>
                    <th className="py-3 px-4">Insurance Payer / TPA</th>
                    <th className="py-3 px-4">Policy #</th>
                    <th className="py-3 px-4 text-right">Claimed (₹)</th>
                    <th className="py-3 px-4 text-right">Approved (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {claims.map((cl) => (
                    <tr key={cl.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                        {cl.patient_name} <span className="font-mono text-xs text-muted-foreground block">{cl.uhid}</span>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-medium text-foreground">
                        {cl.payer_name} <span className="text-xs text-muted-foreground block">{cl.tpa_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{cl.policy_number}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">₹{cl.claimed_amount.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{cl.approved_amount.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {cl.claim_status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Front-Desk Cashier POS */}
        {activeSubTab === "POS" && (
          <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Collection Form */}
            <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-4 text-xs">
              <div className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
                <CreditCard className="w-4 h-4 text-primary" /> Front-Desk Settlement Terminal
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Patient UHID &amp; Name</label>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 font-mono font-bold text-foreground">
                  {patientName} ({patientUhid})
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">Amount to Collect (₹)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono font-bold text-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">Payment Instrument</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["UPI", "CARD", "CASH", "INSURANCE_SETTLEMENT"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-[11px] font-mono transition-all ${
                        payMethod === m
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {m.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={isProcessingPay}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 mt-2"
              >
                {isProcessingPay ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Collect ₹{payAmount.toFixed(2)} &amp; Generate Tax Receipt
              </button>
            </div>

            {/* Generated Receipt Voucher */}
            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Official Payment Voucher
                </div>
                <span className="text-[10px] text-muted-foreground">MyHealthChain HIS</span>
              </div>

              {receipt ? (
                <div className="space-y-2.5 animate-fadeIn">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt Number:</span>
                    <strong className="text-foreground">{receipt.receipt_number}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Txn Reference:</span>
                    <strong className="text-foreground">{receipt.transaction_ref}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient UHID:</span>
                    <strong className="text-foreground">{receipt.uhid}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <strong className="text-primary">{receipt.payment_method}</strong>
                  </div>
                  <div className="border-t border-emerald-500/20 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-foreground">Amount Paid:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{receipt.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center pt-2">
                    Authorized Signatory: {receipt.cashier_name}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Processed payment vouchers and digital tax receipts will display here upon settlement.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RCMBillingManagement;

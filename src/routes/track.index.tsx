import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, ArrowRight, ShieldCheck, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/track/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  component: TrackIndexPage,
});

function TrackIndexPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [orderNo, setOrderNo] = useState(search?.token ?? "");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (search?.token && /^\d{6}$/.test(search.token.trim())) {
      nav({
        to: "/track/$orderNo",
        params: { orderNo: search.token.trim() },
        search: { token: search.token.trim() },
      });
    }
  }, [search?.token, nav]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOrder = orderNo.trim().toUpperCase();
    if (!cleanOrder) {
      toast.error("Please enter your 6-digit Tracking Token or Order Number");
      return;
    }
    const cleanPhone = phone.replace(/\D+/g, "");

    // If 6-digit numeric token, route directly with token
    if (/^\d{6}$/.test(cleanOrder)) {
      nav({
        to: "/track/$orderNo",
        params: { orderNo: cleanOrder },
        search: { token: cleanOrder },
      });
      return;
    }

    nav({
      to: "/track/$orderNo",
      params: { orderNo: cleanOrder },
      search: cleanPhone ? { phone: cleanPhone } : {},
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto shadow-md">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Stone Tech Order & Ledger Tracking</h1>
          <p className="text-xs text-muted-foreground">
            Live stone fabrication status, delivery challans, and permanent ledger access
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Customer Portal
            </div>
            <CardTitle className="text-lg">Track Order / Access Records</CardTitle>
            <CardDescription>
              Enter the 6-Digit Tracking Token sent to your WhatsApp upon quotation approval, or
              your Order Reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  6-Digit Tracking Token or Order Number
                </label>
                <Input
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="e.g. 749201 or SO-2026-0042"
                  className="font-mono text-sm uppercase"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Registered Mobile Number (Optional if using 6-Digit Token)
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="font-mono text-sm"
                />
              </div>

              <Button type="submit" disabled={!orderNo.trim()} className="w-full font-medium">
                Track Status &amp; Access Documents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" /> Lifetime Document Access
          </div>
          <p>
            Even after your project is completed, your 6-digit token remains active. You can revisit
            this tracker anytime to view and download your Delivery Challans and Customer Ledger
            statements.
          </p>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Stone Tech OS · Engineered for Natural Stone Precision
        </div>
      </div>
    </div>
  );
}

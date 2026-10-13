import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/track/")({
  ssr: false,
  component: TrackIndexPage,
});

function TrackIndexPage() {
  const nav = useNavigate();
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOrder = orderNo.trim().toUpperCase();
    if (!cleanOrder) {
      toast.error("Please enter your Order Reference or Tracking ID");
      return;
    }
    const cleanPhone = phone.replace(/\D+/g, "");

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
          <h1 className="text-2xl font-bold tracking-tight">Stone Tech Order Tracking</h1>
          <p className="text-xs text-muted-foreground">
            Live stone fabrication, quality inspection, and dispatch status
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Public Tracker
            </div>
            <CardTitle className="text-lg">Track Your Order</CardTitle>
            <CardDescription>
              Enter the Order Number or Tracking ID from your confirmation message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Order Number / Tracking ID
                </label>
                <Input
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="e.g. SO-2026-0042"
                  className="font-mono text-sm uppercase"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Registered Mobile Number (Optional)
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
                Track Order Status
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Stone Tech OS · Engineered for Natural Stone Precision
        </div>
      </div>
    </div>
  );
}

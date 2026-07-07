/** Customer sign-off dialog. Signature is captured via SignaturePad or uploaded photo. */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCheck, Loader2, Star } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { createSignoff } from "@/lib/installation/signoff";
import { invalidateInstallation } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function SignoffDialog({ installationId, disabled }: { installationId: string; disabled?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      createSignoff({
        installation_id: installationId,
        customer_name: customer || null,
        customer_rating: rating ?? null,
        remarks: remarks || null,
        signature_data_url: signature,
      }),
    onSuccess: () => {
      toast.success("Installation signed off");
      invalidateInstallation(qc, installationId);
      setOpen(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}><CheckCheck className="mr-1 h-4 w-4" /> Customer sign-off</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete installation & capture sign-off</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Customer name</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Customer rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  className={cn("rounded p-1 hover:bg-accent", rating != null && n <= rating ? "text-primary" : "text-muted-foreground")}
                  aria-label={`Rate ${n}`}
                >
                  <Star className={cn("h-6 w-6", rating != null && n <= rating && "fill-current")} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Remarks</Label>
            <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Signature</Label>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

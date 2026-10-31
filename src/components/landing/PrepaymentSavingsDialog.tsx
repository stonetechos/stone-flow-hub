import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrepaymentOfferCard } from "@/components/landing/PrepaymentOfferCard";

interface PrepaymentSavingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDiscount: () => void;
}

export function PrepaymentSavingsDialog({
  open,
  onOpenChange,
  onApplyDiscount,
}: PrepaymentSavingsDialogProps) {
  const handleApply = () => {
    onApplyDiscount();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-emerald-500/30">
        <DialogHeader className="sr-only">
          <DialogTitle>100% Prepayment Savings Calculator</DialogTitle>
        </DialogHeader>
        <PrepaymentOfferCard onApplyDiscount={handleApply} className="border-0 shadow-none" />
      </DialogContent>
    </Dialog>
  );
}

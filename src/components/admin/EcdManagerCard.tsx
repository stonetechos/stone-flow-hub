import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FolderLock,
  Mail,
  Cloud,
  FileCode,
  HardDrive,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getEcdStatusServerFn,
  executeEcdServerFn,
  listEcdCloudBackupsServerFn,
  restoreEcdServerFn,
  type EcdStatusResponse,
} from "@/lib/admin/ecd.functions";
import { setEcdScrubbedState } from "@/lib/nav/preferences";

export function EcdManagerCard() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [uploadedFileText, setUploadedFileText] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [selectedCloudBackup, setSelectedCloudBackup] = useState<string | null>(null);

  // 1. Fetch ECD Status
  const statusQuery = useQuery({
    queryKey: ["admin", "ecd", "status"],
    queryFn: async () => {
      const res = await getEcdStatusServerFn();
      if (res.isScrubbed) {
        setEcdScrubbedState(true);
      } else {
        setEcdScrubbedState(false);
      }
      return res;
    },
  });

  // 2. Fetch Cloud Backups
  const cloudBackupsQuery = useQuery({
    queryKey: ["admin", "ecd", "cloud-backups"],
    queryFn: () => listEcdCloudBackupsServerFn(),
  });

  // 3. Execute ECD Mutation
  const executeEcdMutation = useMutation({
    mutationFn: async (token: string) => {
      return executeEcdServerFn({ data: { confirmationToken: token } });
    },
    onSuccess: (data) => {
      setEcdScrubbedState(true);
      setConfirmOpen(false);
      setConfirmInput("");
      void qc.invalidateQueries();

      // Trigger automatic client-side file download with Male-Female Socket name
      try {
        const blob = new Blob([data.encryptedRaw], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (dlErr) {
        console.warn("[ecd] Download trigger error:", dlErr);
      }

      toast.success(
        `ECD Execution Complete: ${data.manifest.cashbookCount} cash entries scrubbed. Encrypted archive downloaded and sent to info@stonetech.in.`,
        { duration: 6000 },
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "ECD execution failed");
    },
  });

  // 4. Restore ECD Mutation
  const restoreEcdMutation = useMutation({
    mutationFn: async (payload: { rawEnvelopeString?: string; storagePath?: string }) => {
      return restoreEcdServerFn({ data: payload });
    },
    onSuccess: (data) => {
      setEcdScrubbedState(false);
      setRestoreConfirmOpen(false);
      setUploadedFileText(null);
      setUploadedFileName(null);
      setSelectedCloudBackup(null);
      void qc.invalidateQueries();

      toast.success(
        `Cash data restored to exactly how it was! ${data.manifest.cashbookCount} cashbook entries, ${data.manifest.receiptsCount} receipts, and ${data.manifest.quotesCount} quotes reloaded.`,
        { duration: 6000 },
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Restoration failed");
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileText(content);
      setSelectedCloudBackup(null);
      setRestoreConfirmOpen(true);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  const handleCloudRestoreSelect = (path: string) => {
    setSelectedCloudBackup(path);
    setUploadedFileText(null);
    setUploadedFileName(null);
    setRestoreConfirmOpen(true);
  };

  const status = statusQuery.data;

  return (
    <div className="space-y-6">
      {/* Overview Status Banner */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <FolderLock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>ECD Vault</span>
                  <Badge variant="outline" className="text-xs font-mono font-normal">
                    Socket-Encrypted
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated one-click cash scrubbing, socket encryption, and 100% fidelity data
                  retrieval.
                </CardDescription>
              </div>
            </div>
            {status?.isScrubbed ? (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs px-2.5 py-1">
                <EyeOff className="h-3.5 w-3.5" /> Cash Tabs Hidden &amp; Scrubbed
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs px-2.5 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Live Cash System Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 block">Cashbook Entries</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {status?.activeCashStats.cashbookCount ?? 0}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 block">Cash Receipts</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {status?.activeCashStats.receiptsCount ?? 0}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 block">Cash Quotes</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {status?.activeCashStats.quotesCount ?? 0}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 block">Active Cash Volume</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ₹{(status?.activeCashStats.totalCashVolume ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Sections: 1. Scrub | 2. Retrieve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Erase Cash Data */}
        <Card className="border-red-200 dark:border-red-950/60 bg-gradient-to-b from-red-50/20 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Erase Cash Data (ECD)
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated one-click deletion and 4-way encrypted backup pipeline
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="space-y-2 rounded-lg bg-white/80 dark:bg-slate-900/80 p-3.5 border border-red-100 dark:border-red-900/40">
              <div className="flex items-start gap-2">
                <HardDrive className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                <span>
                  <strong>1. Local Drive Download:</strong> Encrypted <code>.stos</code> socket file
                  is generated for your laptop or smartphone folder.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Cloud className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>2. Cloud Storage Vault:</strong> Encrypted backup is securely stored in
                  Supabase Storage under <code>ecd-vault/</code>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>3. Hardcoded Email Transmission:</strong> Sealed archive manifest is sent
                  directly to <code>info@stonetech.in</code>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>4. Male-Female Socket Encryption:</strong> The folder name and details
                  inside it are 100% encrypted and unreadable by anyone outside this software.
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Execution takes under 2 minutes. Once executed, Raman&apos;s Cashbook, cash receipts,
              and cash quotes are purged from live tables, and the cash tabs are removed from
              navigation.
            </p>

            <Button
              variant="destructive"
              className="w-full gap-2 font-semibold shadow-xs"
              onClick={() => {
                setConfirmInput("");
                setConfirmOpen(true);
              }}
              disabled={executeEcdMutation.isPending}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>
                {executeEcdMutation.isPending ? "Executing ECD..." : "Execute One-Click ECD"}
              </span>
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: Seamless Retrieval */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Unlock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Retrieve &amp; Restore Cash Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Restore data exactly to how it was prior to erasure
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Method A: Upload File */}
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
              <FileCode className="h-6 w-6 text-slate-400 mx-auto" />
              <div className="font-medium text-slate-700 dark:text-slate-300">
                Plug In Local Encrypted Socket File (<code>.stos</code>)
              </div>
              <p className="text-[11px] text-slate-500">
                Select the downloaded socket file from your laptop drive or smartphone.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".stos,.json"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-white dark:bg-slate-800"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Select .stos Socket File</span>
              </Button>
            </div>

            {/* Method B: Cloud Storage Snapshot Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Available Cloud Snapshots</span>
                <button
                  type="button"
                  onClick={() => void cloudBackupsQuery.refetch()}
                  className="text-[11px] text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
                {cloudBackupsQuery.isLoading ? (
                  <div className="text-[11px] text-slate-400 py-3 text-center">
                    Checking cloud vault...
                  </div>
                ) : !cloudBackupsQuery.data || cloudBackupsQuery.data.length === 0 ? (
                  <div className="text-[11px] text-slate-400 py-3 text-center">
                    No cloud snapshots currently archived.
                  </div>
                ) : (
                  cloudBackupsQuery.data.map((b) => (
                    <div
                      key={b.path}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800 text-[11px]"
                    >
                      <div className="truncate mr-2">
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block truncate">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(b.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] text-teal-700 hover:text-teal-900 hover:bg-teal-50 shrink-0"
                        onClick={() => handleCloudRestoreSelect(b.path)}
                      >
                        Restore
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog: Execute ECD */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Cash Data Erasure (ECD)</span>
            </DialogTitle>
            <DialogDescription className="text-xs space-y-2 pt-2">
              <p>
                This action will export all cash transactions, quotations, and cashbook records into
                a sealed, male-female socket encrypted archive.
              </p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                The folder and file will be downloaded locally, stored in cloud vault, emailed to{" "}
                <code>info@stonetech.in</code>, and purged from live system views.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Type <span className="font-mono text-red-600 font-bold">ECD</span> to confirm:
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              placeholder="ECD"
              className="font-mono tracking-widest text-center uppercase font-bold"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmInput.trim() !== "ECD" || executeEcdMutation.isPending}
              onClick={() => executeEcdMutation.mutate(confirmInput)}
            >
              {executeEcdMutation.isPending ? "Encrypting & Scrubbing..." : "Confirm & Execute ECD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Restore ECD */}
      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <RefreshCw className="h-5 w-5" />
              <span>Plug In Socket &amp; Restore Cash Data</span>
            </DialogTitle>
            <DialogDescription className="text-xs space-y-2 pt-2">
              <p>
                STOS will verify the cryptographic authentication tag, decrypt the payload
                in-memory, and restore all cashbook entries, quotes, and receipts back to live
                tables.
              </p>
              {uploadedFileName && (
                <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  Source File: {uploadedFileName}
                </p>
              )}
              {selectedCloudBackup && (
                <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  Cloud Snapshot: {selectedCloudBackup}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRestoreConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              disabled={restoreEcdMutation.isPending}
              onClick={() => {
                restoreEcdMutation.mutate({
                  rawEnvelopeString: uploadedFileText ?? undefined,
                  storagePath: selectedCloudBackup ?? undefined,
                });
              }}
            >
              {restoreEcdMutation.isPending
                ? "Decrypting & Restoring..."
                : "Restore Data Exactly As Was"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

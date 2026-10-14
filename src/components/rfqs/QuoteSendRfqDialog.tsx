import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  Check,
  MapPin,
  Loader2,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Building2,
  Phone,
  Copy,
  Image as ImageIcon,
  Clock,
  Award,
  Boxes,
  Calendar,
  AlertCircle,
  ArrowRight,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { supabase } from "@/integrations/supabase/client";
import {
  listVendorsForPicker,
  extractVendorMetadata,
  getVendorPhone,
  getVendorContactName,
  type VendorRow,
} from "@/lib/vendors/api";
import {
  VENDOR_WORK_TYPES,
  VENDOR_PRODUCT_OPTIONS,
  getVendorProductLabel,
} from "@/lib/vendors/schema";
import { sendRfq } from "@/lib/enquiries/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { assignVendorToQuote } from "@/lib/quotes/vendor-assignment";
import { listAttachments } from "@/lib/attachments/api";
import {
  resolveAllQuoteImages,
  getQuoteGalleryImages,
  isStoneMaterialItem,
} from "@/lib/quotes/quote-images";
import { FILES_BUCKET } from "@/lib/constants";

export interface QuoteSendRfqItem {
  id?: string;
  product_name?: string | null;
  description?: string | null;
  product_id?: string | null;
  quantity?: number;
  uom?: string | null;
  unit?: string | null;
}

/**
 * Uploads a base64 data URL to Supabase storage (FILES_BUCKET) so it can be previewed/unfurled on WhatsApp
 */
async function uploadDataUrlToStorage(
  quoteId: string,
  dataUrl: string,
  label = "stone_sample",
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? "png" : "jpg";
    const cleanLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 25);
    const objectPath = `quotes/${quoteId}/rfq_${cleanLabel}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(FILES_BUCKET).upload(objectPath, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });
    if (error) {
      console.warn("Storage upload error:", error);
      return dataUrl;
    }
    const { data } = supabase.storage.from(FILES_BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  } catch (err) {
    console.warn("Failed to convert dataUrl to storage URL:", err);
    return dataUrl;
  }
}

export interface QuoteSendRfqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNo: string;
  customerName?: string;
  items?: QuoteSendRfqItem[];
  enquiryId?: string | null;
  projectId?: string;
  customerId?: string;
  initialTab?: "whatsapp" | "responses" | "formal";
  onAssigned?: (vendorName: string) => void;
}

export function QuoteSendRfqDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNo,
  customerName,
  items,
  enquiryId,
  projectId,
  customerId,
  initialTab = "whatsapp",
  onAssigned,
}: QuoteSendRfqDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"whatsapp" | "responses" | "formal">(initialTab);
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Fallback query to load quote line items if not supplied directly
  const quoteItemsFallback = useQuery({
    queryKey: ["quote-items-for-rfq-dialog", quoteId],
    queryFn: async (): Promise<QuoteSendRfqItem[]> => {
      const { data } = await supabase
        .from("quote_items")
        .select("id, description, product_id, quantity, unit")
        .eq("quote_id", quoteId);
      return (data ?? []).map((row) => ({
        id: row.id,
        description: row.description,
        product_name: row.description,
        product_id: row.product_id,
        quantity: row.quantity,
        uom: row.unit,
        unit: row.unit,
      }));
    },
    enabled: open && (!items || items.length === 0),
  });

  // Query full quote record to resolve images from workflow_state, wall_estimate, and IDs
  const fullQuoteQuery = useQuery({
    queryKey: ["quote-full-for-rfq", quoteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, quote_no, customer_id, project_id, enquiry_id, workflow_state, wall_estimate")
        .eq("id", quoteId)
        .single();
      return data;
    },
    enabled: open,
  });

  const effectiveItems = useMemo<QuoteSendRfqItem[]>(() => {
    if (items && items.length > 0) return items;
    return quoteItemsFallback.data ?? [];
  }, [items, quoteItemsFallback.data]);

  // Exclude non-stone items (adhesives, sealers, labour, etc.) for the stone vendor RFQ
  const stoneItems = useMemo<QuoteSendRfqItem[]>(() => {
    const filtered = effectiveItems.filter(isStoneMaterialItem);
    return filtered.length > 0 ? filtered : effectiveItems;
  }, [effectiveItems]);

  const effectiveCustomerId = customerId || fullQuoteQuery.data?.customer_id || "";
  const effectiveProjectId = projectId || fullQuoteQuery.data?.project_id || "";
  const effectiveEnquiryId = enquiryId ?? fullQuoteQuery.data?.enquiry_id ?? null;

  // Track which vendors received the WhatsApp text during this session
  const [sentVendorMap, setSentVendorMap] = useState<
    Record<string, { sentAt: string; count: number }>
  >({});

  // Track vendor reply inputs for the comparison & assignment tab
  const [vendorReplies, setVendorReplies] = useState<
    Record<
      string,
      {
        quotedRate: string;
        leadDays: string;
        deliveryDate: string;
        remarks: string;
      }
    >
  >({});

  // Reset/sync tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const vendors = useQuery({
    queryKey: qk.vendors.list(""),
    queryFn: () => listVendorsForPicker(),
    enabled: open,
  });

  // Extract keywords / products of interest from stone items
  const quoteProductKeywords = useMemo(() => {
    const set = new Set<string>();
    stoneItems.forEach((it) => {
      const text = `${it.product_name ?? ""} ${it.description ?? ""}`.toLowerCase();
      VENDOR_PRODUCT_OPTIONS.forEach((m) => {
        const words = m.label.toLowerCase().split(/\s+/);
        if (words.some((w) => w.length > 3 && text.includes(w))) {
          set.add(m.value);
        }
      });
      // Specialized work types / categories
      if (text.includes("cnc")) set.add("cnc_works");
      if (text.includes("polish") || text.includes("buffing")) set.add("polishing_work");
      if (text.includes("handcraft") || text.includes("carv") || text.includes("mandir"))
        set.add("handcrafter");
      if (
        text.includes("art") ||
        text.includes("mural") ||
        text.includes("inlay") ||
        text.includes("waterjet")
      )
        set.add("artwork");
      if (text.includes("cladding") || text.includes("veneer") || text.includes("panel"))
        set.add("wall_cladding");
    });
    return Array.from(set);
  }, [stoneItems]);

  // Load product images for any line items that reference a master product
  const productIds = useMemo(() => {
    return effectiveItems.map((it) => it.product_id).filter(Boolean) as string[];
  }, [effectiveItems]);

  const productImagesQ = useQuery({
    queryKey: ["product-images-for-rfq", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data } = await supabase
        .from("product_images")
        .select("id, product_id, url, is_primary")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false });
      return data ?? [];
    },
    enabled: open && productIds.length > 0,
  });

  // Load attachments associated with this quote from file_objects
  const quoteAttachmentsQ = useQuery({
    queryKey: ["quote-attachments-for-rfq", quoteId],
    queryFn: async () => {
      const files = await listAttachments("quote", quoteId);
      return files
        .filter((f) => f.mime_type?.startsWith("image/"))
        .map((f) => {
          const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.object_path);
          return {
            id: f.id,
            file_name: f.file_name,
            url: data.publicUrl,
          };
        });
    },
    enabled: open,
  });

  // Extract all quote images (Estimate Studio worksheet, line items, attachments, master catalog)
  const resolvedQuoteImagesQ = useQuery({
    queryKey: ["quote-resolved-images-for-rfq", quoteId, effectiveItems.length],
    queryFn: async () => {
      const q = fullQuoteQuery.data;
      if (!q) return [];
      const mappedItems = effectiveItems.map((it, idx) => ({
        id: it.id || `item_${idx}`,
        quote_id: quoteId,
        product_id: it.product_id ?? null,
        description: it.description || it.product_name || "",
        quantity: it.quantity ?? 1,
        unit_price: 0,
        unit: it.uom || it.unit || "sqft",
        line_total: 0,
        sort_order: idx + 1,
      }));
      const map = await resolveAllQuoteImages(q, mappedItems);
      return getQuoteGalleryImages(mappedItems, map);
    },
    enabled: open && Boolean(fullQuoteQuery.data),
  });

  // Available candidate images for the RFQ
  const availableImages = useMemo(() => {
    const list: Array<{ url: string; label: string }> = [];
    const seen = new Set<string>();

    (resolvedQuoteImagesQ.data ?? []).forEach((gi) => {
      if (gi.url && !seen.has(gi.url)) {
        seen.add(gi.url);
        list.push({ url: gi.url, label: gi.label || "Quotation Product Photo" });
      }
    });

    (productImagesQ.data ?? []).forEach((pi) => {
      if (pi.url && !seen.has(pi.url)) {
        seen.add(pi.url);
        list.push({ url: pi.url, label: "Product Catalog Photo" });
      }
    });

    (quoteAttachmentsQ.data ?? []).forEach((att) => {
      if (att.url && !seen.has(att.url)) {
        seen.add(att.url);
        list.push({ url: att.url, label: att.file_name || "Quote Drawing / Photo" });
      }
    });

    return list;
  }, [resolvedQuoteImagesQ.data, productImagesQ.data, quoteAttachmentsQ.data]);

  // Auto-select first image if available and none selected yet
  useEffect(() => {
    if (!selectedImageUrl && availableImages.length > 0) {
      setSelectedImageUrl(availableImages[0].url);
    }
  }, [availableImages, selectedImageUrl]);

  // If selected image is a data URL, upload it to storage in the background for clean WhatsApp preview
  useEffect(() => {
    if (selectedImageUrl && selectedImageUrl.startsWith("data:")) {
      let isMounted = true;
      void uploadDataUrlToStorage(quoteId, selectedImageUrl, "stone_product").then((publicUrl) => {
        if (isMounted && publicUrl && publicUrl.startsWith("http")) {
          setSelectedImageUrl(publicUrl);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [quoteId, selectedImageUrl]);

  // Rank vendors: vendors matching products dealt in or work types come first
  const scoredVendors = useMemo(() => {
    const list = vendors.data ?? [];
    return list
      .map((v) => {
        const meta = extractVendorMetadata(v);
        const matchedProducts = meta.products_dealt.filter((p) => quoteProductKeywords.includes(p));
        const matchedWorkTypes = meta.work_types.filter((w) => quoteProductKeywords.includes(w));
        const matchScore = matchedProducts.length * 2 + matchedWorkTypes.length;
        return {
          vendor: v,
          meta,
          matchedProducts,
          matchedWorkTypes,
          isMatch: matchScore > 0,
          contactName: getVendorContactName(v),
          phone: getVendorPhone(v),
        };
      })
      .sort((a, b) => {
        // Prioritize: contacted via WhatsApp first in response tab, else match score
        const aSent = Boolean(sentVendorMap[a.vendor.id]);
        const bSent = Boolean(sentVendorMap[b.vendor.id]);
        if (activeTab === "responses") {
          if (aSent && !bSent) return -1;
          if (!aSent && bSent) return 1;
        }
        if (a.isMatch && !b.isMatch) return -1;
        if (!a.isMatch && b.isMatch) return 1;
        return a.vendor.company_name.localeCompare(b.vendor.company_name);
      });
  }, [vendors.data, quoteProductKeywords, sentVendorMap, activeTab]);

  const matchedVendorIds = useMemo(() => {
    return scoredVendors.filter((s) => s.isMatch).map((s) => s.vendor.id);
  }, [scoredVendors]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllMatched = () => {
    if (matchedVendorIds.length > 0) {
      setSelected(Array.from(new Set([...selected, ...matchedVendorIds])));
    } else {
      setSelected(scoredVendors.slice(0, 5).map((s) => s.vendor.id));
    }
  };

  // Build the tailored WhatsApp RFQ text (Stone only, anonymized, no quote no, direct time & price request)
  const generateWhatsappMessage = (
    vendorName: string,
    contactPerson: string | null,
    overrideImageUrl?: string,
  ) => {
    const greeting = contactPerson ? `Namaste ${contactPerson} ji` : `Namaste Team ${vendorName}`;

    const itemsSummary = stoneItems
      .map((it, idx) => {
        const name = it.product_name || it.description || `Stone Material #${idx + 1}`;
        const qty = it.quantity ?? 1;
        const uom = it.uom || it.unit || "sqft";
        const specs =
          it.description && it.description !== it.product_name ? ` (${it.description})` : "";
        return `• *${name}* — ${qty} ${uom}${specs}`;
      })
      .join("\n");

    const imgUrl = overrideImageUrl ?? selectedImageUrl;
    const imgBlock =
      imgUrl && imgUrl.startsWith("http") ? `📸 *Design / Reference Image:*\n${imgUrl}\n\n` : "";

    return (
      `*REQUEST FOR QUOTATION (RFQ) — STONE TECH*\n\n` +
      `${greeting},\n\n` +
      `Please share your best quote for the following stone requirement:\n\n` +
      `${itemsSummary}\n\n` +
      `${imgBlock}` +
      `Kindly treat this as an RFQ and please return with:\n` +
      `1. ⏱️ *Time required to manufacture / deliver* (in days)\n` +
      `2. 💰 *Your best rate per sq ft* (₹/sqft)\n\n` +
      (notes ? `*Special Notes:* ${notes}\n\n` : "") +
      `Looking forward to your prompt response.\n` +
      `— *Stone Tech Operations*`
    );
  };

  // Trigger one-by-one WhatsApp text
  const handleSendWhatsapp = async (
    vendor: VendorRow,
    contactPerson: string | null,
    rawPhone: string | null,
  ) => {
    if (!rawPhone) {
      toast.error(
        `No phone number found for ${vendor.company_name}. Please update in Vendor Master.`,
      );
      return;
    }

    let activeImageUrl = selectedImageUrl;
    if (activeImageUrl && activeImageUrl.startsWith("data:")) {
      toast.info("Uploading product image for WhatsApp preview…");
      const uploaded = await uploadDataUrlToStorage(quoteId, activeImageUrl, "stone_product");
      if (uploaded && uploaded.startsWith("http")) {
        activeImageUrl = uploaded;
        setSelectedImageUrl(uploaded);
      }
    }

    const message = generateWhatsappMessage(vendor.company_name, contactPerson, activeImageUrl);
    const url = buildWhatsappUrl(rawPhone, message, "wa.me");

    window.open(url, "_blank", "noopener,noreferrer");

    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setSentVendorMap((prev) => ({
      ...prev,
      [vendor.id]: {
        sentAt: nowTime,
        count: (prev[vendor.id]?.count || 0) + 1,
      },
    }));

    toast.success(`WhatsApp RFQ opened for ${vendor.company_name}`);
  };

  const copyTemplateToClipboard = async () => {
    let activeImageUrl = selectedImageUrl;
    if (activeImageUrl && activeImageUrl.startsWith("data:")) {
      const uploaded = await uploadDataUrlToStorage(quoteId, activeImageUrl, "stone_product");
      if (uploaded && uploaded.startsWith("http")) {
        activeImageUrl = uploaded;
        setSelectedImageUrl(uploaded);
      }
    }
    const sampleMsg = generateWhatsappMessage("Vendor Name", "Vendor Contact", activeImageUrl);
    await navigator.clipboard.writeText(sampleMsg);
    setCopiedTemplate(true);
    toast.success("WhatsApp RFQ message copied to clipboard");
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleDownloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `stone_sample_${quoteNo}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded. You can attach it in WhatsApp chat.");
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleCopyImage = async (url: string) => {
    try {
      if (url.startsWith("http") && navigator.clipboard && window.ClipboardItem) {
        const res = await fetch(url);
        const blob = await res.blob();
        const img = new Image();
        img.crossOrigin = "anonymous";
        const imgBlobUrl = URL.createObjectURL(blob);
        img.src = imgBlobUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        URL.revokeObjectURL(imgBlobUrl);
        canvas.toBlob(async (pngBlob) => {
          if (!pngBlob) {
            await navigator.clipboard.writeText(url);
            toast.success("Image link copied to clipboard");
            return;
          }
          await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
          toast.success(
            "Image copied to clipboard! You can paste (Ctrl+V) directly into WhatsApp.",
          );
        }, "image/png");
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Image link copied to clipboard");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Image link copied to clipboard");
    }
  };

  // Vendor Reply updates
  const handleReplyChange = (
    vendorId: string,
    field: "quotedRate" | "leadDays" | "deliveryDate" | "remarks",
    val: string,
  ) => {
    setVendorReplies((prev) => {
      const current = prev[vendorId] || {
        quotedRate: "",
        leadDays: "",
        deliveryDate: "",
        remarks: "",
      };
      const updated = { ...current, [field]: val };

      // If user inputs leadDays, auto-compute deliveryDate
      if (field === "leadDays" && val && !isNaN(Number(val))) {
        const d = new Date();
        d.setDate(d.getDate() + Number(val));
        updated.deliveryDate = d.toISOString().slice(0, 10);
      }

      return {
        ...prev,
        [vendorId]: updated,
      };
    });
  };

  // Assign Order to Selected Vendor
  const assignMutation = useMutation({
    mutationFn: async ({ vendorId, vendorName }: { vendorId: string; vendorName: string }) => {
      const reply = vendorReplies[vendorId] || {
        quotedRate: "",
        leadDays: "",
        deliveryDate: "",
        remarks: "",
      };

      const quotedRateSqft = reply.quotedRate ? Number(reply.quotedRate) : null;
      const leadTimeDays = reply.leadDays ? Number(reply.leadDays) : null;

      let promisedDate = reply.deliveryDate || null;
      if (!promisedDate && leadTimeDays) {
        const d = new Date();
        d.setDate(d.getDate() + leadTimeDays);
        promisedDate = d.toISOString().slice(0, 10);
      }

      const notesArr: string[] = [];
      if (quotedRateSqft) notesArr.push(`Quoted: ₹${quotedRateSqft}/sqft`);
      if (leadTimeDays) notesArr.push(`Mfg time: ${leadTimeDays} days`);
      if (reply.remarks) notesArr.push(`Remarks: ${reply.remarks.trim()}`);

      return await assignVendorToQuote({
        quoteId,
        fulfilmentType: "vendor",
        vendorId,
        vendorName,
        promisedDeliveryDate: promisedDate,
        quotedRateSqft,
        leadTimeDays,
        notes: notesArr.length > 0 ? `[Assigned from WhatsApp RFQ] ${notesArr.join(" · ")}` : null,
      });
    },
    onSuccess: (_, { vendorName }) => {
      toast.success(`Quote #${quoteNo} assigned to ${vendorName}!`);
      void qc.invalidateQueries({ queryKey: qk.quotes.byId(quoteId) });
      void qc.invalidateQueries({ queryKey: qk.quotes.all });
      void qc.invalidateQueries({ queryKey: ["customer-order-pipeline"] });
      onAssigned?.(vendorName);
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  // Assign Order to In-House Stock
  const assignStockMutation = useMutation({
    mutationFn: async () => {
      return await assignVendorToQuote({
        quoteId,
        fulfilmentType: "in_stock",
        vendorId: "in_house_stock",
        vendorName: "In-House Stock",
        stockLocation: "Main Warehouse / Yard Stock",
        notes: "Fulfilled directly from in-house stock inventory",
      });
    },
    onSuccess: () => {
      toast.success(`Quote #${quoteNo} assigned to In-House Stock`);
      void qc.invalidateQueries({ queryKey: qk.quotes.byId(quoteId) });
      void qc.invalidateQueries({ queryKey: qk.quotes.all });
      void qc.invalidateQueries({ queryKey: ["customer-order-pipeline"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  // Formal System Database RFQ Mutation
  const formalMutation = useMutation({
    mutationFn: async () => {
      if (selected.length === 0) throw new Error("Please select at least one vendor");
      if (!dueDate) throw new Error("Please select a due date");

      let targetEnquiryId = effectiveEnquiryId;

      if (!targetEnquiryId) {
        const { data: enq, error: enqErr } = await supabase
          .from("enquiries")
          .insert({
            enquiry_no: "",
            customer_id: effectiveCustomerId,
            project_id: effectiveProjectId,
            requirement: `Approved Quotation #${quoteNo} products sourcing`,
            stage: "customer_quotation_sent",
            notes: `Auto-generated for Vendor RFQ from approved Quote #${quoteNo}`,
          })
          .select("id")
          .single();
        if (enqErr) throw enqErr;
        targetEnquiryId = enq.id;

        if (stoneItems.length > 0) {
          const enqItems = stoneItems.map((it, idx) => {
            const unitVal = it.uom || it.unit;
            const validUnit = (
              unitVal === "sqm" ||
              unitVal === "piece" ||
              unitVal === "slab" ||
              unitVal === "linear_ft" ||
              unitVal === "linear_m" ||
              unitVal === "cbm"
                ? unitVal
                : "sqft"
            ) as "sqft" | "sqm" | "piece" | "slab" | "linear_ft" | "linear_m" | "cbm";
            return {
              enquiry_id: enq.id,
              product_id: it.product_id ?? null,
              product_name_snapshot: it.product_name ?? it.description ?? "Stone product",
              quantity: Number(it.quantity) || 1,
              unit: validUnit,
              sort_order: idx + 1,
            };
          });
          const { error: itemsErr } = await supabase.from("enquiry_items").insert(enqItems);
          if (itemsErr) throw itemsErr;
        }

        await supabase.from("quotes").update({ enquiry_id: enq.id }).eq("id", quoteId);
      }

      return await sendRfq({
        enquiry_id: targetEnquiryId,
        vendor_ids: selected,
        due_date: dueDate,
        notes: notes ? notes : `Stone materials sourcing requirement`,
      });
    },
    onSuccess: () => {
      toast.success(
        `RFQ logged in system for ${selected.length} vendor${selected.length === 1 ? "" : "s"} for Quote #${quoteNo}`,
      );
      void qc.invalidateQueries({ queryKey: qk.rfqs.all });
      void qc.invalidateQueries({ queryKey: qk.quotes.byId(quoteId) });
      onOpenChange(false);
      setSelected([]);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <span>Vendor RFQ & WhatsApp Order Assignment</span>
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              Quote #{quoteNo}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Send WhatsApp RFQs directly to category vendors with product images, then record their
            quoted sq ft rate &amp; manufacturing time to assign the order.
          </DialogDescription>
        </DialogHeader>

        {/* Stone Items & Image Selection Summary */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Stone Materials to Source (
              {stoneItems.length})
            </span>
            {effectiveItems.length > stoneItems.length && (
              <span className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-2 py-0.5 font-medium">
                Adhesives, sealers &amp; labour excluded for stone vendor RFQ
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {stoneItems.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Loading quote products…</span>
            ) : (
              stoneItems.map((it, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-medium bg-background border-border"
                >
                  {it.product_name || it.description || `Item #${idx + 1}`}{" "}
                  <span className="text-muted-foreground ml-1 font-mono">
                    ({it.quantity ?? 1} {it.uom || it.unit || "sqft"})
                  </span>
                </Badge>
              ))
            )}
          </div>

          {/* Product Image Reference Picker with Visual Thumbnail & Direct Actions */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 shrink-0">
                <ImageIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Quotation Product Photo:</span>
              </div>

              {selectedImageUrl && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900 dark:text-slate-300"
                    onClick={() => handleCopyImage(selectedImageUrl)}
                    title="Copy image or link to clipboard for WhatsApp"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    <span>Copy Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900 dark:text-slate-300"
                    onClick={() => handleDownloadImage(selectedImageUrl)}
                    title="Download photo to attach directly in WhatsApp"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span>Download</span>
                  </Button>
                  <a
                    href={selectedImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded border border-border hover:bg-muted text-blue-600"
                    title="View full size image"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Visual Thumbnail */}
              {selectedImageUrl ? (
                <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0 shadow-xs">
                  <img
                    src={selectedImageUrl}
                    alt="Quotation stone product"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-lg border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center shrink-0 text-muted-foreground">
                  <ImageIcon className="h-5 w-5 opacity-40" />
                  <span className="text-[9px] mt-0.5">No photo</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <Input
                  value={selectedImageUrl}
                  onChange={(e) => setSelectedImageUrl(e.target.value)}
                  placeholder="Paste or select image URL to send with WhatsApp RFQ…"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {availableImages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                <span className="text-[11px] text-muted-foreground shrink-0">
                  Available images:
                </span>
                {availableImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageUrl(img.url)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors cursor-pointer shrink-0 ${
                      selectedImageUrl === img.url
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                        : "border-border bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <ImageIcon className="h-3 w-3" />
                    <span className="max-w-[140px] truncate">{img.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "whatsapp" | "responses" | "formal")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="whatsapp"
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>1. WhatsApp RFQ</span>
              {Object.keys(sentVendorMap).length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {Object.keys(sentVendorMap).length} Sent
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="responses"
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Award className="h-3.5 w-3.5 text-blue-600" />
              <span>2. Check Replies &amp; Assign</span>
            </TabsTrigger>
            <TabsTrigger value="formal" className="flex items-center gap-1.5 text-xs font-semibold">
              <Send className="h-3.5 w-3.5 text-slate-500" />
              <span>3. Formal System RFQ</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: WhatsApp RFQ One-by-One */}
          <TabsContent value="whatsapp" className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Send RFQs to Category Vendors One-by-One</span>
                </span>
                <p className="text-emerald-700/90 dark:text-emerald-400">
                  Sends stone material &amp; photo to vendors. Inquires about manufacturing lead
                  time and sq ft price without revealing customer or quote details.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0"
                onClick={copyTemplateToClipboard}
              >
                {copiedTemplate ? (
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {copiedTemplate ? "Copied" : "Copy Message Text"}
              </Button>
            </div>

            {/* Vendor List for WhatsApp RFQ */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {vendors.isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading vendors…
                </div>
              ) : scoredVendors.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No active vendors found. Add suppliers in Purchase &gt; Vendors.
                </div>
              ) : (
                scoredVendors.map(
                  ({
                    vendor: v,
                    meta,
                    matchedProducts,
                    matchedWorkTypes,
                    isMatch,
                    contactName,
                    phone,
                  }) => {
                    const sentInfo = sentVendorMap[v.id];
                    return (
                      <div
                        key={v.id}
                        className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          sentInfo
                            ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20"
                            : isMatch
                              ? "border-emerald-500/30 bg-emerald-50/10 hover:border-emerald-500/50"
                              : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {v.company_name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {v.vendor_code}
                            </span>
                            {isMatch && (
                              <Badge
                                variant="default"
                                className="bg-emerald-600 text-white text-[10px] px-1.5 py-0"
                              >
                                Category Match
                              </Badge>
                            )}
                            {sentInfo && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0 flex items-center gap-1 font-semibold"
                              >
                                <Check className="h-3 w-3" /> Sent ({sentInfo.sentAt})
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {contactName && (
                              <span>
                                Contact: <strong className="text-foreground">{contactName}</strong>
                              </span>
                            )}
                            {phone ? (
                              <span className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                                <Phone className="h-3 w-3 text-slate-400" /> {phone}
                              </span>
                            ) : (
                              <span className="text-rose-500 font-medium">⚠️ No phone number</span>
                            )}
                            {v.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {v.city}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {meta.work_types.map((wt) => {
                              const item = VENDOR_WORK_TYPES.find((w) => w.value === wt);
                              return (
                                <Badge
                                  key={wt}
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 font-normal"
                                >
                                  {item?.label ?? wt}
                                </Badge>
                              );
                            })}
                            {matchedProducts.length > 0 && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium ml-1">
                                Deals in:{" "}
                                {matchedProducts.map((p) => getVendorProductLabel(p)).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 shadow-xs"
                            disabled={!phone}
                            onClick={() => handleSendWhatsapp(v, contactName, phone)}
                          >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                            {sentInfo ? "Send Again" : "Send WhatsApp RFQ"}
                          </Button>
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>

            {/* Prompt to move to Tab 2 once texts are sent */}
            <div className="pt-2 flex items-center justify-between border-t border-border/80">
              <span className="text-xs text-muted-foreground">
                Once vendors reply with their rate &amp; lead time:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold text-primary"
                onClick={() => setActiveTab("responses")}
              >
                <span>Check Replies &amp; Assign Vendor</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: Check Replies & Assign Order */}
          <TabsContent value="responses" className="space-y-3 pt-2">
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-blue-900 dark:text-blue-300">
                  Compare Vendor Replies &amp; Assign Order
                </span>
                <p className="text-blue-700/90 dark:text-blue-400">
                  Input the rate (₹/sqft) and manufacturing days from the vendor's WhatsApp message,
                  then click "Assign Order".
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs border-blue-300 text-blue-800 hover:bg-blue-100 shrink-0"
                onClick={() => assignStockMutation.mutate()}
                disabled={assignStockMutation.isPending}
              >
                <Boxes className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                <span>Fulfill In-House Instead</span>
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {scoredVendors.map(({ vendor: v, contactName, phone, isMatch }) => {
                const reply = vendorReplies[v.id] || {
                  quotedRate: "",
                  leadDays: "",
                  deliveryDate: "",
                  remarks: "",
                };
                const sentInfo = sentVendorMap[v.id];

                return (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-lg border border-border bg-card shadow-xs space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">
                          {v.company_name}
                        </span>
                        {sentInfo && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] py-0"
                          >
                            WhatsApp RFQ Sent ({sentInfo.sentAt})
                          </Badge>
                        )}
                        {isMatch && !sentInfo && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Category Match
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {contactName && <span>Contact: {contactName}</span>}
                        {phone && <span className="font-mono">({phone})</span>}
                      </div>
                    </div>

                    {/* Response Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Quoted Rate (₹/sqft)
                        </label>
                        <Input
                          type="number"
                          value={reply.quotedRate}
                          onChange={(e) => handleReplyChange(v.id, "quotedRate", e.target.value)}
                          placeholder="e.g. 185"
                          className="h-8 text-xs font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Mfg Lead Time (Days)
                        </label>
                        <Input
                          type="number"
                          value={reply.leadDays}
                          onChange={(e) => handleReplyChange(v.id, "leadDays", e.target.value)}
                          placeholder="e.g. 6"
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Promised Delivery Date
                        </label>
                        <Input
                          type="date"
                          value={reply.deliveryDate}
                          onChange={(e) => handleReplyChange(v.id, "deliveryDate", e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <Button
                          type="button"
                          className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          disabled={assignMutation.isPending}
                          onClick={() =>
                            assignMutation.mutate({
                              vendorId: v.id,
                              vendorName: v.company_name,
                            })
                          }
                        >
                          <Award className="mr-1.5 h-3.5 w-3.5" />
                          Assign Order
                        </Button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Input
                        value={reply.remarks}
                        onChange={(e) => handleReplyChange(v.id, "remarks", e.target.value)}
                        placeholder="Vendor remarks or notes from WhatsApp (e.g. calibration included, packing extra)…"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: Formal System RFQ */}
          <TabsContent value="formal" className="space-y-3 pt-2">
            <QuickForm
              onSubmit={(e) => {
                e.preventDefault();
                formalMutation.mutate();
              }}
              busy={formalMutation.isPending}
            >
              <QuickForm.QuickFill>
                <Field label="Response due date" required>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </Field>

                <Field
                  label="Select Vendors to include in system RFQ"
                  required
                  hint={`${selected.length} selected`}
                  className="md:col-span-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      Vendors dealing in these products &amp; work types are listed first
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={selectAllMatched}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-primary" />
                        Select Matched ({matchedVendorIds.length})
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelected([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                    {scoredVendors.map(({ vendor: v, isMatch, contactName, phone }) => {
                      const isChecked = selected.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md p-2 text-sm transition-colors border ${
                            isChecked
                              ? "border-primary/40 bg-primary/5"
                              : isMatch
                                ? "border-emerald-500/30 bg-emerald-50/5 hover:bg-emerald-50/10"
                                : "border-transparent hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggle(v.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{v.company_name}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {v.vendor_code}
                              </span>
                              {contactName && (
                                <span className="text-xs text-muted-foreground">
                                  ({contactName})
                                </span>
                              )}
                              {phone && (
                                <span className="text-xs font-mono text-muted-foreground">
                                  {phone}
                                </span>
                              )}
                              {isMatch && (
                                <Badge
                                  variant="default"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-[10px] py-0 px-1.5"
                                >
                                  Matched
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </QuickForm.QuickFill>

              <QuickForm.MoreDetails>
                <Field label="Formal RFQ Notes for Vendors" className="md:col-span-2">
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specific instructions, delivery location requirements, quality expectations…"
                  />
                </Field>
              </QuickForm.MoreDetails>

              <QuickForm.Actions>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formalMutation.isPending || selected.length === 0}>
                  {formalMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Log System RFQ ({selected.length})
                </Button>
              </QuickForm.Actions>
            </QuickForm>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

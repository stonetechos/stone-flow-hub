/**
 * Copilot & AI server functions.
 *
 * Every AI capability the UI needs lives here. Kept behind `createServerFn`
 * so LOVABLE_API_KEY stays on the server and requests are authenticated.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff } from "./require-staff";

const chatInput = z.object({
  prompt: z.string().min(1).max(4000),
  context: z
    .object({
      route: z.string().optional(),
      entity: z.string().optional(),
      entityId: z.string().optional(),
      summary: z.string().max(4000).optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
});

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { chat } = await import("./gateway.server");

    const systemLines = [
      "You are the STOS Copilot — an assistant embedded in an ERP for the natural-stone industry (marble, granite, quartz, engineered stone).",
      "Users are sales, procurement, production, QC and management staff at a stone fabrication company in India.",
      "Answer briefly and specifically. Prefer bullet points and short paragraphs. Use INR (₹) for money and metric units.",
      "STRICT DATA RULE — you have NO access to this workspace's database. You MUST NOT invent or guess any specific customer name, project name or code, quotation number, invoice number, purchase order number, RFQ number, vendor name, employee name, product SKU, batch number, amount, date, quantity, or any other business record identifier. If the user asks for such specifics (e.g. 'which customers are inactive', 'top 5 projects', 'list overdue invoices'), reply: \"I don't have access to your live records from this chat. Open the relevant page (e.g. Customers, Invoices) or the Business Priorities card on the dashboard — those are computed directly from your database.\" and then offer to explain how the feature works in general terms.",
      "You may answer how-to, workflow, terminology, formula, and industry-knowledge questions freely. You may reason about numbers the user pastes into the chat. Never fabricate examples using invented company or record names.",
      "When suggesting actions, describe the workflow step so the user can perform it — you cannot execute tools yourself.",
    ];
    if (data.context?.route) systemLines.push(`Current page: ${data.context.route}`);
    if (data.context?.entity)
      systemLines.push(
        `Current entity: ${data.context.entity}${data.context.entityId ? ` (${data.context.entityId})` : ""}`,
      );
    if (data.context?.summary) systemLines.push(`Page context:\n${data.context.summary}`);

    const messages = [
      { role: "system" as const, content: systemLines.join("\n") },
      ...(data.history ?? []),
      { role: "user" as const, content: data.prompt },
    ];
    const reply = await chat(messages, { temperature: 0.4 });
    return { reply };
  });

const hsnInput = z.object({
  product_name: z.string().min(1),
  family: z.string().optional(),
  stone_type: z.string().optional(),
  finish: z.string().optional(),
  application: z.string().optional(),
  origin: z.string().optional(),
  thickness_mm: z.number().nullable().optional(),
  description: z.string().optional(),
});

export const suggestHsnGst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => hsnInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { chatJson } = await import("./gateway.server");
    const facts = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    type Result = {
      hsn: string;
      hsn_confidence: number;
      hsn_reason: string;
      gst_pct: number;
      gst_confidence: number;
      gst_reason: string;
    };
    const out = await chatJson<Result>(
      [
        {
          role: "system",
          content:
            "You are an India GST/HSN classification assistant for a natural-stone ERP. Return ONLY strict JSON with keys: hsn (string, 8-digit Indian HSN), hsn_confidence (0-1), hsn_reason (short), gst_pct (number: 5/12/18/28), gst_confidence (0-1), gst_reason (short). Base classification on chapter 68 (worked stone) and 25 (raw stone) unless clearly art (chapter 97).",
        },
        { role: "user", content: `Classify this stone product:\n${facts}\n\nReturn JSON only.` },
      ],
      { temperature: 0.1 },
    );
    return {
      hsn: { hsn: String(out.hsn), confidence: Number(out.hsn_confidence), reason: out.hsn_reason },
      gst: {
        gst_pct: Number(out.gst_pct),
        confidence: Number(out.gst_confidence),
        reason: out.gst_reason,
      },
    };
  });

const costInput = z.object({
  product_name: z.string(),
  stone_type: z.string().optional(),
  finish: z.string().optional(),
  thickness_mm: z.number().optional(),
  quantity: z.number(),
  unit: z.string().optional(),
  origin: z.string().optional(),
});

export const estimateCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => costInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { chatJson } = await import("./gateway.server");
    type Cost = {
      material: number;
      processing: number;
      vendor: number;
      transport: number;
      packing: number;
      labour: number;
      overheads: number;
      total_cost: number;
      suggested_selling_price: number;
      gross_margin_pct: number;
      net_margin_pct: number;
      notes: string;
    };
    const out = await chatJson<Cost>(
      [
        {
          role: "system",
          content:
            "You estimate manufacturing cost for natural-stone products in India (INR). Return strict JSON with numeric fields: material, processing, vendor, transport, packing, labour, overheads, total_cost, suggested_selling_price, gross_margin_pct, net_margin_pct, notes (short). All costs are for the requested total quantity.",
        },
        {
          role: "user",
          content: `Estimate cost for:\n${JSON.stringify(data, null, 2)}\n\nAssume typical Indian mid-market fabricator overheads. Return JSON only.`,
        },
      ],
      { temperature: 0.2 },
    );
    return out;
  });

const marketInput = z.object({
  stone_type: z.string(),
  colour: z.string().optional(),
  finish: z.string().optional(),
  thickness_mm: z.number().optional(),
  origin: z.string().optional(),
  unit: z.string().default("sqft"),
});

export const marketPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => marketInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { chatJson } = await import("./gateway.server");
    type Price = { low: number; average: number; high: number; confidence: number; notes: string };
    const out = await chatJson<Price>(
      [
        {
          role: "system",
          content:
            "Estimate current Indian wholesale market price per unit for natural stone. Return strict JSON: low, average, high (INR per unit), confidence (0-1), notes (short, cite the reasoning). Use best public knowledge; be conservative.",
        },
        { role: "user", content: `Product:\n${JSON.stringify(data)}\n\nReturn JSON only.` },
      ],
      { temperature: 0.3 },
    );
    return {
      low: Number(out.low),
      average: Number(out.average),
      high: Number(out.high),
      unit: data.unit,
      confidence: Number(out.confidence),
      last_updated: new Date().toISOString(),
      source: "AI market estimate",
      notes: out.notes,
    };
  });

const recogInput = z.object({ image_url: z.string().url() });

export const recognizeStoneImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recogInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { chat } = await import("./gateway.server");
    // Gemini Flash supports vision via OpenAI-style image_url parts.
    const raw = await chat(
      [
        {
          role: "system",
          content:
            'Identify natural stone from an image. Return strict JSON: {"stone_type":"","colour":"","finish":"","pattern":"","suggested_application":"","confidence":0.0,"notes":""}',
        },
        {
          role: "user",
          content: JSON.stringify([
            { type: "text", text: "Analyze this stone sample. Return JSON only." },
            { type: "image_url", image_url: { url: data.image_url } },
          ]),
        },
      ],
      { temperature: 0.2, jsonMode: true },
    );
    try {
      return JSON.parse(raw);
    } catch {
      return {
        stone_type: "",
        colour: "",
        finish: "",
        pattern: "",
        suggested_application: "",
        confidence: 0,
        notes: raw.slice(0, 300),
      };
    }
  });

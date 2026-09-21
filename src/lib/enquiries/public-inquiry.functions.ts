/**
 * Server functions for public lead generation and customer inquiries.
 *
 * Runs on the server with supabaseAdmin (service role) to allow unauthenticated
 * prospective customers to securely submit inquiries, upload photos, and create
 * leads in the STOS CRM without encountering client-side RLS restrictions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeMobile } from "@/lib/zod";
import { FILES_BUCKET } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

export const publicInquiryInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  country_code: z.string().trim().default("+91"),
  whatsapp: z.string().trim().min(7, "Please enter a valid WhatsApp number"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  city: z.string().trim().min(2, "Please enter your city or project location"),
  customer_role: z.string().optional().default("Owner / Homeowner"),
  customer_type: z.string().optional().default("individual"),
  space_type: z.string().trim().min(1, "Please select the type of space"),
  required_date: z.string().min(1, "Please select when you need this by"),
  selected_products: z.array(z.string()).min(1, "Please select at least one product"),
  plan_description: z.string().optional().default(""),
  photos: z
    .array(
      z.object({
        name: z.string(),
        dataUrl: z.string(),
        size: z.number().optional(),
        type: z.string().optional(),
      }),
    )
    .max(10, "You can upload a maximum of 10 photos")
    .default([]),
});

const VALID_SPACE_TYPES: Record<string, Database["public"]["Enums"]["space_type"]> = {
  bungalow: "bungalow",
  "bungalow / villa": "bungalow",
  villa: "bungalow",
  apartment: "apartment",
  "apartment / flat": "apartment",
  flat: "apartment",
  "commercial office": "commercial_space",
  commercial_space: "commercial_space",
  "hotel / resort": "resort",
  hotel: "hotel",
  resort: "resort",
  "temple / mandir": "holy_place",
  temple: "holy_place",
  mandir: "holy_place",
  holy_place: "holy_place",
  farmhouse: "farmhouse",
  "restaurant / cafe": "restaurant",
  restaurant: "restaurant",
  "showroom / retail": "showroom",
  showroom: "showroom",
  spa: "spa",
  residential_building: "residential_building",
  educational_institution: "educational_institution",
  garden: "garden",
  exhibition: "exhibition",
  college: "college",
  hostel: "hostel",
  mall: "mall",
  govt_institution: "govt_institution",
};

const VALID_MATERIAL_INTERESTS: Record<string, Database["public"]["Enums"]["material_interest"]> = {
  "stone murals & carvings": "stone_murals",
  "stone murals": "stone_murals",
  "stone_murals": "stone_murals",
  "custom flooring": "custom_flooring",
  "general flooring": "general_flooring",
  "custom_flooring": "custom_flooring",
  "table tops & countertops": "table_top",
  "table top": "table_top",
  "table_top": "table_top",
  "pu decorative panels": "pu_panels",
  "pu panels": "pu_panels",
  "pu_panels": "pu_panels",
  "stepping stones & landscape": "stepping_stone",
  "stepping stone": "stepping_stone",
  "stepping_stone": "stepping_stone",
  "agate & semi-precious slabs": "agate_slabs",
  "agate slabs": "agate_slabs",
  "agate_slabs": "agate_slabs",
  "natural stone mosaics": "natural_stone_mosaics",
  "natural_stone_mosaics": "natural_stone_mosaics",
  "inlay work": "inlay_work",
  "inlay_work": "inlay_work",
  "custom stone cladding": "custom_stone_cladding",
  "custom_stone_cladding": "custom_stone_cladding",
  "crazy pattern in stone": "crazy_pattern_in_stone",
  "crazy_pattern_in_stone": "crazy_pattern_in_stone",
  "stone veneer": "stone_veneer",
  "stone_veneer": "stone_veneer",
  "stone veneer artwork": "stone_veneer_artwork",
  "stone_veneer_artwork": "stone_veneer_artwork",
  "natural stone interlocking panels": "natural_stone_interlocking_panels",
  "natural_stone_interlocking_panels": "natural_stone_interlocking_panels",
};

export type PublicInquiryInput = z.infer<typeof publicInquiryInputSchema>;

export interface PublicInquiryResult {
  success: boolean;
  enquiry_id: string;
  enquiry_no: string;
  customer_id: string;
  customer_name: string;
  whatsapp: string;
  whatsapp_link: string;
}

export const lookupCustomerInputSchema = z.object({
  country_code: z.string().default("+91"),
  whatsapp: z.string().trim().min(6, "Please enter your WhatsApp phone number"),
});

export interface CustomerInquirySummary {
  enquiry_no: string;
  stage: string;
  stage_label: string;
  required_delivery_date: string | null;
  created_at: string;
  requirement: string | null;
  customer_name: string;
}

export const lookupCustomerEnquiriesServerFn = createServerFn({ method: "POST" })
  .inputValidator((raw) => lookupCustomerInputSchema.parse(raw))
  .handler(async ({ data: input }): Promise<{ inquiries: CustomerInquirySummary[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rawDigits = input.whatsapp.replace(/\D/g, "");
    if (rawDigits.length < 6) return { inquiries: [] };

    const searchDigits = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;

    // Find customer by phone
    const { data: custs } = await supabaseAdmin
      .from("customers")
      .select("id, name, whatsapp, primary_phone")
      .or(`primary_phone.ilike.%${searchDigits}%,whatsapp.ilike.%${searchDigits}%`)
      .limit(5);

    if (!custs || custs.length === 0) {
      return { inquiries: [] };
    }

    const customerIds = custs.map((c) => c.id);
    const { data: enqs } = await supabaseAdmin
      .from("enquiries")
      .select("id, enquiry_no, stage, required_delivery_date, created_at, requirement, customer_id")
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false })
      .limit(10);

    const STAGE_LABELS: Record<string, string> = {
      new_lead: "Inquiry Received",
      contacted: "Representative Assigned",
      site_visit_scheduled: "Site Visit Scheduled",
      quote_sent: "Quotation Shared",
      negotiation: "Finalizing Selection",
      won: "Order Confirmed",
      lost: "Closed",
      cancelled: "Cancelled",
    };

    const inquiries: CustomerInquirySummary[] = (enqs || []).map((e) => {
      const c = custs.find((cust) => cust.id === e.customer_id);
      return {
        enquiry_no: e.enquiry_no,
        stage: e.stage,
        stage_label: STAGE_LABELS[e.stage] || e.stage,
        required_delivery_date: e.required_delivery_date,
        created_at: e.created_at,
        requirement: e.requirement,
        customer_name: c?.name || "Valued Customer",
      };
    });

    return { inquiries };
  });

export const submitPublicEnquiryServerFn = createServerFn({ method: "POST" })
  .inputValidator((raw) => publicInquiryInputSchema.parse(raw))
  .handler(async ({ data: input }): Promise<PublicInquiryResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Sanitize and normalize WhatsApp phone number with country code
    const countryDial = (input.country_code || "+91").trim();
    const cleanDial = countryDial.startsWith("+") ? countryDial : `+${countryDial}`;
    const rawDigits = input.whatsapp.replace(/\D/g, "");
    const searchPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    const normalizedPhone = `${cleanDial} ${rawDigits}`;

    // 2. Find existing customer or create a new customer record
    let customerId: string | null = null;
    let customerCode = "";

    try {
      const { data: existingCustomers } = await supabaseAdmin
        .from("customers")
        .select("id, name, customer_code")
        .or(`primary_phone.ilike.%${searchPhone}%,whatsapp.ilike.%${searchPhone}%`)
        .limit(1);

      if (existingCustomers && existingCustomers.length > 0) {
        customerId = existingCustomers[0].id;
        customerCode = existingCustomers[0].customer_code;
      }
    } catch (findErr) {
      console.warn("[public-inquiry] Error finding existing customer:", findErr);
    }

    if (!customerId) {
      const fallbackCode = `CUST-${Date.now().toString().slice(-6)}`;
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("customers")
        .insert({
          name: input.name.trim(),
          customer_code: fallbackCode,
          primary_phone: normalizedPhone,
          whatsapp: normalizedPhone,
          primary_email: input.email ? input.email.trim().toLowerCase() : null,
          city: input.city.trim(),
          customer_type: ([
            "builder",
            "architect",
            "interior_designer",
            "contractor",
            "individual",
            "company",
            "other",
          ].includes(input.customer_type)
            ? input.customer_type
            : "individual") as Database["public"]["Enums"]["customer_type"],
          source: "Shareable Web Link",
          space_type: (input.space_type ? VALID_SPACE_TYPES[input.space_type.trim().toLowerCase()] : null) || null,
          material_interests: (input.selected_products || [])
            .map((p) => VALID_MATERIAL_INTERESTS[p.trim().toLowerCase()])
            .filter((p): p is Database["public"]["Enums"]["material_interest"] => Boolean(p)),
          notes: `Lead from public web form. Space: ${input.space_type}. Role: ${input.customer_role || "Owner / Homeowner"}. Required by: ${input.required_date}`,
        } as unknown as Database["public"]["Tables"]["customers"]["Insert"])
        .select("id, customer_code")
        .single();

      if (custErr || !newCustomer) {
        console.error("[public-inquiry] Customer creation failed:", custErr);
        throw new Error(custErr?.message || "Failed to register customer contact");
      }
      customerId = newCustomer.id;
      customerCode = newCustomer.customer_code;
    }

    // 3. Generate unique enquiry number (ENQ-YYYYMMDD-XXXX)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const enquiryNo = `ENQ-${todayStr}-${randomSuffix}`;

    // 4. Calculate Priority based on required date (urgent if <= 7 days)
    const reqTime = new Date(input.required_date).getTime();
    const nowTime = Date.now();
    const diffDays = Math.ceil((reqTime - nowTime) / (1000 * 60 * 60 * 24));
    const isUrgent = diffDays <= 7;
    const priority: Database["public"]["Enums"]["enquiry_priority"] = isUrgent
      ? "urgent"
      : "normal";

    // 5. Upload uploaded photos to Supabase Storage (stonetech-files)
    const uploadedPhotoUrls: string[] = [];
    const photoObjects: Array<{ name: string; path: string; url: string }> = [];

    for (let i = 0; i < (input.photos || []).length; i++) {
      const p = input.photos[i];
      if (!p.dataUrl) continue;

      try {
        const matches = p.dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) continue;

        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        const ext = contentType.split("/")[1] || "jpg";
        const filename = `photo_${i + 1}_${Date.now()}.${ext}`;
        const storagePath = `public-enquiries/${enquiryNo}/${filename}`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from(FILES_BUCKET)
          .upload(storagePath, buffer, {
            contentType,
            upsert: true,
          });

        if (!uploadErr) {
          const { data: pubUrlData } = supabaseAdmin.storage
            .from(FILES_BUCKET)
            .getPublicUrl(storagePath);
          const photoUrl = pubUrlData.publicUrl;
          uploadedPhotoUrls.push(photoUrl);
          photoObjects.push({
            name: p.name || filename,
            path: storagePath,
            url: photoUrl,
          });
        }
      } catch (uploadCatch) {
        console.warn("[public-inquiry] Photo upload warning:", uploadCatch);
      }
    }

    // 6. Format requirement description
    const formattedProducts =
      input.selected_products.length > 0
        ? input.selected_products.join(", ")
        : "General Stone Requirement";

    const requirementText = [
      input.customer_role ? `Customer Role: ${input.customer_role}` : "",
      `Products: ${formattedProducts}`,
      input.space_type ? `Space Type: ${input.space_type}` : "",
      `Required by: ${input.required_date}`,
      `Site Location: ${input.city.trim()}`,
      input.plan_description ? `Plan Details: ${input.plan_description.trim()}` : "",
      uploadedPhotoUrls.length > 0 ? `Attached Photos: ${uploadedPhotoUrls.length} file(s)` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // 7. Insert the Enquiry record
    const { data: createdEnquiry, error: enqErr } = await supabaseAdmin
      .from("enquiries")
      .insert({
        enquiry_no: enquiryNo,
        customer_id: customerId,
        project_id: null,
        stage: "new_lead",
        priority,
        source: "Shareable Web Link",
        requirement: requirementText,
        required_delivery_date: input.required_date,
        notes: `Customer WhatsApp: ${normalizedPhone} | Role: ${input.customer_role || "Owner / Homeowner"} | City: ${input.city.trim()} | Delivery Required: ${input.required_date}`,
        external_ref: {
          client_whatsapp: normalizedPhone,
          client_city: input.city.trim(),
          client_role: input.customer_role || "Owner / Homeowner",
          space_type: input.space_type || null,
          selected_products: input.selected_products,
          photos: photoObjects,
          photo_urls: uploadedPhotoUrls,
          submitted_at: new Date().toISOString(),
        },
      } as unknown as Database["public"]["Tables"]["enquiries"]["Insert"])
      .select("id, enquiry_no")
      .single();

    if (enqErr || !createdEnquiry) {
      console.error("[public-inquiry] Enquiry creation failed:", enqErr);
      throw new Error(enqErr?.message || "Failed to log your inquiry. Please try again.");
    }

    // 8. Register file objects in file_objects table for ERP attachment viewers
    for (const po of photoObjects) {
      try {
        await supabaseAdmin.from("file_objects").insert({
          bucket: FILES_BUCKET,
          entity_type: "enquiry",
          entity_id: createdEnquiry.id,
          file_name: po.name,
          object_path: po.path,
          folder: "site_image",
        });
      } catch (foErr) {
        console.warn("[public-inquiry] file_objects entry warning:", foErr);
      }
    }

    // 9. Prepare WhatsApp link for instant contact
    const encodedMsg = encodeURIComponent(
      `Hello Stone Tech Team! I have submitted an inquiry on your website.\n\n*Reference:* ${createdEnquiry.enquiry_no}\n*Name:* ${input.name.trim()}\n*Products:* ${formattedProducts}\n*Required by:* ${input.required_date}\n*City:* ${input.city.trim()}`,
    );
    // WhatsApp direct click link (using Stone Tech official number +91 77420 90866)
    const whatsappLink = `https://api.whatsapp.com/send?phone=917742090866&text=${encodedMsg}`;

    return {
      success: true,
      enquiry_id: createdEnquiry.id,
      enquiry_no: createdEnquiry.enquiry_no,
      customer_id: customerId,
      customer_name: input.name.trim(),
      whatsapp: normalizedPhone,
      whatsapp_link: whatsappLink,
    };
  });

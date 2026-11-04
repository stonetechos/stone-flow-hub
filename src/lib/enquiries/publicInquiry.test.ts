import { describe, expect, test } from "bun:test";
import { publicInquiryInputSchema } from "./public-inquiry.functions";

describe("publicInquiryInputSchema", () => {
  test("defaults service_scope to supply_and_installation when omitted", () => {
    const parsed = publicInquiryInputSchema.parse({
      name: "Raman Patel",
      whatsapp: "9876543210",
      city: "Ahmedabad",
      space_type: "Bungalow / Villa",
      required_date: "2026-12-01",
      selected_products: ["Stone Murals & Carvings"],
    });

    expect(parsed.service_scope).toBe("supply_and_installation");
    expect(parsed.photos).toEqual([]);
  });

  test("accepts supply_only service scope", () => {
    const parsed = publicInquiryInputSchema.parse({
      name: "Rishi Shah",
      whatsapp: "9876543211",
      city: "Surat",
      space_type: "Commercial Office",
      service_scope: "supply_only",
      required_date: "2026-11-20",
      selected_products: ["PU Decorative Panels"],
    });

    expect(parsed.service_scope).toBe("supply_only");
  });

  test("accepts tagged photos of the walls and CAD drawings", () => {
    const parsed = publicInquiryInputSchema.parse({
      name: "Meera Mehta",
      whatsapp: "9876543212",
      city: "Jaipur",
      space_type: "Apartment / Flat",
      service_scope: "supply_and_installation",
      required_date: "2026-11-25",
      selected_products: ["Natural Stone Mosaics"],
      photos: [
        {
          name: "living_room_wall_1.jpg",
          dataUrl: "data:image/jpeg;base64,12345",
          tag: "wall_photo",
        },
        {
          name: "elevation_cad_dwg.pdf",
          dataUrl: "data:application/pdf;base64,67890",
          tag: "drawing",
        },
      ],
    });

    expect(parsed.photos).toHaveLength(2);
    expect(parsed.photos[0].tag).toBe("wall_photo");
    expect(parsed.photos[1].tag).toBe("drawing");
  });
});

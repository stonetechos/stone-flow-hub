/**
 * Browser-side image compression using HTML5 Canvas.
 * Compresses camera/gallery photos down to a compact JPEG data URL (~50-100KB)
 * to prevent massive base64 payloads from blowing up database JSONB columns or network requests.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1000,
  quality = 0.75,
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    // Non-browser / Node / Bun environment fallback
    if (typeof FileReader === "undefined") {
      const buf = await file.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return `data:${file.type || "application/octet-stream"};base64,${b64}`;
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawData = e.target?.result as string;
      if (!rawData) {
        resolve("");
        return;
      }

      // If it's not an image (e.g. PDF/text), just return raw data
      if (!file.type.startsWith("image/")) {
        resolve(rawData);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawData);
          return;
        }

        try {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } catch {
          resolve(rawData);
        }
      };
      img.onerror = () => resolve(rawData);
      img.src = rawData;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

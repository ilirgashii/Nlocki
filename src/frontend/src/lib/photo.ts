export async function preparePhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("Select a JPEG, PNG or WebP photo.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Select a photo smaller than 10 MB.");
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    image.close();
    throw new Error("Image processing unavailable.");
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const url = canvas.toDataURL("image/jpeg", 0.8);
  if (url.length > 700000)
    throw new Error("Photo is too large after compression.");
  return url;
}

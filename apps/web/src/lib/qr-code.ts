const DEFAULT_QR_SIZE = 256;
const DEFAULT_QR_PADDING = 24;

function safeFilename(filename: string): string {
  const normalized = filename.trim().replace(/[^a-z0-9._-]+/gi, "-");
  return normalized || "qr-code.png";
}

/** Export the rendered react-qr-code SVG as a padded PNG download. */
export async function downloadQrCodeAsPng(
  container: Element | null,
  filename: string,
  size = DEFAULT_QR_SIZE,
  padding = DEFAULT_QR_PADDING
): Promise<void> {
  const svg = container?.querySelector("svg");
  if (!svg) throw new Error("QR code is not rendered");

  const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("QR code could not be rendered"));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, padding, padding, size, size);

    const link = document.createElement("a");
    link.download = safeFilename(filename);
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

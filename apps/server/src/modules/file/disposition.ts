/** A file a stranger uploaded must never run as a page on this origin: html, svg and xml go out as attachments. */
export function dispositionFor(contentType: string): "inline" | "attachment" {
  return /html|svg|xml|javascript/i.test(contentType) ? "attachment" : "inline";
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

/** The canonical public origin used for metadata, previews, and public links. */
export function getPublicSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BASIS_PUBLIC_URL?.trim();
  if (configured) return normalizeUrl(configured);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return normalizeUrl(`https://${vercelUrl}`);

  return "http://localhost:3000";
}

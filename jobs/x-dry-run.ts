import { closeDb } from "../packages/db/client";
import { dryRunXPostPreview, getXPostBaseUrl, type XPostFinding } from "./x-poster";

const sourceUrl = (process.env.BASIS_PRODUCTION_URL?.trim() || getXPostBaseUrl()).replace(/\/$/, "");

const response = await fetch(`${sourceUrl}/api/findings?limit=100`, {
  cache: "no-store",
});
if (!response.ok) {
  throw new Error(`Production findings returned ${response.status}: ${await response.text()}`);
}

const body = (await response.json()) as {
  kind?: string;
  data?: { findings?: Array<Omit<XPostFinding, "detectedAt"> & { detectedAt: string }> };
};
if (body.kind !== "success" || !Array.isArray(body.data?.findings)) {
  throw new Error("Production findings response was invalid.");
}

const findings: XPostFinding[] = body.data.findings.map((finding) => ({
  ...finding,
  detectedAt: new Date(finding.detectedAt),
}));

console.log(`[x:dry-run] source=${sourceUrl}/api/findings?limit=100`);
console.log(`[x:dry-run] candidates=${findings.length}; limit=3; sorted by liquidity descending`);
await dryRunXPostPreview(findings, { baseUrl: sourceUrl });

await closeDb();

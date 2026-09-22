import { GET } from "../app/api/split/[ca]/hourly/route";
import { NextRequest } from "next/server";

async function main() {
  const req = new NextRequest("http://localhost:3000/api/split/0xb911f04a24a9f6234537829290335e623ee71e18/hourly?window=24h");
  const res = await GET(req, { params: Promise.resolve({ ca: "0xb911f04a24a9f6234537829290335e623ee71e18" }) });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
main().catch(console.error);

import { GET } from "../app/api/split/[ca]/hourly/route";
import { NextRequest } from "next/server";

async function main() {
  const req = new NextRequest("http://localhost:3000/api/split/0x9ab6706979cb33b8012b2897210474fe9991e18/hourly?window=24h");
  const res = await GET(req, { params: Promise.resolve({ ca: "0x9ab6706979cb33b8012b2897210474fe9991e18" }) });
  const json = await res.json();
  console.log("AI/NVDA result:", json.points?.[0]);
}
main().catch(console.error);

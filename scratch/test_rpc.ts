import * as fs from "fs";
const env = fs.readFileSync(".env", "utf8");
let rpcUrl = "";
for (const line of env.split("\n")) {
  if (line.trim().startsWith("RPC_URL=")) {
    rpcUrl = line.trim().substring("RPC_URL=".length).replace(/['"]/g, '');
  }
}
async function main() {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_blockNumber",
    params: []
  });
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  const text = await res.text();
  console.log("Response text:", text);
}
main();

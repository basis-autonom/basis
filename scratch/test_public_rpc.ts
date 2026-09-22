async function main() {
  const currentBlockRes = await fetch("https://rpc.mainnet.chain.robinhood.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })
  });
  const currentBlockJson = await currentBlockRes.json();
  const currentBlock = parseInt(currentBlockJson.result, 16);
  console.log("Current block:", currentBlock);

  // Try 1 hour ago (1 block = 2 seconds approx -> 1800 blocks)
  const targetBlock = currentBlock - 1800;
  const hexBlock = "0x" + targetBlock.toString(16);
  console.log("Target block:", hexBlock);

  const histRes = await fetch("https://rpc.mainnet.chain.robinhood.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "eth_getBalance",
      params: ["0x0000000000000000000000000000000000000000", hexBlock]
    })
  });
  const histJson = await histRes.json();
  console.log("Historical response:", histJson);
}
main();

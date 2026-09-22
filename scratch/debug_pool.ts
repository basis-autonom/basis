import { getPoolForToken } from "../packages/core/chain";
async function main() {
  const pool = await getPoolForToken("0x82ef09793c78f7cb6a2b6696fcdca8e1c3581e18");
  console.log(pool?.address);
}
main();

import { computeSplit } from './packages/core/attribution';
import { Address } from './packages/core/types';

async function test() {
  const ca = '0xDeCF74e4AA6fF30b1612e65665AAF650BEdecbA3' as Address;
  console.log(`Testing computeSplit for Memecoin CA: ${ca}`);
  
  try {
    const res = await computeSplit(ca, '7d');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Test failed', e);
  }
}

test();

import { createPublicClient, http, fallback, defineChain } from 'viem';

export const CHAIN_ID = 4663;
export const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
export const EXPLORER_URL = 'https://robinhoodchain.blockscout.com';

export const robinhoodChain = defineChain({
  id: CHAIN_ID,
  name: 'Robinhood Chain',
  network: 'robinhood',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: EXPLORER_URL },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1, // Or whatever block it was deployed at, 1 is safe for general use
    },
  },
});

export const client = createPublicClient({
  chain: robinhoodChain,
  transport: fallback([
    http(process.env.RPC_URL),
    http(RPC_URL)
  ]),
});

// Addresses verified via recon from independent third-party sources
export const V4_POOL_MANAGER = '0x8366a39CC670B4001A1121B8F6A443A643e40951';
export const V4_STATE_VIEW = '0xF3334192D15450CdD385c8B70e03f9A6bD9E673b';
export const V4_UNIVERSAL_ROUTER = '0x06AfBA43Fd06227fA663b0DAecF536f6EaA6bf99';
export const V4_QUOTER = '0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94';

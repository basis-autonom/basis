export default function Loading() {
  return (
    <div className="flex flex-1 h-full items-center justify-center p-6 bg-bg flex-col gap-4">
      <div className="flex items-center gap-[10px]">
        <div className="w-[16px] h-[16px] border-2 border-line2 border-t-fg2 rounded-full animate-spin"></div>
        <div className="font-mono text-[12px] text-fg2">Crunching on-chain data...</div>
      </div>
      <div className="font-mono text-[10px] text-fg3">
        Fetching live pool state from Robinhood Chain
      </div>
    </div>
  );
}

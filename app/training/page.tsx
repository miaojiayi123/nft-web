'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Database, 
  Timer, 
  Zap, 
  Coins, 
  Loader2, 
  Layers, 
  Activity,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';

// ✅ 引入余额组件
import TokenBalance from '@/components/TokenBalance';

// 这里填你的 NFT 合约
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'.toLowerCase();

interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
}

interface StakingRecord {
  id: number;
  token_id: string;
  start_time: string;
  status: string;
}

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();
  
  const [ownedNfts, setOwnedNfts] = useState<NFT[]>([]);
  const [stakedRecords, setStakedRecords] = useState<StakingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [liveRewards, setLiveRewards] = useState<Record<string, number>>({});
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // 1. 获取 NFT
  const fetchNFTs = async () => {
    if (!address || !chain) return;
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const network = 'eth-sepolia'; 
      const baseURL = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
      const url = `${baseURL}?owner=${address}&withMetadata=true&contractAddresses[]=${CONTRACT_ADDRESS}`;
      
      const response = await fetch(url);
      const data = await response.json();
      return data.ownedNfts || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  // 2. 获取质押记录
  const fetchStakingData = async () => {
    if (!address) return [];
    const { data } = await supabase
      .from('staking')
      .select('*')
      .eq('wallet_address', address)
      .eq('status', 'active');
    return data || [];
  };

  const initData = async () => {
    if (ownedNfts.length === 0) setIsLoading(true);
    const [nfts, records] = await Promise.all([fetchNFTs(), fetchStakingData()]);
    if (nfts) setOwnedNfts(nfts);
    if (records) setStakedRecords(records);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isConnected) initData();
  }, [isConnected, address]);

  // 3. 实时计算 KIKI 奖励 (每秒 0.01)
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveRewards(prev => {
        const next = { ...prev };
        stakedRecords.forEach(record => {
          if (processingIds.has(record.id)) return;

          const start = new Date(record.start_time).getTime();
          const now = new Date().getTime();
          const seconds = (now - start) / 1000;
          
          next[record.token_id] = Math.floor(seconds * 0.01 * 10000) / 10000;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stakedRecords, processingIds]);

  // 4. 开始质押 (Stake)
  const handleStake = async (nft: NFT) => {
    if (nft.contract.address.toLowerCase() !== CONTRACT_ADDRESS) {
      alert("Invalid Asset Contract");
      return;
    }
    const { error } = await supabase.from('staking').insert([{
      wallet_address: address,
      token_id: nft.id.tokenId,
      status: 'active'
    }]);
    if (!error) initData();
  };

  // 5. 提取收益 (Claim)
  const handleClaim = async (record: StakingRecord) => {
    if (processingIds.has(record.id)) return;
    
    setProcessingIds(prev => new Set(prev).add(record.id));
    
    try {
      const res = await fetch('/api/claim-kiki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          userAddress: address
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Claim failed');
      }

      alert(`✅ Yield Claimed: ${result.amount} KIKI\nTX: ${result.txHash.slice(0, 10)}...`);
      await initData(); 

    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  // 过滤逻辑
  const stakedIds = stakedRecords.map(r => BigInt(r.token_id).toString());
  const activeStakingNFTs = ownedNfts.filter(nft => stakedIds.includes(BigInt(nft.id.tokenId).toString()));
  const idleNFTs = ownedNfts.filter(nft => !stakedIds.includes(BigInt(nft.id.tokenId).toString()));

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-green-500/30 font-sans">
      
      {/* 背景底噪 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-900/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* 顶部导航 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-blue-400 transition-colors mb-2 uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO DASHBOARD
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Database className="w-8 h-8 text-green-500" />
              Yield Farming
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <TokenBalance />
            <ConnectButton />
          </div>
        </header>

        {/* 顶部介绍 */}
        <div className="mb-12 border-b border-white/5 pb-8">
           <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Live Staking Pool</span>
           </div>
           <p className="text-slate-400 max-w-2xl leading-relaxed">
             Stake your ERC-721 assets to provide liquidity and earn passive <span className="text-white font-bold">$KIKI</span> rewards. 
             Current pool APY allows for <span className="font-mono text-green-400">0.01 KIKI/s</span> emission rate per asset.
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 左侧：闲置资产 (Inventory) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-500" /> Wallet Inventory ({idleNFTs.length})
              </h2>
            </div>
            
            {isLoading ? (
              <div className="text-center py-20 text-slate-500 font-mono text-sm">LOADING ASSETS...</div>
            ) : idleNFTs.length === 0 ? (
               <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-slate-500 bg-[#12141a]/50">
                 <p className="font-mono text-sm">NO ELIGIBLE ASSETS FOUND</p>
                 <Link href="/mint" className="text-xs text-blue-400 hover:underline mt-2 inline-block">Mint new assets &rarr;</Link>
               </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {idleNFTs.map(nft => (
                  <motion.div key={nft.id.tokenId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="bg-[#12141a] border-white/5 overflow-hidden group hover:border-green-500/30 transition-all">
                      <div className="aspect-square relative">
                        <img 
                          src={nft.media[0]?.gateway || '/kiki.png'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-100" 
                          onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                        {/* Overlay Button */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <Button onClick={() => handleStake(nft)} size="sm" className="bg-green-600 hover:bg-green-500 font-bold border border-green-400/20">
                            STAKE ASSET
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 border-t border-white/5 bg-[#0e1016]">
                        <h3 className="font-bold text-sm truncate text-slate-300">{nft.title || 'Unknown Asset'}</h3>
                        <p className="text-[10px] text-slate-600 font-mono">ID: {parseInt(nft.id.tokenId, 16)}</p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：活跃质押 (Active Staking) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" /> Active Staking ({activeStakingNFTs.length})
              </h2>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {activeStakingNFTs.length === 0 && !isLoading && (
                   <div className="p-12 border border-green-500/10 bg-green-500/5 rounded-2xl text-center">
                     <Database className="w-10 h-10 mx-auto mb-3 text-green-500/30" />
                     <p className="text-green-500/50 font-mono text-sm">STAKING POOL EMPTY</p>
                   </div>
                )}

                {activeStakingNFTs.map(nft => {
                  const record = stakedRecords.find(r => BigInt(r.token_id).toString() === BigInt(nft.id.tokenId).toString());
                  if (!record) return null;
                  
                  const rewards = liveRewards[record.token_id] || 0;
                  const isProcessing = processingIds.has(record.id);

                  return (
                    <motion.div 
                      key={nft.id.tokenId}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className={`relative overflow-hidden rounded-xl border p-4 flex items-center gap-5 transition-all ${
                        isProcessing 
                          ? 'border-white/5 bg-[#12141a] opacity-50' 
                          : 'border-green-500/20 bg-gradient-to-r from-[#12141a] to-green-900/10 hover:border-green-500/40'
                      }`}
                    >
                      {/* Active Indicator Line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isProcessing ? 'bg-slate-600' : 'bg-green-500'}`}></div>

                      {/* Image */}
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <img 
                          src={nft.media[0]?.gateway || '/kiki.png'} 
                          className={`w-full h-full object-cover ${isProcessing ? 'grayscale' : ''}`}
                          onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="font-bold text-sm text-slate-200 truncate">{nft.title}</h3>
                           {!isProcessing && (
                             <span className="flex h-2 w-2 relative">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                             </span>
                           )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-500 font-mono border border-white/5">
                             APY: 0.01/s
                           </span>
                           {isProcessing && (
                            <span className="text-[10px] flex items-center gap-1 text-blue-400">
                              <Loader2 className="w-3 h-3 animate-spin" /> CLAIMING
                            </span>
                           )}
                        </div>
                      </div>

                      {/* Rewards & Action */}
                      <div className="text-right">
                        <div className={`text-xl font-mono font-bold mb-1 flex items-center justify-end gap-2 ${isProcessing ? 'text-slate-500' : 'text-green-400'}`}>
                          {rewards.toFixed(4)} 
                          <Coins className="w-4 h-4" />
                        </div>
                        <button 
                          onClick={() => !isProcessing && handleClaim(record)}
                          disabled={isProcessing}
                          className={`text-[10px] font-bold tracking-wide uppercase px-3 py-1.5 rounded transition-colors ${
                             isProcessing 
                               ? 'text-slate-600 cursor-not-allowed' 
                               : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                          }`}
                        >
                          {isProcessing ? 'Processing...' : 'Claim Yield'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
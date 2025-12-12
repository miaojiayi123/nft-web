'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trees, Sparkles, Timer, Flame, Zap, Trophy, Coins, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';

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
  
  // 💰 liveRewards: 存储实时的 KIKI 奖励数量 (小数)
  const [liveRewards, setLiveRewards] = useState<Record<string, number>>({});
  
  // 记录正在结算中的 ID
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
    // 只查 active 的即可，因为 finished 的已经结算完了
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

  // 3. ⏱️ 实时计算 KIKI 奖励 (每秒 0.01)
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveRewards(prev => {
        const next = { ...prev };
        stakedRecords.forEach(record => {
          // 如果正在结算，不要更新数字，防止跳变
          if (processingIds.has(record.id)) return;

          const start = new Date(record.start_time).getTime();
          const now = new Date().getTime();
          const seconds = (now - start) / 1000;
          
          // ✨ 核心修改：每秒 0.01 枚
          // 保留 4 位小数方便展示
          next[record.token_id] = Math.floor(seconds * 0.01 * 10000) / 10000;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stakedRecords, processingIds]);

  // 4. 开始修行
  const handleStake = async (nft: NFT) => {
    if (nft.contract.address.toLowerCase() !== CONTRACT_ADDRESS) {
      alert("只能质押 Kiki NFT！");
      return;
    }
    const { error } = await supabase.from('staking').insert([{
      wallet_address: address,
      token_id: nft.id.tokenId,
      status: 'active'
    }]);
    if (!error) initData();
  };

  // 5. 💰 提取 KIKI (调用后端 API)
  const handleClaim = async (record: StakingRecord) => {
    if (processingIds.has(record.id)) return;
    
    setProcessingIds(prev => new Set(prev).add(record.id));
    
    try {
      // 调用我们刚写的 API
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
        throw new Error(result.error || '领取失败');
      }

      // 成功！
      alert(`🎉 成功领取 ${result.amount} KIKI！\n交易哈希: ${result.txHash.slice(0, 10)}...`);
      await initData(); // 刷新数据，NFT 会回到闲置区

    } catch (err: any) {
      console.error(err);
      alert(`出错了: ${err.message}`);
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
    <div className="min-h-screen bg-slate-950 text-white selection:bg-green-500/30">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-sm font-medium">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            返回控制台
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 flex items-center justify-center gap-4">
            <Trees className="w-12 h-12 text-green-500" /> 魔法森林修行
          </h1>
          <p className="text-slate-400 text-lg">
            派出 Kiki 修行，每秒产出 <span className="text-yellow-400 font-bold">0.01 $KIKI</span>。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 左侧：闲置区域 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-300">
                <Timer className="w-6 h-6" /> 闲置中 ({idleNFTs.length})
              </h2>
            </div>
            
            {isLoading ? (
              <div className="text-center py-20 text-slate-500">加载资产中...</div>
            ) : idleNFTs.length === 0 ? (
               <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 bg-slate-900/30">
                 没有闲置的 Kiki NFT
               </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {idleNFTs.map(nft => (
                  <motion.div key={nft.id.tokenId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="bg-slate-900 border-slate-800 overflow-hidden group hover:border-green-500/50 transition-all">
                      <div className="aspect-square relative">
                        <img 
                          src={nft.media[0]?.gateway || '/kiki.png'} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button onClick={() => handleStake(nft)} className="bg-green-600 hover:bg-green-700 font-bold">
                            开始修行
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-sm truncate text-slate-200">{nft.title}</h3>
                        <p className="text-xs text-slate-500">#{parseInt(nft.id.tokenId, 16)}</p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：修行区域 (活跃) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-green-400">
                <Flame className="w-6 h-6 animate-pulse" /> 修行中 ({activeStakingNFTs.length})
              </h2>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {activeStakingNFTs.length === 0 && !isLoading && (
                   <div className="p-12 border border-green-900/30 bg-green-900/10 rounded-2xl text-center text-green-600/50">
                     <Trees className="w-12 h-12 mx-auto mb-2 opacity-50" />
                     森林里空荡荡的...<br/>快把琪琪送进来！
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
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className={`relative overflow-hidden rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
                        isProcessing 
                          ? 'border-slate-700 bg-slate-900/50' 
                          : 'border-green-500/30 bg-gradient-to-r from-green-900/20 to-emerald-900/20'
                      }`}
                    >
                      {!isProcessing && (
                        <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 animate-pulse pointer-events-none"></div>
                      )}

                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-green-500/50 shrink-0">
                        <img 
                          src={nft.media[0]?.gateway || '/kiki.png'} 
                          className={`w-full h-full object-cover ${isProcessing ? 'grayscale' : ''}`}
                          onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold truncate ${isProcessing ? 'text-slate-500' : 'text-white'}`}>{nft.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {isProcessing ? (
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> 结算上链中...
                            </span>
                          ) : (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded flex items-center gap-1">
                              <Zap className="w-3 h-3" /> 正在挖矿
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-2xl font-mono font-bold drop-shadow-lg flex items-center justify-end gap-2 ${isProcessing ? 'text-slate-400' : 'text-yellow-400'}`}>
                          {rewards.toFixed(4)} 
                          <Coins className="w-4 h-4" />
                        </div>
                        <button 
                          onClick={() => !isProcessing && handleClaim(record)}
                          disabled={isProcessing}
                          className={`text-xs mt-1 transition-colors ${
                             isProcessing 
                               ? 'text-slate-600 cursor-not-allowed' 
                               : 'text-red-400 hover:text-red-300 underline'
                          }`}
                        >
                          {isProcessing ? '正在发送 $KIKI...' : '提取收益 (Claim)'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
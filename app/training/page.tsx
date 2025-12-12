'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trees, Sparkles, Timer, Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';

// 定义 NFT 类型
interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
}

// 定义质押记录类型
interface StakingRecord {
  id: number;
  token_id: string;
  start_time: string;
  earned_points: number;
}

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();
  
  // 状态
  const [ownedNfts, setOwnedNfts] = useState<NFT[]>([]); // 钱包里的
  const [stakedRecords, setStakedRecords] = useState<StakingRecord[]>([]); // 数据库里的
  const [isLoading, setIsLoading] = useState(true);
  const [livePoints, setLivePoints] = useState<Record<string, number>>({}); // 实时计算的积分

  // 1. 获取用户所有 NFT (Alchemy)
  const fetchNFTs = async () => {
    if (!address || !chain) return;
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      let networkPrefix = chain.id === 11155111 ? 'eth-sepolia' : 'eth-mainnet';
      const baseURL = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
      const url = `${baseURL}?owner=${address}&withMetadata=true`;
      
      const response = await fetch(url);
      const data = await response.json();
      return data.ownedNfts || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  // 2. 获取正在修行的记录 (Supabase)
  const fetchStakingStatus = async () => {
    if (!address) return;
    const { data } = await supabase
      .from('staking')
      .select('*')
      .eq('wallet_address', address)
      .eq('status', 'active');
    return data || [];
  };

  // 初始化数据
  const initData = async () => {
    setIsLoading(true);
    const [nfts, records] = await Promise.all([fetchNFTs(), fetchStakingStatus()]);
    
    if (nfts && records) {
      setOwnedNfts(nfts);
      setStakedRecords(records);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isConnected) initData();
  }, [isConnected, address]);

  // 3. 实时积分计算器 (每秒更新)
  useEffect(() => {
    const timer = setInterval(() => {
      const points: Record<string, number> = {};
      stakedRecords.forEach(record => {
        const start = new Date(record.start_time).getTime();
        const now = new Date().getTime();
        // 假设每秒获得 0.1 魔法值
        const seconds = (now - start) / 1000;
        points[record.token_id] = Math.floor(seconds * 1); // 1秒 = 1分
      });
      setLivePoints(points);
    }, 1000);

    return () => clearInterval(timer);
  }, [stakedRecords]);

  // 4. 开始修行 (Stake)
  const handleStake = async (nft: NFT) => {
    // 这里应该是签名逻辑，为了演示流畅直接存库
    const { error } = await supabase.from('staking').insert([{
      wallet_address: address,
      token_id: nft.id.tokenId,
      status: 'active'
    }]);

    if (!error) initData(); // 刷新
  };

  // 5. 结束修行 (Unstake)
  const handleUnstake = async (record: StakingRecord) => {
    // 结算积分 (这里只演示改变状态)
    const { error } = await supabase
      .from('staking')
      .update({ status: 'finished', earned_points: livePoints[record.token_id] })
      .eq('id', record.id);

    if (!error) {
      alert(`修行结束！你获得了 ${livePoints[record.token_id]} 点魔法值`);
      initData();
    }
  };

  // 过滤：区分哪些在修行，哪些闲置
  // 将 16 进制 ID 转为 10 进制字符串以便比对
  const stakedIds = stakedRecords.map(r => BigInt(r.token_id).toString());
  
  // 正在修行的 NFT 详细信息
  const activeStakingNFTs = ownedNfts.filter(nft => 
    stakedIds.includes(BigInt(nft.id.tokenId).toString())
  );
  
  // 闲置的 NFT
  const idleNFTs = ownedNfts.filter(nft => 
    !stakedIds.includes(BigInt(nft.id.tokenId).toString())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-green-500/30">
      
      {/* 顶部导航 */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group text-sm font-medium"
          >
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
            派出你的 Kiki 进行元素修行，每秒自动产出魔法值 (Magic Point)。
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
                 没有闲置的 NFT
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
                  const tokenIdDec = parseInt(nft.id.tokenId, 16);
                  // 找到对应的 record
                  const record = stakedRecords.find(r => BigInt(r.token_id).toString() === BigInt(nft.id.tokenId).toString());
                  // 找到实时积分
                  const points = record ? (livePoints[record.token_id] || 0) : 0;

                  return (
                    <motion.div 
                      key={nft.id.tokenId}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-4 flex items-center gap-4"
                    >
                      {/* 背景流光特效 */}
                      <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 animate-pulse pointer-events-none"></div>

                      {/* 图片 */}
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-green-500/50 shrink-0">
                        <img 
                          src={nft.media[0]?.gateway || '/kiki.png'} 
                          className="w-full h-full object-cover" 
                          onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                        {/* 粒子装饰 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Sparkles className="w-8 h-8 text-yellow-300 animate-spin-slow opacity-80" />
                        </div>
                      </div>

                      {/* 数据展示 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{nft.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded flex items-center gap-1">
                            <Zap className="w-3 h-3" /> 产出中
                          </span>
                        </div>
                      </div>

                      {/* 积分与操作 */}
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-yellow-400 drop-shadow-lg">
                          {points} <span className="text-xs text-yellow-600">XP</span>
                        </div>
                        <button 
                          onClick={() => record && handleUnstake(record)}
                          className="text-xs text-red-400 hover:text-red-300 underline mt-1"
                        >
                          提取并结算
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
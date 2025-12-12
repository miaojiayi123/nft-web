'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trees, Sparkles, Timer, Flame, Zap, Trophy, Coins } from 'lucide-react';
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
  status: string; // 'active' | 'finished'
}

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();
  
  // 状态
  const [ownedNfts, setOwnedNfts] = useState<NFT[]>([]); // 钱包里的
  const [stakedRecords, setStakedRecords] = useState<StakingRecord[]>([]); // 数据库里的(活跃)
  const [isLoading, setIsLoading] = useState(true);
  const [livePoints, setLivePoints] = useState<Record<string, number>>({}); // 实时计算的积分
  const [totalPoints, setTotalPoints] = useState(0); // ✨ 新增：用户总积分

  // 1. 获取用户所有 NFT (Alchemy)
  const fetchNFTs = async () => {
    if (!address || !chain) return;
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      let networkPrefix = 'eth-mainnet';
      if (chain.id === 11155111) networkPrefix = 'eth-sepolia';
      else if (chain.id === 1) networkPrefix = 'eth-mainnet';
      else return [];

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

  // 2. 获取所有修行记录 (Supabase) - 修改为获取全部记录以计算总分
  const fetchAllStakingData = async () => {
    if (!address) return { active: [], total: 0 };
    
    const { data } = await supabase
      .from('staking')
      .select('*')
      .eq('wallet_address', address);
      
    if (!data) return { active: [], total: 0 };

    // 筛选活跃记录
    const active = data.filter(r => r.status === 'active');
    
    // 计算已结束记录的总分
    const finished = data.filter(r => r.status === 'finished');
    const total = finished.reduce((sum, r) => sum + (r.earned_points || 0), 0);

    return { active, total };
  };

  // 初始化数据
  const initData = async () => {
    // 只有第一次加载显示 loading，后续静默刷新
    if (ownedNfts.length === 0) setIsLoading(true);
    
    const [nfts, stakingData] = await Promise.all([fetchNFTs(), fetchAllStakingData()]);
    
    if (nfts) setOwnedNfts(nfts);
    if (stakingData) {
      setStakedRecords(stakingData.active);
      setTotalPoints(stakingData.total);
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
        // 假设每秒获得 1 魔法值
        const seconds = (now - start) / 1000;
        points[record.token_id] = Math.floor(seconds * 1); 
      });
      setLivePoints(points);
    }, 1000);

    return () => clearInterval(timer);
  }, [stakedRecords]);

  // 4. 开始修行 (Stake)
  const handleStake = async (nft: NFT) => {
    const { error } = await supabase.from('staking').insert([{
      wallet_address: address,
      token_id: nft.id.tokenId,
      status: 'active'
    }]);

    if (!error) initData(); // 刷新
  };

  // 5. 结束修行 (Unstake) - ✨ 修改：移除 alert，静默结算
  const handleUnstake = async (record: StakingRecord) => {
    const currentPoints = livePoints[record.token_id] || 0;
    
    // 结算积分
    const { error } = await supabase
      .from('staking')
      .update({ status: 'finished', earned_points: currentPoints })
      .eq('id', record.id);

    if (!error) {
      // 这里的 initData 会重新拉取数据库，
      // 1. 将该记录从 stakedRecords (active) 移除 -> NFT 回到左边
      // 2. 将该记录积分计入 totalPoints -> 顶部总分自动增加
      initData();
    }
  };

  // 过滤：区分哪些在修行，哪些闲置
  const stakedIds = stakedRecords.map(r => BigInt(r.token_id).toString());
  
  const activeStakingNFTs = ownedNfts.filter(nft => 
    stakedIds.includes(BigInt(nft.id.tokenId).toString())
  );
  
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
          
          {/* ✨ 新增：顶部积分展示 */}
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-full">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-100">
              持有积分: <span className="text-yellow-400">{totalPoints}</span> XP
            </span>
          </div>

          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16 relative">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 flex items-center justify-center gap-4">
            <Trees className="w-12 h-12 text-green-500" /> 魔法森林修行
          </h1>
          <p className="text-slate-400 text-lg">
            派出你的 Kiki 进行元素修行，每秒自动产出魔法值 (Magic Point)。
          </p>
          
          {/* ✨ 装饰：总分统计大卡片 */}
          <div className="absolute top-0 right-0 hidden lg:block">
             <div className="bg-slate-900/50 border border-white/10 p-4 rounded-xl text-left backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Trophy className="w-3 h-3" /> 累计获得
                </div>
                <div className="text-2xl font-bold text-white">{totalPoints} <span className="text-sm text-slate-500">XP</span></div>
             </div>
          </div>
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
                  const record = stakedRecords.find(r => BigInt(r.token_id).toString() === BigInt(nft.id.tokenId).toString());
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
                        {/* 这里的 onClick 不再有 alert */}
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
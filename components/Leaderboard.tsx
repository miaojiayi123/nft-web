'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Medal, Crown, Flame, Layers, Loader2, Users } from 'lucide-react';

// ✅ 你的合约地址
const CONTRACT_ADDRESS = '0x5476dA4fc12BE1d6694d4F8FCcc6beC67eFBFf93'; 

// 定义排行榜数据结构
interface LeaderboardItem {
  wallet_address: string;
  balance: number;      // 链上：持有数量
  total_score: number;  // 数据库：积分
}

const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;

const formatAddress = (addr: string) => 
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initLeaderboard = async () => {
      try {
        // 1. 获取链上所有持有者 (使用 Alchemy API)
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        // 注意：根据你的网络选择 eth-sepolia 或 eth-mainnet
        const network = 'eth-sepolia'; 
        const baseURL = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getOwnersForContract`;
        // withTokenBalances=true 会返回余额，非常方便
        const url = `${baseURL}?contractAddress=${CONTRACT_ADDRESS}&withTokenBalances=true`;

        const alchemyRes = await fetch(url);
        const alchemyData = await alchemyRes.json();
        
        // alchemyData.owners 包含: [{ ownerAddress: "0x...", tokenBalances: [...] }, ...]
        const owners = alchemyData.owners || [];

        // 2. 获取数据库积分 (Supabase)
        const { data: scores } = await supabase
          .from('leaderboard_view')
          .select('*');

        // 3. 数据合并 (Merge)
        // 创建一个 Map 方便查找积分: address -> score
        const scoreMap = new Map();
        scores?.forEach((s: any) => {
          scoreMap.set(s.wallet_address.toLowerCase(), s.total_score);
        });

        const mergedData: LeaderboardItem[] = owners.map((owner: any) => {
          const address = owner.ownerAddress;
          // Alchemy 返回的 balance 是 tokenBalances 数组的长度
          const balance = owner.tokenBalances?.length || 0;
          const score = scoreMap.get(address.toLowerCase()) || 0;

          return {
            wallet_address: address,
            balance: balance,
            total_score: score
          };
        });

        // 4. 排序规则：持有量优先，积分为辅
        mergedData.sort((a, b) => {
          if (b.balance !== a.balance) {
            return b.balance - a.balance; // 持有量高的在前
          }
          return b.total_score - a.total_score; // 持有量一样，分高的在前
        });

        // 只取前 20 名展示
        setLeaders(mergedData.slice(0, 20));

      } catch (error) {
        console.error('Failed to load leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    initLeaderboard();
  }, []);

  // 渲染排名图标 (前三名特殊)
  const renderRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-pulse" />;
    if (index === 1) return <Medal className="w-6 h-6 text-slate-300 fill-slate-300" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
    return <span className="text-slate-500 font-bold w-6 text-center">{index + 1}</span>;
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500 flex items-center justify-center gap-3">
          <Users className="w-8 h-8 text-yellow-400" /> 公会成员名册
        </h2>
        <p className="text-slate-400 mt-2">
          当前共有 <span className="text-white font-bold">{leaders.length}</span> 位核心持有者 • 实时链上数据
        </p>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider items-center">
          <div className="col-span-2 text-center">排名</div>
          <div className="col-span-6 md:col-span-6">成员地址</div>
          <div className="col-span-2 md:col-span-2 text-center flex items-center justify-center gap-1 text-blue-400">
            <Layers className="w-3 h-3" /> 持有量
          </div>
          <div className="col-span-2 md:col-span-2 text-right flex items-center justify-end gap-1 text-yellow-500">
            <Flame className="w-3 h-3" /> 贡献分
          </div>
        </div>

        {/* 列表内容 */}
        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span>正在扫描链上资产...</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              还没有人持有 Kiki NFT，快去铸造第一个！
            </div>
          ) : (
            leaders.map((leader, index) => (
              <div 
                key={leader.wallet_address} 
                className={`grid grid-cols-12 gap-4 p-4 items-center transition-all duration-300 hover:bg-white/5 group
                  ${index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}
                  ${index === 1 ? 'bg-gradient-to-r from-slate-500/10 to-transparent' : ''}
                  ${index === 2 ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : ''}
                `}
              >
                {/* 1. 排名 */}
                <div className="col-span-2 flex justify-center scale-100 group-hover:scale-110 transition-transform">
                  {renderRankIcon(index)}
                </div>

                {/* 2. 用户信息 */}
                <div className="col-span-6 md:col-span-6 flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={getAvatarUrl(leader.wallet_address)} 
                      alt="Avatar" 
                      className={`w-10 h-10 rounded-full bg-slate-800 object-cover border-2 
                        ${index === 0 ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 
                          index === 1 ? 'border-slate-300' : 
                          index === 2 ? 'border-amber-600' : 'border-transparent'}`} 
                    />
                    {/* 冠亚军特效 */}
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-slate-900 animate-ping" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`font-mono text-sm md:text-base font-medium truncate ${index < 3 ? 'text-white' : 'text-slate-300'}`}>
                      {formatAddress(leader.wallet_address)}
                    </span>
                    {index === 0 && <span className="text-[10px] text-yellow-500 font-bold">TOP HOLDER</span>}
                  </div>
                </div>

                {/* 3. 持有量 (高亮显示，因为是排序主键) */}
                <div className="col-span-2 md:col-span-2 text-center">
                  <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-sm font-bold text-blue-300">
                    {leader.balance}
                  </span>
                </div>

                {/* 4. 积分 */}
                <div className="col-span-2 md:col-span-2 text-right">
                  <span className={`font-bold font-mono text-lg
                    ${index === 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {leader.total_score.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Medal, Crown, Flame, Layers, Loader2, Users, AlertCircle } from 'lucide-react';

// ✅ 你的合约地址
const CONTRACT_ADDRESS = '0x5476dA4fc12BE1d6694d4F8FCcc6beC67eFBFf93'; 

interface LeaderboardItem {
  wallet_address: string;
  balance: number;
  total_score: number;
}

const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;

const formatAddress = (addr: string) => 
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>(""); 

  useEffect(() => {
    const initLeaderboard = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        const network = 'eth-sepolia'; 
        const baseURL = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getOwnersForContract`;
        const url = `${baseURL}?contractAddress=${CONTRACT_ADDRESS}&withTokenBalances=true`;

        // 1. 请求 Alchemy
        const alchemyRes = await fetch(url);
        if (!alchemyRes.ok) throw new Error(`Alchemy API Error: ${alchemyRes.status}`);
        
        const alchemyData = await alchemyRes.json();
        
        // 🛠️ 修复点：这里优先读取 ownerAddresses，如果没有再尝试 owners
        // 根据你提供的 JSON，数据肯定在 ownerAddresses 里
        const owners = alchemyData.ownerAddresses || alchemyData.owners || [];
        
        console.log("📦 成功获取持有者数据:", owners);

        if (owners.length === 0) {
          setDebugInfo("API 返回列表为空。请确认合约地址和网络是否正确。");
        }

        // 2. 请求 Supabase 积分
        const { data: scores } = await supabase.from('leaderboard_view').select('*');
        
        const scoreMap = new Map();
        scores?.forEach((s: any) => {
          scoreMap.set(s.wallet_address.toLowerCase(), s.total_score);
        });

        // 3. 数据解析与合并
        const mergedData: LeaderboardItem[] = owners.map((owner: any) => {
          let address = "";
          let balance = 0;

          // 处理你提供的 JSON 结构: { "ownerAddress": "...", "tokenBalances": [...] }
          if (owner.ownerAddress) {
            address = owner.ownerAddress;
            balance = owner.tokenBalances?.length || 0;
          } 
          // 兼容旧格式 (如果只是字符串数组)
          else if (typeof owner === 'string') {
            address = owner;
            balance = 1;
          }

          if (!address) return null;

          const score = scoreMap.get(address.toLowerCase()) || 0;

          return {
            wallet_address: address,
            balance: balance,
            total_score: score
          };
        }).filter((item: LeaderboardItem | null): item is LeaderboardItem => item !== null);

        // 4. 排序：持有量优先，积分为辅
        mergedData.sort((a, b) => {
          if (b.balance !== a.balance) return b.balance - a.balance;
          return b.total_score - a.total_score;
        });

        setLeaders(mergedData.slice(0, 20));

      } catch (error: any) {
        console.error('Failed:', error);
        setDebugInfo(error.message);
      } finally {
        setLoading(false);
      }
    };

    initLeaderboard();
  }, []);

  // 图标渲染
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
        
        {/* 调试信息 */}
        {leaders.length === 0 && !loading && (
          <div className="mt-4 inline-block bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg text-sm text-slate-400">
            <div className="flex items-center gap-2 mb-1 text-yellow-500">
              <AlertCircle className="w-4 h-4" /> 暂无上榜数据
            </div>
            {debugInfo && <p className="text-xs text-red-400">{debugInfo}</p>}
          </div>
        )}
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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

        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span>正在扫描链上资产...</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p>列表为空</p>
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
                <div className="col-span-2 flex justify-center scale-100 group-hover:scale-110 transition-transform">
                  {renderRankIcon(index)}
                </div>
                <div className="col-span-6 md:col-span-6 flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={getAvatarUrl(leader.wallet_address)} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full bg-slate-800 object-cover border-2 border-transparent" 
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-sm md:text-base font-medium truncate text-white">
                      {formatAddress(leader.wallet_address)}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-2 text-center">
                  <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-sm font-bold text-blue-300">
                    {leader.balance}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-2 text-right">
                  <span className="font-bold font-mono text-lg text-yellow-400">
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
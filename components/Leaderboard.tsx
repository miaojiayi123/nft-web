'use client';

import React, { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { Trophy, Medal, Crown, Layers, Loader2, AlertCircle } from 'lucide-react';
import { formatEther } from 'viem';

// 🔴 1. NFT 合约地址 (使用你提供的最新地址)
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

// 🔴 2. KIKI 代币合约地址
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

// ERC-20 ABI
const tokenAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface LeaderboardItem {
  wallet_address: string;
  nft_balance: number;
  token_balance: number;
}

const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;

const formatAddress = (addr: string) => 
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nftHolders, setNftHolders] = useState<{address: string, balance: number}[]>([]);

  // 1. 获取 NFT 持有者 (Alchemy)
  useEffect(() => {
    const fetchNftHolders = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        const network = 'eth-sepolia'; 
        const baseURL = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getOwnersForContract`;
        const url = `${baseURL}?contractAddress=${NFT_CONTRACT}&withTokenBalances=true`;

        const res = await fetch(url);
        const data = await res.json();
        const owners = data.ownerAddresses || data.owners || [];
        
        const parsedHolders = owners.map((owner: any) => {
          let address = "";
          let balance = 0;
          if (owner.ownerAddress) {
            address = owner.ownerAddress;
            balance = owner.tokenBalances?.length || 0;
          } else if (typeof owner === 'string') {
            address = owner;
            balance = 1;
          }
          return address ? { address, balance } : null;
        }).filter((item: any) => item !== null);

        setNftHolders(parsedHolders);
        // 如果没人持有，直接结束 loading
        if (parsedHolders.length === 0) setLoading(false);

      } catch (error) {
        console.error("Alchemy Fetch Error:", error);
        setLoading(false);
      }
    };

    fetchNftHolders();
  }, []);

  // 2. 批量读取 KIKI 代币余额
  const { data: tokenBalances, isLoading: isReadingChain } = useReadContracts({
    contracts: nftHolders.map(holder => ({
      address: TOKEN_CONTRACT as `0x${string}`,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [holder.address as `0x${string}`],
    })),
    query: {
      enabled: nftHolders.length > 0, 
    }
  });

  // 3. 合并数据 & 排序
  useEffect(() => {
    if (nftHolders.length > 0 && tokenBalances) {
      const mergedData = nftHolders.map((holder, index) => {
        const balanceResult = tokenBalances[index];
        const rawBalance = balanceResult?.status === 'success' ? balanceResult.result : 0n;
        // 格式化：wei -> ether
        const tokenBalance = Math.floor(Number(formatEther(rawBalance as bigint)));

        return {
          wallet_address: holder.address,
          nft_balance: holder.balance,
          token_balance: tokenBalance
        };
      });

      // 排序规则：代币余额优先
      mergedData.sort((a, b) => {
        if (b.token_balance !== a.token_balance) return b.token_balance - a.token_balance;
        return b.nft_balance - a.nft_balance;
      });

      setLeaders(mergedData.slice(0, 20));
      setLoading(false);
    }
  }, [nftHolders, tokenBalances]);

  // 渲染排名图标
  const renderRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-pulse" />;
    if (index === 1) return <Medal className="w-6 h-6 text-slate-300 fill-slate-300" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
    return <span className="text-slate-500 font-bold w-6 text-center">{index + 1}</span>;
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
          {/* Logo */}
          <img 
            src="/kiki.png" 
            alt="Kiki Logo" 
            className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] hover:scale-110 transition-transform duration-300" 
          />
          {/* ✅ 英文标题 */}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500 font-mono">
            TOP TOKEN HOLDERS
          </span>
        </h2>
        <p className="text-slate-400 mt-2 font-mono text-sm">
          Ranking by <span className="text-yellow-400 font-bold">$KIKI</span> Balance • Real-time On-chain Data
        </p>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-wider items-center font-mono">
          <div className="col-span-2 text-center">RANK</div>
          <div className="col-span-6 md:col-span-6">MEMBER</div>
          <div className="col-span-2 md:col-span-2 text-center flex items-center justify-center gap-1 text-blue-400">
            <Layers className="w-3 h-3" /> NFTs
          </div>
          <div className="col-span-2 md:col-span-2 text-right flex items-center justify-end gap-1 text-yellow-500">
            <img src="/kiki.png" alt="Token" className="w-4 h-4 object-contain" /> 
            $KIKI
          </div>
        </div>

        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading || isReadingChain ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="text-sm font-mono">SYNCING CHAIN DATA...</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-600" />
              <p className="font-mono">NO DATA FOUND</p>
              <p className="text-xs text-slate-600">Mint an NFT to appear on the leaderboard</p>
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
                {/* 排名 */}
                <div className="col-span-2 flex justify-center scale-100 group-hover:scale-110 transition-transform">
                  {renderRankIcon(index)}
                </div>

                {/* 成员地址 */}
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

                {/* NFT 持有量 */}
                <div className="col-span-2 md:col-span-2 text-center">
                  <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-sm font-bold text-blue-300 font-mono">
                    {leader.nft_balance}
                  </span>
                </div>

                {/* KIKI 余额 */}
                <div className="col-span-2 md:col-span-2 text-right">
                  <span className="font-bold font-mono text-lg text-yellow-400">
                    {leader.token_balance.toLocaleString()}
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
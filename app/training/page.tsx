'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, BrainCircuit, Play, Loader2, 
  Timer, Database, RefreshCw, Wallet, LayoutGrid 
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import TokenBalance from '@/components/TokenBalance';
import { logActivity } from '@/lib/logger'; 

// NFT 合约
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
}

interface StakingRecord {
  token_id: string;
  staked_at: string; 
}

// 辅助函数：清理 Token ID (去零，转十进制)
const formatTokenId = (rawId: string) => {
  try {
    return BigInt(rawId).toString();
  } catch (e) {
    return rawId;
  }
};

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();

  // State
  const [walletNfts, setWalletNfts] = useState<NFT[]>([]); 
  const [stakedNfts, setStakedNfts] = useState<StakingRecord[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // 初始化数据
  const initData = async () => {
    if (!address) return;
    setIsLoading(true);

    try {
      // 1. 获取钱包内所有 NFT (Alchemy)
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!apiKey) {
        console.error("Missing Alchemy API Key");
        return;
      }

      const networkPrefix = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      const url = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true`;
      
      const resNft = await fetch(url);
      const dataNft = await resNft.json();
      const allNfts: NFT[] = dataNft.ownedNfts || [];

      // 2. 获取已质押记录 (Supabase)
      const { data: stakingData, error: dbError } = await supabase
        .from('staking')
        .select('*')
        .eq('wallet_address', address);

      if (dbError) {
        console.error("Supabase Error:", dbError);
        return;
      }

      // 前端去重 (防止数据库有脏数据导致显示多条重复 ID)
      const uniqueRecords = new Map();
      (stakingData || []).forEach((item: any) => {
        const cleanId = formatTokenId(item.token_id);
        if (!uniqueRecords.has(cleanId)) {
          uniqueRecords.set(cleanId, item);
        }
      });
      const stakedRecords = Array.from(uniqueRecords.values()) as StakingRecord[];

      setStakedNfts(stakedRecords);

      // 3. 过滤出“未质押”的
      // 我们用 Set 存储已质押的 clean ID
      const stakedIdSet = new Set(stakedRecords.map(r => formatTokenId(r.token_id)));
      
      const available = allNfts.filter(nft => {
        // Alchemy 返回的是 hex (0x1)，我们也转成 clean decimal (1) 来比对
        const cleanId = formatTokenId(nft.id.tokenId);
        return !stakedIdSet.has(cleanId);
      });
      
      setWalletNfts(available);

    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) initData();
  }, [isConnected, address]);

  // --- 动作：质押 (Stake) ---
  const handleStake = async (nft: NFT) => {
    if (!address) return;
    // 强制转为十进制字符串存储，避免存入 0x...
    const tokenIdDec = BigInt(nft.id.tokenId).toString();

    // 写入 Supabase
    const { error } = await supabase
      .from('staking')
      .insert([
        { 
          wallet_address: address, 
          token_id: tokenIdDec,
          staked_at: new Date().toISOString()
        }
      ]);

    if (!error) {
      await logActivity({
        address,
        type: 'STAKE',
        details: `Staked Token #${tokenIdDec}`
      });
      initData();
    } else {
      alert("Staking failed: " + error.message);
    }
  };

  // --- 动作：计算收益 (只读) ---
  const calculateReward = (stakedAt: string) => {
    const start = new Date(stakedAt).getTime();
    const now = Date.now();
    const seconds = (now - start) / 1000;
    return (seconds * 0.01).toFixed(4);
  };

  // --- 动作：提取收益 (Claim Yield) ---
  const handleClaimReward = async (record: StakingRecord) => {
    if (!address) return;
    setClaimingId(record.token_id);

    try {
      const reward = calculateReward(record.staked_at);
      
      const response = await fetch('/api/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address, 
          amount: reward, 
          tokenId: record.token_id 
        })
      });
      
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Claim failed');

      await supabase
        .from('staking')
        .update({ staked_at: new Date().toISOString() })
        .eq('wallet_address', address)
        .eq('token_id', record.token_id);

      await logActivity({
        address,
        type: 'CLAIM',
        details: `Yield: ${reward} KIKI`,
        hash: result.txHash 
      });

      alert(`Claimed ${reward} KIKI successfully!`);
      initData();

    } catch (error: any) {
      console.error(error);
      alert("Claim Error: " + error.message);
    } finally {
      setClaimingId(null);
    }
  };

  // --- 动作：解除质押 (Unstake) ---
  const handleUnstake = async (record: StakingRecord) => {
     if (!address) return;
     const { error } = await supabase
       .from('staking')
       .delete()
       .eq('wallet_address', address)
       .eq('token_id', record.token_id);

     if (!error) {
       await logActivity({
         address,
         type: 'TRANSFER', 
         details: `Unstaked Token #${formatTokenId(record.token_id)}`
       });
       initData();
     } else {
       alert("Unstake failed");
     }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 selection:bg-blue-500/30 font-sans">
      
      {/* 背景底噪 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-900/10 rounded-full blur-[120px] mix-blend-screen" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] mix-blend-screen" />
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-white transition-colors mb-2 uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-3 w-3" /> RETURN TO DASHBOARD
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-green-500" />
              Yield Farming
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-[#12141a]/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
            <TokenBalance />
            <ConnectButton />
          </div>
        </header>

        {/* Content Grid: 左右布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* ✅ 1. 左侧：Available to Stake (钱包里的) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Wallet className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white">Available to Stake</h2>
              <button onClick={initData} className="ml-auto text-slate-500 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4"/>
              </button>
            </div>

            {/* 可质押列表容器：限制高度，启用滚动 */}
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {walletNfts.map(nft => {
                  const tokenId = formatTokenId(nft.id.tokenId);
                  return (
                    <motion.div 
                      key={tokenId} 
                      whileHover={{ scale: 1.02 }} 
                      className="bg-[#12141a] border border-white/5 rounded-xl overflow-hidden group cursor-pointer relative" 
                      onClick={() => handleStake(nft)}
                    >
                      <div className="aspect-square bg-slate-800 relative">
                        <img 
                          src={nft.media?.[0]?.gateway || '/kiki.png'} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                        />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <span className="bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                            <Play className="w-3 h-3 fill-current" /> STAKE
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-[#0e1016]">
                         <div className="text-xs font-bold text-white truncate">#{tokenId}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {walletNfts.length === 0 && !isLoading && (
                 <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-xl bg-white/5 text-center">
                   <LayoutGrid className="w-8 h-8 text-slate-600 mb-2" />
                   <p className="text-slate-500 text-sm">No unstaked assets found.</p>
                   <Link href="/mint" className="text-blue-400 text-xs hover:underline mt-2">Go Mint Genesis Asset &rarr;</Link>
                 </div>
              )}
            </div>
          </div>

          {/* ✅ 2. 右侧：Active Staking (已质押的) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Database className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-white">Active Staking</h2>
              <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded ml-auto font-mono border border-green-500/20">
                APY: 0.01 KIKI/s
              </span>
            </div>

            {/* 已质押列表容器：限制高度，启用滚动 */}
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {isLoading ? (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm gap-3">
                    <Loader2 className="animate-spin w-6 h-6 text-green-500"/> 
                    Syncing on-chain data...
                 </div>
              ) : stakedNfts.length === 0 ? (
                 <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-sm bg-white/5">
                   No assets currently earning yield.
                 </div>
              ) : (
                 stakedNfts.map(record => {
                   // 确保显示干净的 ID (去掉 0000002 这种前面的 0)
                   const cleanId = formatTokenId(record.token_id);
                   
                   return (
                     <div key={record.token_id} className="bg-[#12141a] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-green-500/30 transition-all hover:bg-white/[0.02]">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 font-bold font-mono border border-green-500/20">
                            #{cleanId}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">Genesis Asset</div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-1">
                               <Timer className="w-3 h-3 text-slate-400" />
                               <span className="text-green-400/80">Yield: {calculateReward(record.staked_at)}</span>
                            </div>
                          </div>
                       </div>
                       <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleClaimReward(record)}
                            disabled={!!claimingId}
                            className="bg-white text-black hover:bg-slate-200 font-bold text-[10px] h-8 px-4"
                          >
                            {claimingId === record.token_id ? <Loader2 className="w-3 h-3 animate-spin"/> : "CLAIM"}
                          </Button>
                          <Button 
                            size="sm" variant="outline"
                            onClick={() => handleUnstake(record)}
                            className="border-white/10 text-slate-400 hover:text-white hover:border-white/30 text-[10px] h-8 px-3"
                          >
                            UNSTAKE
                          </Button>
                       </div>
                     </div>
                   )
                 })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
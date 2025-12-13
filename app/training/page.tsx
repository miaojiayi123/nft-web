'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, BrainCircuit, Play, Loader2, 
  Timer, Database, RefreshCw, Wallet 
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

      // 默认使用 Sepolia，如果是主网则切换
      const networkPrefix = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      const url = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true`;
      
      const resNft = await fetch(url);
      const dataNft = await resNft.json();
      
      // 这里的 ownedNfts 可能为空
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

      const stakedRecords = (stakingData || []) as StakingRecord[];
      setStakedNfts(stakedRecords);

      // 3. 过滤逻辑：从 Alchemy 返回的 NFT 中，剔除掉已经在数据库中记录为“质押”的 ID
      // 注意：这里的假设是“软质押”，即 NFT 还在钱包里，但数据库标记为质押。
      // 如果你做了合约质押（NFT转走了），Alchemy 本身就不会返回转走的 NFT，这一步过滤就是多余但无害的。
      const stakedIds = new Set(stakedRecords.map(r => r.token_id));
      const available = allNfts.filter(nft => {
        const tokenId = parseInt(nft.id.tokenId, 16).toString();
        return !stakedIds.has(tokenId);
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
    const tokenIdDec = parseInt(nft.id.tokenId, 16).toString();

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
      // 记录日志
      await logActivity({
        address,
        type: 'STAKE',
        details: `Staked Token #${tokenIdDec}`
      });

      // 刷新界面
      initData();
    } else {
      console.error("Staking Insert Error:", error);
      alert("Staking failed: " + error.message);
    }
  };

  // --- 动作：计算收益 (只读) ---
  const calculateReward = (stakedAt: string) => {
    const start = new Date(stakedAt).getTime();
    const now = Date.now();
    const seconds = (now - start) / 1000;
    // 速率：0.01 KIKI / 秒
    return (seconds * 0.01).toFixed(4);
  };

  // --- 动作：提取收益 (Claim Yield) ---
  const handleClaimReward = async (record: StakingRecord) => {
    if (!address) return;
    setClaimingId(record.token_id);

    try {
      const reward = calculateReward(record.staked_at);
      
      // 调用你的后端 API 发放代币
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

      // 重置质押时间
      await supabase
        .from('staking')
        .update({ staked_at: new Date().toISOString() })
        .eq('wallet_address', address)
        .eq('token_id', record.token_id);

      // 记录日志
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
         details: `Unstaked Token #${record.token_id}`
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

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 左侧：已质押 (Staked) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Database className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-white">Active Staking</h2>
              <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded ml-auto font-mono">
                APY: 0.01 KIKI/s
              </span>
            </div>

            {isLoading ? (
               <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="animate-spin w-4 h-4"/> Syncing data...</div>
            ) : stakedNfts.length === 0 ? (
               <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-sm">
                 No assets currently staked.
               </div>
            ) : (
               <div className="grid gap-4">
                 {stakedNfts.map(record => (
                   <div key={record.token_id} className="bg-[#12141a] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-green-500/30 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 font-bold font-mono">
                          #{record.token_id}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Genesis Asset</div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                             <Timer className="w-3 h-3" />
                             Earning: {calculateReward(record.staked_at)} KIKI
                          </div>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleClaimReward(record)}
                          disabled={!!claimingId}
                          className="bg-white text-black hover:bg-slate-200 font-bold text-xs"
                        >
                          {claimingId === record.token_id ? <Loader2 className="w-3 h-3 animate-spin"/> : "CLAIM"}
                        </Button>
                        <Button 
                          size="sm" variant="outline"
                          onClick={() => handleUnstake(record)}
                          className="border-white/10 text-slate-400 hover:text-white text-xs"
                        >
                          UNSTAKE
                        </Button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* 右侧：钱包内 (Wallet) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Wallet className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white">Available to Stake</h2>
              <button onClick={initData} className="ml-auto text-slate-500 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {walletNfts.map(nft => {
                const tokenId = parseInt(nft.id.tokenId, 16).toString();
                return (
                  <motion.div key={tokenId} whileHover={{ scale: 1.02 }} className="bg-[#12141a] border border-white/5 rounded-xl overflow-hidden group cursor-pointer" onClick={() => handleStake(nft)}>
                    <div className="aspect-square bg-slate-800 relative">
                      <img 
                        src={nft.media?.[0]?.gateway || '/kiki.png'} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <Play className="w-3 h-3 fill-current" /> STAKE
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                       <div className="text-xs font-bold text-white">Token #{tokenId}</div>
                    </div>
                  </motion.div>
                )
              })}
              {walletNfts.length === 0 && !isLoading && (
                 <div className="col-span-2 text-center py-10 text-slate-500 text-sm">
                   No unstaked Genesis assets found. <br/>
                   <Link href="/mint" className="text-blue-400 hover:underline">Go Mint One &rarr;</Link>
                 </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
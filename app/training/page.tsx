'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, BrainCircuit, Play, Loader2, 
  Timer, Database, RefreshCw, Wallet, LayoutGrid, Coins
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

// 辅助函数：清理 Token ID
const formatTokenId = (rawId: string) => {
  try {
    return BigInt(rawId).toString();
  } catch (e) {
    return rawId;
  }
};

// --- ✅ 新增：实时跳动的收益数字组件 ---
const LiveYield = ({ stakedAt }: { stakedAt: string }) => {
  const [reward, setReward] = useState('0.0000');

  useEffect(() => {
    // 立即执行一次
    const update = () => {
      const start = new Date(stakedAt).getTime();
      const now = Date.now();
      const seconds = (now - start) / 1000;
      // 0.01 KIKI per second
      setReward((seconds * 0.01).toFixed(4));
    };
    update();

    // 每 100ms 刷新一次，产生“跳动”的视觉效果
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [stakedAt]);

  return (
    <span className="font-mono text-green-400 font-bold tabular-nums tracking-wide">
      {reward}
    </span>
  );
};

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();

  // State
  const [walletNfts, setWalletNfts] = useState<NFT[]>([]); 
  const [stakedNfts, setStakedNfts] = useState<StakingRecord[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null); // 统一管理 loading 状态 (Claim 或 Unstake)

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

      // 前端去重
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
      const stakedIdSet = new Set(stakedRecords.map(r => formatTokenId(r.token_id)));
      
      const available = allNfts.filter(nft => {
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
    const tokenIdDec = BigInt(nft.id.tokenId).toString();

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

  // --- 动作：计算当前收益 (静态函数，用于逻辑计算) ---
  const getRewardValue = (stakedAt: string) => {
    const start = new Date(stakedAt).getTime();
    const now = Date.now();
    const seconds = (now - start) / 1000;
    return (seconds * 0.01).toFixed(4); // 字符串格式
  };

  // --- 动作：单独提取收益 (Claim Yield) ---
  const handleClaimReward = async (record: StakingRecord) => {
    if (!address) return;
    setProcessingId(record.token_id); // Lock button

    try {
      const reward = getRewardValue(record.staked_at);
      
      // 如果收益太少 (< 0.0001)，就不发请求了，省 Gas
      if (parseFloat(reward) <= 0) {
        alert("Rewards accumulate over time. Please wait a bit longer.");
        return;
      }

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

      // 更新质押时间为“现在”
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

      // 成功提示
      alert(`Success! ${reward} KIKI sent to wallet.`);
      initData();

    } catch (error: any) {
      console.error(error);
      alert("Claim Error: " + error.message);
    } finally {
      setProcessingId(null); // Unlock
    }
  };

  // --- ✅ 动作：解除质押 (Auto Claim + Unstake) ---
  const handleUnstake = async (record: StakingRecord) => {
     if (!address) return;
     if (!confirm("Confirm to Unstake? We will automatically claim your pending rewards first.")) return;

     setProcessingId(record.token_id); // Lock button

     try {
       // 1. 先尝试领取收益 (Auto Claim)
       const reward = getRewardValue(record.staked_at);
       
       if (parseFloat(reward) > 0) {
         console.log(`[Unstake] Auto-claiming ${reward} KIKI...`);
         
         const claimRes = await fetch('/api/claim-reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, amount: reward, tokenId: record.token_id })
         });

         const claimResult = await claimRes.json();
         
         if (claimRes.ok) {
            // 记录领取日志
            await logActivity({
              address,
              type: 'CLAIM',
              details: `Yield: ${reward} KIKI (Auto)`,
              hash: claimResult.txHash
            });
         } else {
            // 如果发币失败，是否继续？
            // 为了保护用户利益，通常应该报错并停止 Unstake
            throw new Error(`Auto-claim failed: ${claimResult.error}. Unstake aborted.`);
         }
       }

       // 2. 收益领取成功后，安全删除数据库记录
       const { error } = await supabase
         .from('staking')
         .delete()
         .eq('wallet_address', address)
         .eq('token_id', record.token_id);

       if (error) throw error;

       // 3. 记录解除质押日志
       await logActivity({
         address,
         type: 'TRANSFER', 
         details: `Unstaked Token #${formatTokenId(record.token_id)}`
       });

       alert("Unstaked successfully!");
       initData();

     } catch (error: any) {
       console.error(error);
       alert("Unstake Failed: " + error.message);
     } finally {
       setProcessingId(null);
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

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* 左侧：Available to Stake (钱包里的) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Wallet className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white">Available to Stake</h2>
              <button onClick={initData} className="ml-auto text-slate-500 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4"/>
              </button>
            </div>

            {/* 容器 */}
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

          {/* 右侧：Active Staking (已质押的) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Database className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-white">Active Staking</h2>
              <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded ml-auto font-mono border border-green-500/20">
                APY: 0.01 KIKI/s
              </span>
            </div>

            {/* 容器 */}
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
                   const cleanId = formatTokenId(record.token_id);
                   const isProcessing = processingId === record.token_id;
                   
                   return (
                     <div key={record.token_id} className="bg-[#12141a] border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between group hover:border-green-500/30 transition-all hover:bg-white/[0.02] gap-4">
                       
                       <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 font-bold font-mono border border-green-500/20 shrink-0">
                            #{cleanId}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">Genesis Asset</div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-1">
                               <Coins className="w-3 h-3 text-yellow-500" />
                               {/* ✅ 使用 LiveYield 组件实现跳动数字 */}
                               Pending: <LiveYield stakedAt={record.staked_at} /> KIKI
                            </div>
                          </div>
                       </div>

                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button 
                            size="sm" 
                            onClick={() => handleClaimReward(record)}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-white text-black hover:bg-slate-200 font-bold text-[10px] h-9 px-4"
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : "CLAIM"}
                          </Button>
                          <Button 
                            size="sm" variant="outline"
                            onClick={() => handleUnstake(record)}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none border-white/10 text-slate-400 hover:text-white hover:border-white/30 text-[10px] h-9 px-3"
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
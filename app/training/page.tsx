'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, BrainCircuit, Play, Loader2, 
  Database, RefreshCw, Wallet, Coins, AlertTriangle, X,
  LayoutGrid, Zap, ArrowUpCircle, Check, Clock, TrendingUp, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import TokenBalance from '@/components/TokenBalance';
import { logActivity } from '@/lib/logger'; 

// --- 配置 ---
const CONTRACT_ADDRESS = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 

interface NFT {
  contract: { address: string };
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
  level?: number; 
}

interface StakingRecord {
  token_id: string;
  staked_at: string;
  level?: number; 
}

const formatTokenId = (rawId: string) => {
  try { return BigInt(rawId).toString(); } catch (e) { return rawId; }
};

// ⏱️ 辅助函数：格式化时长
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

// --- 组件：实时收益数字 ---
const LiveYield = ({ stakedAt, level = 1 }: { stakedAt: string, level?: number }) => {
  const [reward, setReward] = useState('0.0000');
  const ratePerSecond = 0.01 * level;

  useEffect(() => {
    const update = () => {
      const start = new Date(stakedAt).getTime();
      const now = Date.now();
      const seconds = (now - start) / 1000;
      setReward((seconds * ratePerSecond).toFixed(4));
    };
    update();
    const timer = setInterval(update, 100); 
    return () => clearInterval(timer);
  }, [stakedAt, ratePerSecond]);

  return <span className="font-mono text-green-400 font-bold tabular-nums">{reward}</span>;
};

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();

  // Data State
  const [walletNfts, setWalletNfts] = useState<NFT[]>([]); 
  const [stakedNfts, setStakedNfts] = useState<StakingRecord[]>([]); 
  const [nftMap, setNftMap] = useState<Record<string, NFT>>({});
  const [totalRate, setTotalRate] = useState(0);

  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- 🟢 Modal States (弹窗状态管理) ---
  const [unstakeModal, setUnstakeModal] = useState<{ isOpen: boolean; record: StakingRecord | null }>({ isOpen: false, record: null });
  
  // 1. Claim Success Modal
  const [claimResult, setClaimResult] = useState<{ isOpen: boolean; amount: string; hash: string } | null>(null);
  
  // 2. Unstake Success Modal
  const [unstakeResult, setUnstakeResult] = useState<{ isOpen: boolean; amount: string; duration: string; tokenId: string } | null>(null);

  // 初始化数据
  const initData = async () => {
    if (!address) return;
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const networkPrefix = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      
      const [alchemyRes, stakingRes, levelsRes] = await Promise.all([
        fetch(`https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true`),
        supabase.from('staking').select('*').eq('wallet_address', address),
        supabase.from('nft_levels').select('*')
      ]);

      const dataNft = await alchemyRes.json();
      const allNfts: NFT[] = dataNft.ownedNfts || [];
      const stakingData = stakingRes.data || [];
      const levelsData = levelsRes.data || [];

      const levelMap = new Map();
      levelsData.forEach((l: any) => levelMap.set(l.token_id, l.level));

      const fullNftMap: Record<string, NFT> = {};
      allNfts.forEach(nft => {
        const cleanId = formatTokenId(nft.id.tokenId);
        const level = levelMap.get(cleanId) || 1;
        fullNftMap[cleanId] = { ...nft, level };
      });
      setNftMap(fullNftMap);

      const uniqueStaked = new Map();
      let currentTotalRate = 0;

      stakingData.forEach((item: any) => {
        const cleanId = formatTokenId(item.token_id);
        const level = levelMap.get(cleanId) || 1; 
        if (!uniqueStaked.has(cleanId)) {
          uniqueStaked.set(cleanId, { ...item, level });
          currentTotalRate += (0.01 * level); 
        }
      });
      const stakedRecords = Array.from(uniqueStaked.values()) as StakingRecord[];
      
      const stakedIdSet = new Set(stakedRecords.map(r => formatTokenId(r.token_id)));
      const available = allNfts
        .map(nft => {
            const cleanId = formatTokenId(nft.id.tokenId);
            return { ...nft, level: levelMap.get(cleanId) || 1 };
        })
        .filter(nft => !stakedIdSet.has(formatTokenId(nft.id.tokenId)))
        .sort((a, b) => (b.level || 1) - (a.level || 1));

      setStakedNfts(stakedRecords);
      setWalletNfts(available);
      setTotalRate(currentTotalRate);

    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) initData();
  }, [isConnected, address]);

  const handleStake = async (nft: NFT) => {
    if (!address) return;
    const tokenIdDec = BigInt(nft.id.tokenId).toString();

    const { error } = await supabase
      .from('staking')
      .insert([{ wallet_address: address, token_id: tokenIdDec, staked_at: new Date().toISOString() }]);

    if (!error) {
      await logActivity({ address, type: 'STAKE', details: `Staked Token #${tokenIdDec} (Lv.${nft.level || 1})` });
      initData();
    }
  };

  const handleClaimReward = async (record: StakingRecord) => {
    if (!address) return;
    setProcessingId(record.token_id);

    try {
      const start = new Date(record.staked_at).getTime();
      const level = record.level || 1;
      const rate = 0.01 * level;
      const reward = ((Date.now() - start) / 1000 * rate).toFixed(4);
      
      if (parseFloat(reward) <= 0) {
        alert("Rewards are too low to claim.");
        return;
      }

      const res = await fetch('/api/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: reward, tokenId: record.token_id })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Reset timer
      await supabase.from('staking').update({ staked_at: new Date().toISOString() }).eq('wallet_address', address).eq('token_id', record.token_id);
      await logActivity({ address, type: 'CLAIM', details: `Yield: ${reward} KIKI`, hash: result.txHash });
      
      // ✅ 触发成功弹窗
      setClaimResult({ isOpen: true, amount: reward, hash: result.txHash });
      initData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openUnstakeModal = (record: StakingRecord) => {
    setUnstakeModal({ isOpen: true, record });
  };

  const confirmUnstake = async () => {
    const record = unstakeModal.record;
    if (!address || !record) return;

    setProcessingId('MODAL_LOADING');

    try {
      // Calculate Stats
      const start = new Date(record.staked_at).getTime();
      const durationMs = Date.now() - start;
      const level = record.level || 1;
      const rate = 0.01 * level;
      const reward = (durationMs / 1000 * rate).toFixed(4);
      
      // Auto Claim
      if (parseFloat(reward) > 0) {
        const res = await fetch('/api/claim-reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, amount: reward, tokenId: record.token_id })
        });
        if (res.ok) {
           const data = await res.json();
           await logActivity({ address, type: 'CLAIM', details: `Yield: ${reward} KIKI (Auto)`, hash: data.txHash });
        }
      }

      // Delete Record
      await supabase.from('staking').delete().eq('wallet_address', address).eq('token_id', record.token_id);
      await logActivity({ address, type: 'TRANSFER', details: `Unstaked Token #${formatTokenId(record.token_id)}` });

      setUnstakeModal({ isOpen: false, record: null });
      
      // ✅ 触发结算弹窗
      setUnstakeResult({ 
        isOpen: true, 
        amount: reward, 
        duration: formatDuration(durationMs), 
        tokenId: formatTokenId(record.token_id) 
      });

      initData();

    } catch (e: any) {
      alert("Unstake failed: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-200 font-sans">
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* --- 🎁 1. Claim Success Modal --- */}
      <AnimatePresence>
        {claimResult?.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#161A1E] border border-green-500/30 w-full max-w-sm rounded-3xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.2)] text-center relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Harvested!</h3>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-6">Yield Claimed Successfully</p>
              
              <div className="bg-[#0B0C10] p-4 rounded-2xl border border-white/5 mb-6">
                 <div className="text-sm text-slate-500 mb-1">Total Amount</div>
                 <div className="text-3xl font-bold text-white font-mono flex justify-center items-center gap-2">
                   {claimResult.amount} <span className="text-green-500 text-lg">KIKI</span>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={() => setClaimResult(null)} className="w-full h-12 bg-white text-black hover:bg-slate-200 font-bold rounded-xl">Awesome</Button>
                {claimResult.hash && (
                  <a href={`https://sepolia.etherscan.io/tx/${claimResult.hash}`} target="_blank" className="text-xs text-slate-500 hover:text-white flex items-center justify-center gap-1 mt-2">
                    View on Etherscan <ExternalLink className="w-3 h-3"/>
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 🔓 2. Unstake Success Modal (结算单) --- */}
      <AnimatePresence>
        {unstakeResult?.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#161A1E] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
              <div className="p-8">
                <div className="text-center mb-8">
                   <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 border border-white/5">
                      <Wallet className="w-8 h-8 text-blue-400" />
                   </div>
                   <h3 className="text-xl font-bold text-white">Asset Withdrawn</h3>
                   <p className="text-slate-500 text-sm mt-1">Token #{unstakeResult.tokenId} returned to wallet</p>
                </div>

                <div className="space-y-3 mb-8">
                   {/* 结算明细 */}
                   <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-green-400"/></div>
                         <div className="text-xs text-slate-400">Yield Earned</div>
                      </div>
                      <div className="font-mono font-bold text-white">+{unstakeResult.amount} KIKI</div>
                   </div>

                   <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg"><Clock className="w-4 h-4 text-blue-400"/></div>
                         <div className="text-xs text-slate-400">Duration</div>
                      </div>
                      <div className="font-mono font-bold text-white">{unstakeResult.duration}</div>
                   </div>
                </div>

                <Button onClick={() => setUnstakeResult(null)} className="w-full h-12 bg-white text-black hover:bg-slate-200 font-bold rounded-xl">
                  Return to Vault
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ⚠️ 3. Confirm Unstake Modal (原有的确认框) --- */}
      <AnimatePresence>
        {unstakeModal.isOpen && unstakeModal.record && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-[#12141a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3 text-yellow-500">
                  <div className="p-2 bg-yellow-500/10 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
                  <h3 className="text-xl font-bold text-white">Confirm Unstake</h3>
                </div>
                <button onClick={() => setUnstakeModal({ isOpen: false, record: null })} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-slate-400 text-sm leading-relaxed">
                  You are about to unstake <strong className="text-white">Token #{formatTokenId(unstakeModal.record.token_id)}</strong>.
                  <br/>
                  Pending rewards based on <span className="text-purple-400 font-bold">Level {unstakeModal.record.level || 1}</span> efficiency will be claimed automatically.
                </p>
                
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                   <img 
                      src={nftMap[formatTokenId(unstakeModal.record.token_id)]?.media?.[0]?.gateway || '/kiki.png'} 
                      className="w-12 h-12 rounded-lg object-cover bg-black"
                   />
                   <div>
                      <div className="text-xs text-slate-500 font-mono">PENDING REWARDS</div>
                      <div className="text-lg text-green-400 font-bold font-mono">
                         <LiveYield stakedAt={unstakeModal.record.staked_at} level={unstakeModal.record.level} /> KIKI
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setUnstakeModal({ isOpen: false, record: null })}
                  className="flex-1 border-white/10 hover:bg-white/5 h-12 text-slate-300"
                  disabled={processingId === 'MODAL_LOADING'}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmUnstake}
                  className="flex-1 bg-white text-black hover:bg-slate-200 h-12 font-bold"
                  disabled={processingId === 'MODAL_LOADING'}
                >
                  {processingId === 'MODAL_LOADING' ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Processing...</> : "Confirm & Claim"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* 左侧：Available */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Wallet className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-white">Available to Stake</h2>
              <button onClick={initData} className="ml-auto text-slate-500 hover:text-white"><RefreshCw className="w-4 h-4"/></button>
            </div>
            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {walletNfts.map(nft => {
                  const tokenId = formatTokenId(nft.id.tokenId);
                  const level = nft.level || 1;
                  return (
                    <motion.div 
                      key={tokenId} whileHover={{ scale: 1.02 }} 
                      className={`bg-[#12141a] border rounded-xl overflow-hidden group cursor-pointer relative ${level > 1 ? 'border-purple-500/30' : 'border-white/5'}`}
                      onClick={() => handleStake(nft)}
                    >
                      <div className="aspect-square bg-slate-800 relative">
                        <img src={nft.media?.[0]?.gateway || '/kiki.png'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} />
                        
                        {/* Level Badge */}
                        <div className="absolute top-2 right-2">
                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md flex items-center gap-1 ${level > 1 ? 'bg-purple-600 text-white' : 'bg-black/60 text-slate-300'}`}>
                             {level > 1 && <ArrowUpCircle className="w-3 h-3" />} Lv.{level}
                           </span>
                        </div>

                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <span className="bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg"><Play className="w-3 h-3 fill-current" /> STAKE</span>
                        </div>
                      </div>
                      <div className="p-3 bg-[#0e1016]">
                        <div className="flex justify-between items-center">
                           <div className="text-xs font-bold text-white truncate">#{tokenId}</div>
                           <div className="text-[10px] text-slate-500 font-mono">{(0.01 * level).toFixed(2)}/s</div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              {walletNfts.length === 0 && !isLoading && (
                 <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-xl bg-white/5 text-center">
                   <LayoutGrid className="w-8 h-8 text-slate-600 mb-2" />
                   <p className="text-slate-500 text-sm">No unstaked assets found.</p>
                 </div>
              )}
            </div>
          </div>

          {/* 右侧：Active Staking */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-white">Active Vault</h2>
              </div>
              <div className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded font-mono border border-green-500/20 flex items-center gap-2">
                 <Zap className="w-3 h-3 fill-current" />
                 Total Rate: {totalRate.toFixed(2)} KIKI/s
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {isLoading ? (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm gap-3"><Loader2 className="animate-spin w-6 h-6 text-green-500"/> Syncing...</div>
              ) : stakedNfts.length === 0 ? (
                 <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-sm bg-white/5">No assets staked.</div>
              ) : (
                 stakedNfts.map(record => {
                   const cleanId = formatTokenId(record.token_id);
                   const isProcessing = processingId === record.token_id;
                   const nftData = nftMap[cleanId];
                   const imgSrc = nftData?.media?.[0]?.gateway || '/kiki.png';
                   const level = record.level || 1;

                   return (
                     <div key={record.token_id} className={`bg-[#12141a] border p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between group hover:border-green-500/30 transition-all gap-4 ${level > 1 ? 'border-purple-500/20' : 'border-white/5'}`}>
                       <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="w-12 h-12 bg-black rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                            <img src={imgSrc} alt="Asset" className="w-full h-full object-cover" />
                            {level > 1 && (
                               <div className="absolute bottom-0 right-0 bg-purple-600 text-white text-[8px] px-1 font-bold">Lv.{level}</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <div className="text-sm font-bold text-white">Token #{cleanId}</div>
                               {level > 1 && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/20">+{((level-1)*100).toFixed(0)}% Boost</span>}
                            </div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-1">
                               <Coins className="w-3 h-3 text-yellow-500" />
                               Pending: <LiveYield stakedAt={record.staked_at} level={level} />
                            </div>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button 
                            size="sm" onClick={() => handleClaimReward(record)} disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-white text-black hover:bg-slate-200 font-bold text-[10px] h-9 px-4"
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : "CLAIM"}
                          </Button>
                          <Button 
                            size="sm" variant="outline"
                            onClick={() => openUnstakeModal(record)}
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
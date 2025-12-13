'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, BrainCircuit, Play, Loader2, 
  Timer, Database, RefreshCw, Wallet, Coins, AlertTriangle, X
} from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
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

// 辅助函数
const formatTokenId = (rawId: string) => {
  try {
    return BigInt(rawId).toString();
  } catch (e) {
    return rawId;
  }
};

// --- 组件：实时收益数字 ---
const LiveYield = ({ stakedAt }: { stakedAt: string }) => {
  const [reward, setReward] = useState('0.0000');
  useEffect(() => {
    const update = () => {
      const start = new Date(stakedAt).getTime();
      const now = Date.now();
      const seconds = (now - start) / 1000;
      setReward((seconds * 0.01).toFixed(4));
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [stakedAt]);
  return <span className="font-mono text-green-400 font-bold tabular-nums">{reward}</span>;
};

export default function TrainingPage() {
  const { address, isConnected, chain } = useAccount();

  // State
  const [walletNfts, setWalletNfts] = useState<NFT[]>([]); 
  const [stakedNfts, setStakedNfts] = useState<StakingRecord[]>([]); 
  
  // ✅ 新增：NFT 字典，用于通过 ID 快速查找图片
  const [nftMap, setNftMap] = useState<Record<string, NFT>>({});
  
  // ✅ 新增：弹窗状态
  const [unstakeModal, setUnstakeModal] = useState<{ isOpen: boolean; record: StakingRecord | null }>({
    isOpen: false,
    record: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 初始化数据
  const initData = async () => {
    if (!address) return;
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const networkPrefix = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      const url = `https://${networkPrefix}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true`;
      
      const resNft = await fetch(url);
      const dataNft = await resNft.json();
      const allNfts: NFT[] = dataNft.ownedNfts || [];

      // ✅ 1. 构建 NFT 映射表 (ID -> NFT对象)
      const newMap: Record<string, NFT> = {};
      allNfts.forEach(nft => {
        const cleanId = formatTokenId(nft.id.tokenId);
        newMap[cleanId] = nft;
      });
      setNftMap(newMap);

      // 2. 获取质押记录
      const { data: stakingData } = await supabase
        .from('staking')
        .select('*')
        .eq('wallet_address', address);

      // 去重
      const uniqueRecords = new Map();
      (stakingData || []).forEach((item: any) => {
        const cleanId = formatTokenId(item.token_id);
        if (!uniqueRecords.has(cleanId)) uniqueRecords.set(cleanId, item);
      });
      const stakedRecords = Array.from(uniqueRecords.values()) as StakingRecord[];
      setStakedNfts(stakedRecords);

      // 3. 过滤出未质押的
      const stakedIdSet = new Set(stakedRecords.map(r => formatTokenId(r.token_id)));
      const available = allNfts.filter(nft => !stakedIdSet.has(formatTokenId(nft.id.tokenId)));
      setWalletNfts(available);

    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) initData();
  }, [isConnected, address]);

  // --- 动作：质押 ---
  const handleStake = async (nft: NFT) => {
    if (!address) return;
    const tokenIdDec = BigInt(nft.id.tokenId).toString();

    const { error } = await supabase
      .from('staking')
      .insert([{ wallet_address: address, token_id: tokenIdDec, staked_at: new Date().toISOString() }]);

    if (!error) {
      await logActivity({ address, type: 'STAKE', details: `Staked Token #${tokenIdDec}` });
      initData();
    }
  };

  // --- 动作：单独领取 ---
  const handleClaimReward = async (record: StakingRecord) => {
    if (!address) return;
    setProcessingId(record.token_id);

    try {
      const start = new Date(record.staked_at).getTime();
      const reward = ((Date.now() - start) / 1000 * 0.01).toFixed(4);
      
      if (parseFloat(reward) <= 0) {
        alert("Rewards are too low to claim yet.");
        return;
      }

      const res = await fetch('/api/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: reward, tokenId: record.token_id })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      await supabase.from('staking').update({ staked_at: new Date().toISOString() }).eq('wallet_address', address).eq('token_id', record.token_id);
      await logActivity({ address, type: 'CLAIM', details: `Yield: ${reward} KIKI`, hash: result.txHash });
      
      // 这里的 alert 可以保留，或者也换成自定义 Toast，为了简单先保留
      alert(`Success! ${reward} KIKI claimed.`);
      initData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  // --- 动作：触发弹窗 ---
  const openUnstakeModal = (record: StakingRecord) => {
    setUnstakeModal({ isOpen: true, record });
  };

  // --- 动作：确认解除质押 (逻辑同前，移到了这里) ---
  const confirmUnstake = async () => {
    const record = unstakeModal.record;
    if (!address || !record) return;

    setProcessingId('MODAL_LOADING'); // 特殊 ID 标记弹窗加载中

    try {
      // 1. Auto Claim
      const start = new Date(record.staked_at).getTime();
      const reward = ((Date.now() - start) / 1000 * 0.01).toFixed(4);
      
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

      // 2. Delete Record
      await supabase.from('staking').delete().eq('wallet_address', address).eq('token_id', record.token_id);
      await logActivity({ address, type: 'TRANSFER', details: `Unstaked Token #${formatTokenId(record.token_id)}` });

      setUnstakeModal({ isOpen: false, record: null }); // 关闭弹窗
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

      {/* --- ✅ 自定义弹窗 (Unstake Modal) --- */}
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
              {/* 弹窗背景光效 */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
              
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
                  <br/><br/>
                  We will automatically <span className="text-green-400 font-bold">claim your pending rewards</span> before returning the asset to your available balance.
                </p>
                
                {/* 弹窗里也展示一下图片 */}
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                   <img 
                      src={nftMap[formatTokenId(unstakeModal.record.token_id)]?.media?.[0]?.gateway || '/kiki.png'} 
                      className="w-12 h-12 rounded-lg object-cover bg-black"
                   />
                   <div>
                      <div className="text-xs text-slate-500 font-mono">PENDING REWARDS</div>
                      <div className="text-lg text-green-400 font-bold font-mono">
                         <LiveYield stakedAt={unstakeModal.record.staked_at} /> KIKI
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
                  return (
                    <motion.div 
                      key={tokenId} whileHover={{ scale: 1.02 }} 
                      className="bg-[#12141a] border border-white/5 rounded-xl overflow-hidden group cursor-pointer relative" 
                      onClick={() => handleStake(nft)}
                    >
                      <div className="aspect-square bg-slate-800 relative">
                        <img src={nft.media?.[0]?.gateway || '/kiki.png'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'} />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <span className="bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg"><Play className="w-3 h-3 fill-current" /> STAKE</span>
                        </div>
                      </div>
                      <div className="p-3 bg-[#0e1016]"><div className="text-xs font-bold text-white truncate">#{tokenId}</div></div>
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
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <Database className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-white">Active Staking</h2>
              <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded ml-auto font-mono border border-green-500/20">APY: 0.01 KIKI/s</span>
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
                   // ✅ 查找该 ID 对应的 NFT 对象
                   const nftData = nftMap[cleanId];
                   const imgSrc = nftData?.media?.[0]?.gateway || '/kiki.png';

                   return (
                     <div key={record.token_id} className="bg-[#12141a] border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between group hover:border-green-500/30 transition-all gap-4">
                       <div className="flex items-center gap-4 w-full sm:w-auto">
                          {/* ✅ 这里的方块现在是图片了 */}
                          <div className="w-12 h-12 bg-black rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                            <img src={imgSrc} alt="Asset" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">Token #{cleanId}</div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-1">
                               <Coins className="w-3 h-3 text-yellow-500" />
                               Pending: <LiveYield stakedAt={record.staked_at} />
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
                            // ✅ 点击不再是 confirm，而是打开弹窗
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
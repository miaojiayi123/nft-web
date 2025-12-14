'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Zap, Cpu, Activity, 
  Loader2, TestTube2, ArrowUpCircle, Flame, Wallet 
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import TokenBalance from '@/components/TokenBalance';
import { logActivity } from '@/lib/logger'; 

// --- 🔧 配置 ---
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390'; 
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; 

// 升级费用接收地址 (国库)
const TREASURY_ADDRESS = '0x0752bddacb7b73e26a45e2b16cdea53311f46f7c'; 

// ERC20 ABI
const tokenAbi = [
  { inputs: [{name: "to", type: "address"}, {name: "amount", type: "uint256"}], name: "transfer", outputs: [{type: "bool"}], stateMutability: "nonpayable", type: "function" }
] as const;

interface NFT {
  id: { tokenId: string };
  title: string;
  media: { gateway: string }[];
  level?: number; 
}

export default function ClinicPage() {
  const { address, isConnected, chain } = useAccount();
  
  // 状态管理
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false); // 控制业务逻辑状态
  
  // 🔢 升级数值计算
  const currentLevel = selectedNft?.level || 1;
  const nextLevel = currentLevel + 1;
  const upgradeCost = currentLevel * 20; 
  const efficiencyBoost = 10; 

  // --- 1. 获取数据 ---
  const fetchInventory = async () => {
    if (!address) return;
    setLoadingNfts(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      const network = chain?.id === 1 ? 'eth-mainnet' : 'eth-sepolia';
      const url = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${address}&contractAddresses[]=${NFT_CONTRACT}&withMetadata=true`;
      
      const res = await fetch(url);
      const data = await res.json();
      let myNfts: NFT[] = data.ownedNfts || [];

      const { data: levels } = await supabase.from('nft_levels').select('*');
      
      const levelMap = new Map();
      levels?.forEach((l: any) => levelMap.set(l.token_id, l.level));

      myNfts = myNfts.map(nft => {
        const tokenIdDec = BigInt(nft.id.tokenId).toString();
        return {
          ...nft,
          level: levelMap.get(tokenIdDec) || 1
        };
      });

      myNfts.sort((a, b) => parseInt(a.id.tokenId, 16) - parseInt(b.id.tokenId, 16));
      setNfts(myNfts);
      
      if (selectedNft) {
        const updated = myNfts.find(n => n.id.tokenId === selectedNft.id.tokenId);
        if (updated) setSelectedNft(updated);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNfts(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchInventory();
  }, [isConnected, address]);

  // --- 2. 升级交易逻辑 ---
  // ✅ 关键修改：解构出 reset 方法
  const { data: hash, writeContract, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // 监听交易成功 -> 更新数据库 -> 重置状态
  useEffect(() => {
    const updateDb = async () => {
      // 只有在业务状态为 isUpgrading 时才执行，防止重复触发
      if (isSuccess && selectedNft && isUpgrading) {
        const tokenIdDec = BigInt(selectedNft.id.tokenId).toString();
        
        const { error } = await supabase
          .from('nft_levels')
          .upsert({ 
            token_id: tokenIdDec, 
            level: nextLevel,
            updated_at: new Date().toISOString()
          }, { onConflict: 'token_id' });

        if (!error) {
          await logActivity({
            address: address as string,
            type: 'MINT',
            details: `Upgraded Token #${tokenIdDec} to Lv.${nextLevel}`,
            hash
          });
          
          // 刷新数据，让界面显示新等级
          await fetchInventory(); 

          // ✅ 关键逻辑：延迟 2 秒后重置按钮状态
          setTimeout(() => {
            reset(); // 清除 wagmi 的 success 状态
            setIsUpgrading(false); // 解锁业务状态
          }, 2000); 

        } else {
          alert('Database update failed. Please contact support.');
          setIsUpgrading(false);
          reset();
        }
      }
    };
    updateDb();
  }, [isSuccess]); // 仅依赖 isSuccess 变化

  const handleUpgrade = () => {
    if (!selectedNft || !address) return;
    setIsUpgrading(true);
    
    writeContract({
      address: TOKEN_CONTRACT as `0x${string}`,
      abi: tokenAbi,
      functionName: 'transfer',
      args: [TREASURY_ADDRESS as `0x${string}`, parseEther(upgradeCost.toString())],
    });
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-200 font-sans selection:bg-purple-500/30">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[400px] bg-purple-900/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:30px_30px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard" className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-white transition-colors mb-2 uppercase tracking-wide">
              <ArrowLeft className="mr-2 h-3 w-3" /> Return to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <TestTube2 className="w-8 h-8 text-purple-500" />
              Cybernetic Clinic
            </h1>
            <p className="text-slate-400 text-sm">Pay KIKI to upgrade assets. Higher levels unlock yield multipliers.</p>
          </div>
          <div className="flex items-center gap-4">
            <TokenBalance />
            <ConnectButton />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inventory */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Select Subject
              </h3>
              <span className="text-xs font-mono text-slate-500">{nfts.length} AVAILABLE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {loadingNfts ? (
                <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-purple-500"/></div>
              ) : nfts.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p>No Genesis Assets Found</p>
                  <Link href="/mint"><Button variant="link" className="text-purple-400">Mint One Now</Button></Link>
                </div>
              ) : (
                nfts.map((nft) => {
                  const isSelected = selectedNft?.id.tokenId === nft.id.tokenId;
                  const tokenIdDec = BigInt(nft.id.tokenId).toString();
                  return (
                    <motion.div
                      key={tokenIdDec}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => !isUpgrading && setSelectedNft(nft)}
                      className={`relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer border transition-all duration-300 group ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/5 hover:border-white/20'}`}
                    >
                      <img 
                        src={nft.media?.[0]?.gateway || '/kiki.png'} 
                        className={`w-full h-full object-cover transition-all ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} 
                        onError={(e) => (e.target as HTMLImageElement).src = '/kiki.png'}
                      />
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-[10px] text-slate-400 font-mono">ID #{tokenIdDec}</div>
                            <div className="text-sm font-bold text-white">Lv. {nft.level}</div>
                          </div>
                          {isSelected && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_#a855f7]"></div>}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>

          {/* Upgrade Panel */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="bg-[#0e1015] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative min-h-[500px] flex flex-col">
                
                <div className="h-1.5 w-full bg-slate-800">
                  {selectedNft && (
                    <motion.div 
                      className="h-full bg-purple-500 shadow-[0_0_15px_#a855f7]"
                      initial={{ width: 0 }} 
                      animate={{ width: isPending || isConfirming ? '100%' : '30%' }}
                      transition={{ duration: isPending ? 20 : 0.5 }}
                    />
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  {!selectedNft ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                      <Zap className="w-16 h-16 stroke-1" />
                      <p className="text-sm font-mono uppercase tracking-widest text-center">Select an asset from inventory<br/>to initiate upgrade</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            Modification <span className="text-purple-500">v{nextLevel}.0</span>
                          </h2>
                          <p className="text-xs text-slate-400 font-mono mt-1">TOKEN ID: {BigInt(selectedNft.id.tokenId).toString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                          <Activity className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>

                      <div className="space-y-6 flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="text-xs text-slate-500 font-mono mb-2 uppercase">Current Status</div>
                            <div className="text-3xl font-bold text-slate-300">Lv. {currentLevel}</div>
                          </div>
                          
                          <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/20 blur-2xl rounded-full group-hover:bg-purple-500/40 transition-all"></div>
                            <div className="text-xs text-purple-300 font-mono mb-2 uppercase flex items-center gap-1">Target <ArrowUpCircle className="w-3 h-3"/></div>
                            <div className="text-3xl font-bold text-white">Lv. {nextLevel}</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
                            <span>Yield Efficiency</span>
                            <span className="text-green-400">+{efficiencyBoost}% Boost</span>
                          </div>
                          <Progress value={currentLevel * 10} className="h-2 bg-slate-800" />
                          <div className="flex justify-between text-[10px] font-mono text-slate-600 mt-1">
                            <span>Base Rate</span>
                            <span className="text-purple-400">Optimized Rate</span>
                          </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/10">
                              <Wallet className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-400 font-bold uppercase">Upgrade Cost</div>
                              <div className="text-[10px] text-slate-500">Sent to Treasury</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white">{upgradeCost} KIKI</div>
                            <div className="text-[10px] text-slate-500">Gas fees apply</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <AnimatePresence mode="wait">
                          {isSuccess && !isUpgrading ? ( // 当 isSuccess 为真 且 业务状态已重置时
                             // 其实这里会因为 setTimeout 的延迟导致一瞬间显示成功然后变回按钮
                             // 我们用 isSuccess 且 还在 isUpgrading 状态没解除时显示成功
                             // 或者直接用 isSuccess 就可以，因为 2秒后 reset 会把 isSuccess 变成 false
                             
                             <motion.div
                               key="success"
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, y: -10 }}
                               className="w-full h-14 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-green-400 font-bold"
                             >
                               UPGRADE COMPLETE
                             </motion.div>
                          ) : (
                            <Button 
                              key="button"
                              onClick={handleUpgrade}
                              disabled={isPending || isConfirming || isUpgrading}
                              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all relative overflow-hidden"
                            >
                              {isPending || isConfirming ? (
                                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> REWRITING NEURAL PATHS...</>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Zap className="w-5 h-5 fill-current" /> INITIATE UPGRADE
                                </div>
                              )}
                            </Button>
                          )}
                        </AnimatePresence>
                        
                        {isConfirming && (
                          <p className="text-center text-[10px] text-purple-400 mt-3 animate-pulse font-mono uppercase">
                            /// Waiting for Block Confirmation ///
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
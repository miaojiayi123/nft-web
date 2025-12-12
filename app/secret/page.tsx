'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Gem, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

// ✅ 修正：确保这里和 Mint 页面使用的是同一个合约地址
const CONTRACT_ADDRESS = '0x5476dA4fc12BE1d6694d4F8FCcc6beC67eFBFf93'; 

// ABI 保持不变，只需要 balanceOf
const contractAbi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function SecretPage() {
  const { address, isConnected } = useAccount();

  // 读取当前用户持有的 NFT 数量
  const { data: balance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    // 增加：每当页面聚焦或重新连接时刷新数据
    query: {
      refetchOnWindowFocus: true,
    }
  });

  // 判断是否持有 (balance > 0)
  const hasNft = balance && Number(balance) > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 背景装饰 */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[100px] pointer-events-none" />
      
      {/* 顶部导航 */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回控制台
        </Link>
        <ConnectButton />
      </nav>

      {/* 标题区域 */}
      <div className="text-center mb-10 z-10">
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">
          魔女的秘密空间
        </h1>
        <p className="text-slate-400 text-lg">
          Web3 门禁系统：只有 Kiki NFT 持有者可见
        </p>
      </div>

      <div className="z-10 w-full max-w-md">
        {!isConnected ? (
          // 状态 1: 未连接钱包
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900/80 border-slate-800 p-8 text-center backdrop-blur-sm">
              <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">身份验证</h2>
              <p className="text-slate-400 mb-6">请先连接钱包，系统将自动扫描你的链上资产。</p>
            </Card>
          </motion.div>
        ) : isLoading ? (
          // 状态 2: 读取数据中
          <div className="text-center text-slate-500 animate-pulse flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            正在读取区块链数据...
          </div>
        ) : hasNft ? (
          // 状态 3: 验证通过 (持有 NFT)
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <Card className="bg-gradient-to-b from-purple-900/80 to-slate-900/90 border-purple-500/50 p-8 text-center relative overflow-hidden shadow-2xl shadow-purple-900/50">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              
              <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/50">
                <Unlock className="w-8 h-8 text-green-400" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 text-white">验证成功！</h2>
              <p className="text-purple-200 mb-8 leading-relaxed">
                欢迎回来，尊贵的魔女公会成员。<br/>
                检测到您持有 Kiki NFT。
              </p>
              
              <div className="space-y-4">
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-left flex items-start gap-4">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <Gem className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-purple-200">核心社区权限</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      点击下方按钮，获取 Discord 邀请链接及微信联系方式。
                    </p>
                  </div>
                </div>

                {/* 跳转到礼物页 */}
                <Link href="/gift" className="block w-full">
                  <Button className="w-full bg-white text-purple-900 hover:bg-purple-100 font-bold h-12 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
                    <Gem className="mr-2 w-4 h-4" /> 领取我的神秘礼物
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ) : (
          // 状态 4: 验证失败 (无 NFT)
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="bg-slate-900/80 border-slate-800 p-8 text-center backdrop-blur-sm relative overflow-hidden">
              <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/30">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">访问被拒绝</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                抱歉，你的钱包没有检测到 <span className="text-white font-bold">Kiki NFT</span>。<br/>
                该区域仅限公会成员进入。
              </p>
              <Link href="/mint">
                <Button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 font-bold h-12 rounded-xl">
                  去铸造通行证 &rarr;
                </Button>
              </Link>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
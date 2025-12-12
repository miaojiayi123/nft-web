'use client';

import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Wallet, 
  CreditCard, 
  Network, 
  ArrowLeft, 
  Image as ImageIcon, 
  Rocket, 
  Lock,
  Send,
  Trees // ✅ 新增：魔法森林图标
} from 'lucide-react';
import Link from 'next/link';

// 引入功能组件
import { NftGallery } from '@/components/NftGallery';
// 注意：SignMessageCard 和 TransferCard 已被移除，改为独立页面入口

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  
  // 获取用户余额
  const { data: balance, isLoading } = useBalance({
    address: address,
  });

  // 1. 未连接状态
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">请先连接钱包</h1>
          <p className="text-gray-400">你需要连接钱包才能查看仪表盘数据。</p>
          <Link href="/">
            <Button variant="outline" className="border-white/20 hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回主页
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. 已连接状态
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-12">
      <div className="max-w-7xl mx-auto">
        
        {/* 顶部导航 */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" /> 返回主页
            </Button>
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          我的控制台
        </h1>

        {/* 第一部分：账户概览 (3张卡片) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 钱包地址 */}
          <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">钱包地址</CardTitle>
              <Wallet className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              <p className="text-xs text-gray-500 mt-1">当前连接账户</p>
            </CardContent>
          </Card>

          {/* 余额 */}
          <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">原生代币余额</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  `${parseFloat(balance?.formatted || '0').toFixed(4)} ${balance?.symbol}`
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">无需刷新，自动更新</p>
            </CardContent>
          </Card>

          {/* 网络 */}
          <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">当前网络</CardTitle>
              <Network className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chain?.name || '未知网络'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Chain ID: {chain?.id}</p>
            </CardContent>
          </Card>
        </div>

        {/* 第二部分：功能交互区 (3列布局) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* 1. NFT 转账入口 */}
          <div className="lg:col-span-1 h-full">
            <Link href="/transfer">
              <Card className="h-full bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-slate-800 hover:border-blue-500/60 cursor-pointer transition-all hover:scale-[1.02] group text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-300">
                    <Send className="w-5 h-5 group-hover:text-white transition-colors" />
                    NFT 转账
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-400">
                    将你的 NFT 收藏品发送给朋友。<br/>
                    支持 ERC-721 标准。
                  </p>
                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      Go to Transfer
                    </span>
                    <ArrowLeft className="w-5 h-5 text-blue-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          {/* 2. 魔法修行入口 (替换了原来的签名卡片) */}
          <div className="lg:col-span-1 h-full">
            <Link href="/training">
              <Card className="h-full bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-slate-800 hover:border-green-500/60 cursor-pointer transition-all hover:scale-[1.02] group text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-300">
                    <Trees className="w-5 h-5 group-hover:text-white transition-colors" />
                    质押NFT--魔法修行
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-400">
                    质押你的 Kiki NFT 去森林修行。<br/>
                    挂机即可赚取魔法积分 (XP)。
                  </p>
                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                      Start Staking
                    </span>
                    <ArrowLeft className="w-5 h-5 text-green-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* 3. 门禁系统入口 */}
          <div className="lg:col-span-1 h-full">
            <Link href="/secret">
              <Card className="h-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-slate-800 hover:border-purple-500/60 cursor-pointer transition-all hover:scale-[1.02] group text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-300">
                    <Lock className="w-5 h-5 group-hover:text-white transition-colors" />
                    门禁系统
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-400">
                    持有 Kiki NFT 的专属领地。<br/>验证持有权并解锁隐藏内容。
                  </p>
                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                      Token Gated
                    </span>
                    <ArrowLeft className="w-5 h-5 text-purple-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* 第三部分：铸造入口 Banner */}
        <div className="mb-12">
           <Link href="/mint">
             <div className="relative group overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-blue-900/40 p-8 cursor-pointer transition-all hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-900/20">
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                   <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                     <Rocket className="text-yellow-400 fill-yellow-400" /> Kiki's Delivery 限时铸造中
                   </h3>
                   <p className="text-purple-200/80 max-w-xl">
                     参与魔法快递首发，获取社区通行证。持有者可解锁上方“门禁系统”。
                   </p>
                 </div>
                 <Button className="bg-white text-purple-900 hover:bg-purple-100 font-bold px-8 py-6 text-lg shadow-lg">
                    立即参与
                 </Button>
               </div>
               
               {/* 装饰背景 */}
               <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-purple-500/20 to-transparent pointer-events-none" />
             </div>
           </Link>
        </div>

        {/* 第四部分：NFT 画廊 */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <ImageIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold">我的收藏</h2>
          </div>
          <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 min-h-[300px]">
             <NftGallery />
          </div>
        </div>
        
        {/* 管理员入口 (放在最下面) */}
        <div className="mt-16 text-center">
          <Link href="/admin">
             <Button variant="link" className="text-slate-600 hover:text-slate-400 text-xs">
               🔧 管理员控制台
             </Button>
          </Link>
        </div>
        
      </div>
    </div>
  );
}
'use client';

import { useAccount, useBalance } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, CreditCard, Network, ArrowLeft, Image as ImageIcon, Rocket } from 'lucide-react';
import Link from 'next/link';

// 引入所有功能组件
import { TransferCard } from '@/components/TransferCard';
import { SignMessageCard } from '@/components/SignMessageCard';
import { NftGallery } from '@/components/NftGallery';

export default function Dashboard() {
  const { address, isConnected, chain } = useAccount();
  
  // 获取用户余额
  const { data: balance, isLoading } = useBalance({
    address: address,
  });

  // 1. 未连接状态：显示提示
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

  // 2. 已连接状态：显示仪表盘
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-12">
      <div className="max-w-7xl mx-auto">
        
        {/* 顶部导航：返回按钮 */}
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

        {/* 第二部分：功能交互区 (转账 + 签名) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* 左边 1/3：转账卡片 */}
          <div className="lg:col-span-1 h-full">
            <TransferCard />
          </div>
          
          {/* 右边 2/3：签名卡片 */}
          <div className="lg:col-span-2 h-full">
            <SignMessageCard />
          </div>
        </div>

        {/* 第三部分：铸造入口 Banner (新增) */}
        <div className="mb-12">
           <Link href="/mint">
             <div className="relative group overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-blue-900/40 p-8 cursor-pointer transition-all hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-900/20">
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                   <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                     <Rocket className="text-yellow-400 fill-yellow-400" /> Genesis Pass 限时铸造中
                   </h3>
                   <p className="text-purple-200/80 max-w-xl">
                     参与 NFT Nexus 创世首发，获取社区治理权。即将售罄！
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
            <h2 className="text-2xl font-bold">我的收藏 (Ethereum Mainnet/Sepolia)</h2>
          </div>
          <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 min-h-[300px]">
             <NftGallery />
          </div>
        </div>
        
      </div>
    </div>
  );
}
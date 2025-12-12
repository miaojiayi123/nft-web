import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // 确保你的 supabase 客户端可以在服务端运行
import { ethers } from 'ethers';

// 配置信息
const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; // 你的 KIKI 代币地址
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

// KIKI 代币 ABI (只需要 mint)
const TOKEN_ABI = [
  "function mint(address to, uint256 amount) public"
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordId, userAddress } = body;

    if (!recordId || !userAddress || !ADMIN_PRIVATE_KEY) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 1. 去数据库查这笔质押记录
    const { data: record, error } = await supabase
      .from('staking')
      .select('*')
      .eq('id', recordId)
      .eq('wallet_address', userAddress) // 安全检查：确保是本人的
      .eq('status', 'active') // 确保还没领过
      .single();

    if (error || !record) {
      return NextResponse.json({ error: '找不到有效的活跃质押记录' }, { status: 404 });
    }

    // 2. 计算奖励
    const startTime = new Date(record.start_time).getTime();
    const now = new Date().getTime();
    const secondsElapsed = Math.floor((now - startTime) / 1000);
    
    // 💰 核心公式：每秒 0.01 KIKI
    const rewardAmount = secondsElapsed * 0.01;

    if (rewardAmount <= 0) {
      return NextResponse.json({ error: '时间太短，暂无奖励' }, { status: 400 });
    }

    // 3. 区块链交互：管理员发币
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, wallet);

    // 将数字转换为 18 位精度 (例如 0.01 -> 10000000000000000)
    // 注意：toFixed(18) 防止小数位过多报错
    const amountWei = ethers.parseUnits(rewardAmount.toFixed(18), 18);

    console.log(`正在给 ${userAddress} 发放 ${rewardAmount} KIKI...`);
    
    // 发送交易
    const tx = await contract.mint(userAddress, amountWei);
    await tx.wait(); // 等待上链

    // 4. 更新数据库为“已完成”
    const { error: updateError } = await supabase
      .from('staking')
      .update({ 
        status: 'finished', 
        earned_points: Math.floor(rewardAmount) // 数据库存个整数记录一下即可，或者你可以把数据库字段改成 float
      })
      .eq('id', recordId);

    if (updateError) console.error("数据库更新失败", updateError);

    return NextResponse.json({ 
      success: true, 
      txHash: tx.hash, 
      amount: rewardAmount 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
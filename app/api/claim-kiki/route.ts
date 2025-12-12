import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';

// 1. 获取配置
const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c'; // KIKI 代币地址
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

const TOKEN_ABI = [
  "function mint(address to, uint256 amount) public"
];

export async function POST(request: Request) {
  try {
    // 🔍 调试：检查环境变量是否读取成功
    if (!ADMIN_PRIVATE_KEY) {
      console.error("❌ 严重错误：服务端未检测到 ADMIN_PRIVATE_KEY");
      return NextResponse.json({ error: '服务端配置错误：缺少管理员私钥，请检查 .env.local 并重启服务器' }, { status: 500 });
    }

    const body = await request.json();
    const { recordId, userAddress } = body;

    // 🔍 调试：检查前端参数
    if (!recordId || !userAddress) {
      console.error(`❌ 参数缺失 - recordId: ${recordId}, userAddress: ${userAddress}`);
      return NextResponse.json({ error: '请求参数错误：缺少 recordId 或 userAddress' }, { status: 400 });
    }

    console.log(`🚀 开始处理提现请求: 用户 ${userAddress}, 记录ID ${recordId}`);

    // 1. 查库
    const { data: record, error } = await supabase
      .from('staking')
      .select('*')
      .eq('id', recordId)
      .eq('wallet_address', userAddress)
      .eq('status', 'active')
      .single();

    if (error || !record) {
      return NextResponse.json({ error: '未找到有效的质押记录或已领取' }, { status: 404 });
    }

    // 2. 算钱
    const startTime = new Date(record.start_time).getTime();
    const now = new Date().getTime();
    const secondsElapsed = Math.floor((now - startTime) / 1000);
    const rewardAmount = secondsElapsed * 0.01;

    if (rewardAmount <= 0) {
      return NextResponse.json({ error: '暂无收益可领取' }, { status: 400 });
    }

    // 3. 发钱
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, wallet);

    // 将 0.01 这种小数转为 wei (18位精度)
    // ⚠️ 注意：如果数字太小，toFixed 可能会有问题，这里做一个安全转换
    const amountStr = rewardAmount.toFixed(18); 
    const amountWei = ethers.parseUnits(amountStr, 18);

    console.log(`💸 正在链上转账... 数量: ${amountStr}`);
    
    // 发起交易
    // 如果这里报错，通常是管理员没钱了，或者 RPC 网络波动
    const tx = await contract.mint(userAddress, amountWei);
    console.log(`✅ 交易已发送: ${tx.hash}`);
    
    await tx.wait(); // 等待上链

    // 4. 改状态
    await supabase
      .from('staking')
      .update({ status: 'finished', earned_points: Math.floor(rewardAmount) })
      .eq('id', recordId);

    return NextResponse.json({ 
      success: true, 
      txHash: tx.hash, 
      amount: rewardAmount 
    });

  } catch (error: any) {
    console.error('API 内部错误:', error);
    return NextResponse.json({ error: `处理失败: ${error.message}` }, { status: 500 });
  }
}
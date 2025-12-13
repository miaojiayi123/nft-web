import { NextResponse } from 'next/server';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const TOKEN_CONTRACT_ADDRESS = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';

const tokenAbi = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// 强制动态运行，避免 Vercel 缓存 API 结果
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 延长超时时间

export async function POST(request: Request) {
  try {
    // 1. 检查环境变量
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

    if (!privateKey) {
      return NextResponse.json({ error: 'Config Error: Missing ADMIN_PRIVATE_KEY' }, { status: 500 });
    }
    if (!alchemyKey) {
      return NextResponse.json({ error: 'Config Error: Missing NEXT_PUBLIC_ALCHEMY_API_KEY' }, { status: 500 });
    }

    // 2. 解析请求
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    const { address, amount } = body;
    if (!address || !amount) {
      return NextResponse.json({ error: 'Missing address or amount' }, { status: 400 });
    }

    // 3. 配置专用 RPC (关键修复点 🛠️)
    // 使用你的 Alchemy Key 拼接出专用节点地址，不再和别人挤公共节点
    const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;

    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const client = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl) // ✅ 传入专用 URL
    });

    console.log(`[API] Minting ${amount} KIKI to ${address} via Alchemy...`);

    // 4. 发送交易
    const amountInWei = parseEther(amount.toString());
    
    const hash = await client.writeContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'mint',
      args: [address, amountInWei],
    });

    console.log(`[API] Success: ${hash}`);
    return NextResponse.json({ success: true, txHash: hash });

  } catch (error: any) {
    console.error("[API Error]", error);
    // 返回具体错误信息给前端，方便调试
    return NextResponse.json(
      { error: error.details || error.shortMessage || error.message || 'Server Error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
// ✅ 现在可以正确引用了
import { tokenAbi, nftAbi } from '@/lib/abis'; 

// 🔧 配置
const NFT_CONTRACT = '0x1Fb1BE68a40A56bac17Ebf4B28C90a5171C95390';
const TOKEN_CONTRACT = '0x83F7A90486697B8B881319FbADaabF337fE2c60c';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { buyerAddress, listingId } = await request.json();
    
    // 1. 验证环境
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!privateKey || !alchemyKey) throw new Error("Server Config Error");

    // 2. 获取挂单详情
    const { data: listing, error } = await supabase
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (error || !listing) return NextResponse.json({ error: 'Listing not found or sold' }, { status: 404 });
    if (listing.seller_address.toLowerCase() === buyerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot buy your own NFT' }, { status: 400 });
    }

    // 3. 初始化管理员钱包
    const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`);
    const client = createWalletClient({ account, chain: sepolia, transport: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`) });
    
    console.log(`[Market] Processing Buy: ${buyerAddress} -> Item #${listing.token_id} @ ${listing.price} KIKI`);

    // 4. 执行交易 (原子化操作)
    
    // Step A: 转移 KIKI (买家 -> 卖家)
    const priceWei = parseEther(listing.price.toString());
    const tx1 = await client.writeContract({
      address: TOKEN_CONTRACT,
      abi: tokenAbi, // ✅ 使用统一 ABI
      functionName: 'transferFrom',
      args: [buyerAddress, listing.seller_address, priceWei]
    });
    console.log(`[Market] KIKI Transfer TX: ${tx1}`);

    // Step B: 转移 NFT (卖家 -> 买家)
    const tx2 = await client.writeContract({
      address: NFT_CONTRACT,
      abi: nftAbi, // ✅ 使用统一 ABI
      functionName: 'transferFrom',
      args: [listing.seller_address, buyerAddress, BigInt(listing.token_id)]
    });
    console.log(`[Market] NFT Transfer TX: ${tx2}`);

    // 5. 更新数据库状态
    await supabase.from('market_listings').update({ status: 'sold' }).eq('id', listingId);

    return NextResponse.json({ success: true, txHash: tx2 });

  } catch (error: any) {
    console.error("[Market Error]", error);
    // 提取更详细的错误信息 (例如: execution reverted)
    const errorMessage = error.details || error.shortMessage || error.message || 'Transaction failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
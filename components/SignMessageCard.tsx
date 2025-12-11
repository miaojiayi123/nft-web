'use client';

import { useState } from 'react';
import { useSignMessage } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PenTool, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SignMessageCard() {
  const [message, setMessage] = useState('Welcome to NFT Nexus! Verify my identity.');
  const [signature, setSignature] = useState<string>('');
  
  const { signMessage, isPending } = useSignMessage({
    mutation: {
      onSuccess(data) {
        setSignature(data);
      },
    },
  });

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    signMessage({ message });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="h-full"
    >
      <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-sm h-full flex flex-col relative overflow-hidden">
        {/* 背景装饰光晕 */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <PenTool className="w-5 h-5" />
            身份验证 (Sign)
          </CardTitle>
          <CardDescription className="text-slate-400">
            无需 Gas 费，通过数字签名证明你拥有此钱包。
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-4">
          <form onSubmit={handleSign} className="space-y-4 flex flex-col h-full">
            <div className="space-y-2 flex-1">
              <Label htmlFor="message" className="text-slate-300">签名内容</Label>
              <Textarea 
                id="message" 
                placeholder="输入要签名的消息..." 
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setSignature(''); // 修改内容时清空旧签名
                }}
                className="bg-black/20 border-slate-700 text-white min-h-[120px] focus:border-purple-500/50 resize-none transition-colors"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isPending || !message}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-11"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 请在钱包签名...
                </>
              ) : (
                '生成数字签名'
              )}
            </Button>
          </form>

          {/* 签名结果展示区 */}
          <AnimatePresence>
            {signature && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 overflow-hidden">
                  <div className="flex items-center gap-2 text-green-400 mb-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> 签名生成成功
                  </div>
                  <div 
                    onClick={() => navigator.clipboard.writeText(signature)}
                    title="点击复制"
                    className="text-xs text-slate-400 break-all font-mono bg-black/30 p-2 rounded cursor-pointer hover:bg-black/50 transition-colors active:scale-95 transform"
                  >
                    {signature}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
                    *任何人均可使用此签名验证你的身份
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
// components/MessageWall.tsx
import React from 'react';

// 定义留言数据的类型
interface Message {
  id: string;
  user: string;
  avatar: string; // 头像 URL
  content: string;
  time: string;
  tag?: string;   // 可选：标签（如 "Feature Request", "General"）
}

// 模拟数据 (之后你可以替换为从 API 获取)
const MOCK_MESSAGES: Message[] = [
  { id: '1', user: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', content: 'Dashboard 现在的布局清晰多了！瀑布流是个好主意。', time: '2分钟前', tag: 'Feedback' },
  { id: '2', user: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', content: '希望能增加深色模式的切换按钮，晚上的 时候看屏幕有点刺眼。另外，图表的加载速度能不能再优化一下？', time: '10分钟前', tag: 'Suggestion' },
  { id: '3', user: 'Charlie', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', content: '新功能很赞！🔥', time: '15分钟前' },
  { id: '4', user: 'David', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', content: '有些 NFT 的图片在手机上显示不全，建议检查一下响应式适配。', time: '1小时前', tag: 'Bug' },
  { id: '5', user: 'Eve', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', content: 'Looking forward to the next update!', time: '2小时前' },
  { id: '6', user: 'Frank', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank', content: '能不能把交易记录导出为 CSV？我需要做税务申报。', time: '3小时前', tag: 'Feature' },
];

export default function MessageWall() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          社区留言板
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          听听大家都在讨论什么
        </p>
      </div>

      {/* 核心布局：
        columns-1: 移动端单列
        md:columns-2: 平板双列
        lg:columns-3: 桌面三列
        gap-6: 列间距
        space-y-6: 垂直间距
      */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {MOCK_MESSAGES.map((msg) => (
          <div
            key={msg.id}
            // break-inside-avoid 是防止卡片被分割到两列的关键
            className="break-inside-avoid relative group bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
          >
            {/* 头部：头像与信息 */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <img
                  src={msg.avatar}
                  alt={msg.user}
                  className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 object-cover"
                />
                {/* 在线状态点 (装饰) */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {msg.user}
                </h4>
                <span className="text-xs text-gray-500">{msg.time}</span>
              </div>
            </div>

            {/* 内容 */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
              {msg.content}
            </p>

            {/* 底部：标签与互动 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800">
              {msg.tag ? (
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full 
                  ${msg.tag === 'Bug' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 
                    msg.tag === 'Feature' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400'
                  }`}
                >
                  {msg.tag}
                </span>
              ) : (
                <span></span> // 占位，保持布局平衡
              )}
              
              <button className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs group-hover:opacity-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Home() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [reviewItems, setReviewItems] = useState([]);
  const [reward, setReward] = useState(null);

  const loadData = () => {
    if (activeChild) {
      api.get(`/progress/review/${activeChild.id}`).then(res => setReviewItems(res.data)).catch(() => {});
      api.get(`/rewards/${activeChild.id}`).then(res => setReward(res.data)).catch(() => {});
    }
  };

  useEffect(loadData, [activeChild]);

  if (!activeChild) {
    return (
      <div className="relative text-center py-16 overflow-hidden">
        <img
          src="/assets/panda.png"
          alt=""
          aria-hidden="true"
          className="mascot-hero floaty mx-auto w-32 h-32 object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <h2 className="text-2xl font-extrabold text-kid-ink mt-2 mb-2">欢迎来到启蒙星！</h2>
        <p className="text-kid-ink/50 mb-6">请先添加孩子档案开始学习</p>
        <button onClick={() => navigate('/courses')} className="btn-kid bg-kid-orange text-white">
          <Icon name="userPlus" size={20} />去添加孩子
        </button>
      </div>
    );
  }

  const quickEntries = [
    { key: 'study', title: '开始学习', desc: '汉字/英语/数学/绘本', icon: 'book', tone: 'from-kid-blue to-kid-purple', route: '/courses' },
    { key: 'reward', title: '我的奖励', desc: '星星/徽章/打卡', icon: 'trophy', tone: 'from-kid-orange to-kid-yellow', route: '/rewards' },
    { key: 'review', title: '今日复习', desc: `${reviewItems.length} 项待复习`, icon: 'refresh', tone: 'from-kid-green to-kid-blue', route: '/review', badge: reviewItems.length },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-kid-orange to-kid-yellow rounded-[28px] shadow-kid-lg p-6 text-white">
        <span className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/15" />
        <span className="absolute right-16 -bottom-10 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/25">
                <Icon name={activeChild.avatar} size={22} className="text-white" />
              </span>
              <span className="truncate">{activeChild.name}，你好！</span>
            </h2>
            <p className="opacity-90 mt-1 text-sm sm:text-base truncate">今天也要加油学习哦～</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-extrabold flex items-center gap-1 justify-end">
              <Icon name="star" size={24} />{reward?.stars || 0}
            </div>
            <div className="text-xs sm:text-sm opacity-90 flex items-center gap-1 justify-end whitespace-nowrap">
              <Icon name="flame" size={14} />连续 {reward?.streak || 0} 天
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-3 gap-3">
        {quickEntries.map((e) => (
          <button
            key={e.key}
            onClick={() => navigate(e.route)}
            className="relative card-kid !p-4 text-left hover:-translate-y-0.5 hover:shadow-kid-lg active:scale-[0.98] transition"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${e.tone} flex items-center justify-center text-white shadow-kid mb-3`}>
              <Icon name={e.icon} size={26} />
            </div>
            <div className="font-extrabold text-kid-ink text-base sm:text-lg">{e.title}</div>
            <div className="text-xs text-kid-ink/45 truncate">{e.desc}</div>
            {!!e.badge && (
              <span className="absolute top-3 right-3 min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-kid-orange text-white text-xs font-bold shadow">
                {e.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

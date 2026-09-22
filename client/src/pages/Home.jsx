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
      <div className="text-center py-20">
        <div className="text-6xl mb-4"><Icon name="smile" size={60} className="mx-auto text-kid-orange" /></div>
        <h2 className="text-2xl font-bold text-gray-700 mb-4">欢迎来到启蒙星！</h2>
        <p className="text-gray-500 mb-6">请先添加孩子档案开始学习</p>
        <button onClick={() => navigate('/courses')} className="btn-kid bg-kid-orange text-white">
          <Icon name="userPlus" size={20} />去添加孩子
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <div className="bg-gradient-to-br from-kid-orange to-kid-yellow rounded-3xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20">
                <Icon name={activeChild.avatar} size={22} className="text-white" />
              </span>
              <span className="truncate">{activeChild.name}，你好！</span>
            </h2>
            <p className="opacity-90 mt-1 text-sm sm:text-base truncate">今天也要加油学习哦～</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-bold flex items-center gap-1 justify-end">
              <Icon name="star" size={24} />{reward?.stars || 0}
            </div>
            <div className="text-xs sm:text-sm opacity-80 flex items-center gap-1 justify-end whitespace-nowrap">
              <Icon name="flame" size={14} />连续 {reward?.streak || 0} 天
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口：开始学习、我的奖励、今日复习 */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => navigate('/courses')} className="bg-white rounded-3xl shadow-lg p-4 sm:p-5 text-left hover:scale-105 transition">
          <div className="text-4xl mb-2"><Icon name="book" size={40} className="text-kid-blue" /></div>
          <div className="font-bold text-lg">开始学习</div>
          <div className="text-xs sm:text-sm text-gray-400">汉字/英语/数学/绘本</div>
        </button>
        <button onClick={() => navigate('/rewards')} className="bg-white rounded-3xl shadow-lg p-4 sm:p-5 text-left hover:scale-105 transition">
          <div className="text-4xl mb-2"><Icon name="trophy" size={40} className="text-kid-orange" /></div>
          <div className="font-bold text-lg">我的奖励</div>
          <div className="text-xs sm:text-sm text-gray-400">星星/徽章/打卡</div>
        </button>
        <button onClick={() => navigate('/review')} className="relative bg-white rounded-3xl shadow-lg p-4 sm:p-5 text-left hover:scale-105 transition">
          <div className="text-4xl mb-2"><Icon name="refresh" size={40} className="text-kid-blue" /></div>
          <div className="font-bold text-lg">今日复习</div>
          <div className="text-xs sm:text-sm text-gray-400">{reviewItems.length} 项待复习</div>
          {reviewItems.length > 0 && (
            <span className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-kid-orange text-white text-xs font-bold">
              {reviewItems.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

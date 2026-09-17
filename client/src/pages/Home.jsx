import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
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

  const moduleLabel = { characters: '汉字', english: '英语' };

  return (
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <div className="bg-gradient-to-br from-kid-orange to-kid-yellow rounded-3xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                <Icon name={activeChild.avatar} size={24} className="text-white" />
              </span>{activeChild.name}，你好！
            </h2>
            <p className="opacity-90 mt-1">今天也要加油学习哦～</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold inline-flex items-center gap-1">
              <Icon name="star" size={26} />{reward?.stars || 0}
            </div>
            <div className="text-sm opacity-80 inline-flex items-center gap-1 justify-end">
              <Icon name="flame" size={16} />连续 {reward?.streak || 0} 天
            </div>
          </div>
        </div>
      </div>

      {/* 今日复习 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-800 inline-flex items-center gap-2">
            <Icon name="refresh" size={22} className="text-kid-blue" />今日复习
          </h3>
          <span className="text-sm text-gray-400">{reviewItems.length} 项待复习</span>
        </div>
        {reviewItems.length === 0 ? (
          <p className="text-center text-gray-400 py-4">没有需要复习的内容，去学新知识吧！</p>
        ) : (
          <div className="space-y-2">
            {reviewItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-kid-yellow/10 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.detail?.emoji || '📖'}</span>
                  <div>
                    <div className="font-bold text-lg">{item.detail?.hanzi || item.detail?.english}</div>
                    <div className="text-xs text-gray-400">{moduleLabel[item.module]} · {item.memory_label} · 间隔 {[1,2,4,7,15][item.interval_level]}天</div>
                  </div>
                </div>
                <button onClick={() => item.module === 'characters' ? speak(item.detail.hanzi) : speak(item.detail.english, 'en-US')}
                  className="inline-flex items-center gap-1 bg-kid-blue text-white px-3 py-1 rounded-full text-sm font-bold">
                  <Icon name="speaker" size={16} />复习
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/courses')} className="bg-white rounded-3xl shadow-lg p-5 text-left hover:scale-105 transition">
          <div className="text-4xl mb-2"><Icon name="book" size={40} className="text-kid-blue" /></div>
          <div className="font-bold text-lg">开始学习</div>
          <div className="text-sm text-gray-400">汉字/英语/数学/绘本</div>
        </button>
        <button onClick={() => navigate('/rewards')} className="bg-white rounded-3xl shadow-lg p-5 text-left hover:scale-105 transition">
          <div className="text-4xl mb-2"><Icon name="trophy" size={40} className="text-kid-orange" /></div>
          <div className="font-bold text-lg">我的奖励</div>
          <div className="text-sm text-gray-400">星星/徽章/打卡</div>
        </button>
      </div>
    </div>
  );
}

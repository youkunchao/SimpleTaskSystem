import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Rewards() {
  const { activeChild } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/rewards/${activeChild.id}`).then(res => setData(res.data)).catch(() => {});
    }
  }, [activeChild]);

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (!data) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
        <Icon name="trophy" size={28} className="text-kid-orange" />我的奖励
      </h2>

      {/* 星星与打卡 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-kid-yellow to-kid-orange rounded-3xl shadow-lg p-6 text-white text-center">
          <div className="text-5xl mb-2"><Icon name="star" size={50} className="mx-auto" /></div>
          <div className="text-4xl font-bold">{data.stars}</div>
          <div className="text-sm opacity-90">星星总数</div>
        </div>
        <div className="bg-gradient-to-br from-kid-pink to-kid-purple rounded-3xl shadow-lg p-6 text-white text-center">
          <div className="text-5xl mb-2"><Icon name="flame" size={50} className="mx-auto" /></div>
          <div className="text-4xl font-bold">{data.streak}</div>
          <div className="text-sm opacity-90">连续打卡天数</div>
        </div>
      </div>

      {/* 学习统计 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3 inline-flex items-center gap-2">
          <Icon name="chart" size={20} className="text-kid-green" />学习成就
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-kid-blue/10 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-kid-blue">{data.studyCount}</div>
            <div className="text-sm text-gray-500">累计学习次数</div>
          </div>
          <div className="bg-kid-green/10 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-kid-green">{data.charMastered}</div>
            <div className="text-sm text-gray-500">已掌握汉字</div>
          </div>
        </div>
      </div>

      {/* 徽章墙 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3 inline-flex items-center gap-2">
          <Icon name="medal" size={20} className="text-kid-purple" />徽章墙
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {data.badges.map(b => (
            <div key={b.id} className={`rounded-2xl p-4 text-center transition ${
              b.unlocked ? 'bg-kid-yellow/20' : 'bg-gray-100 opacity-50'
            }`}>
              <div className="text-4xl mb-1">{b.unlocked ? b.icon : '🔒'}</div>
              <div className="text-sm font-bold text-gray-800">{b.name}</div>
              <div className="text-xs text-gray-500">{b.description}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-3">
          已解锁 {data.badges.filter(b => b.unlocked).length} / {data.badges.length} 枚徽章
        </p>
      </div>
    </div>
  );
}

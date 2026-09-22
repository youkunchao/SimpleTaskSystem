import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import BadgeWall from '../components/BadgeWall.jsx';

export default function Rewards() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/rewards/${activeChild.id}`).then(res => setData(res.data)).catch(() => {});
    }
  }, [activeChild]);

  if (!activeChild) return <p className="text-center text-kid-ink/40 py-10">请先选择孩子</p>;
  if (!data) return <p className="text-center text-kid-ink/40 py-10">加载中...</p>;

  return (
    <div className="space-y-5">
      <h2 className="page-title">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-kid-orange/15">
          <Icon name="trophy" size={22} className="text-kid-orange" />
        </span>
        我的奖励
      </h2>

      {/* 星星与打卡 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-kid-yellow to-kid-orange rounded-3xl shadow-kid-lg p-6 text-white text-center">
          <span className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/15" />
          <Icon name="star" size={48} className="mx-auto relative" />
          <div className="text-4xl font-extrabold relative mt-1">{data.stars}</div>
          <div className="text-sm opacity-90 relative">星星总数</div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-kid-pink to-kid-purple rounded-3xl shadow-kid-lg p-6 text-white text-center">
          <span className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/15" />
          <Icon name="flame" size={48} className="mx-auto relative" />
          <div className="text-4xl font-extrabold relative mt-1">{data.streak}</div>
          <div className="text-sm opacity-90 relative">连续打卡天数</div>
        </div>
      </div>

      {/* 学习统计 */}
      <div className="card-kid">
        <h3 className="text-lg font-extrabold text-kid-ink mb-3 inline-flex items-center gap-2">
          <Icon name="chart" size={20} className="text-kid-green" />学习成就
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-kid-blue/10 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-kid-blue">{data.studyCount}</div>
            <div className="text-sm text-kid-ink/50 mt-0.5">累计学习次数</div>
          </div>
          <div className="bg-kid-green/10 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-kid-green">{data.charMastered}</div>
            <div className="text-sm text-kid-ink/50 mt-0.5">已掌握汉字</div>
          </div>
        </div>
      </div>

      {/* 徽章墙（预览）：只展示少量，避免页面过长，完整收藏去「荣誉殿堂」 */}
      <BadgeWall
        badges={data.badges}
        stats={data.stats}
        limit={6}
        onViewAll={() => navigate('/badges')}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import BadgeWall from '../components/BadgeWall.jsx';

/**
 * 荣誉殿堂：徽章主页。
 * 徽章数量较多（40 枚），奖励页只做少量预览，完整收藏与筛选都放在这个独立页面，
 * 避免把奖励页拉得过长。
 */
export default function Badges() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/rewards/${activeChild.id}`).then(res => setData(res.data)).catch(() => {});
    }
  }, [activeChild]);

  if (!activeChild) return <p className="text-center text-kid-ink/40 py-10">请先选择孩子</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="icon-round bg-white text-kid-ink/70"
          title="返回"
        >
          <Icon name="back" size={20} />
        </button>
        <h2 className="page-title">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-kid-purple/15">
            <Icon name="crown" size={22} className="text-kid-purple" />
          </span>
          荣誉殿堂
        </h2>
      </div>

      {!data ? (
        <p className="text-center text-kid-ink/40 py-10">加载中...</p>
      ) : (
        <BadgeWall badges={data.badges} stats={data.stats} />
      )}
    </div>
  );
}

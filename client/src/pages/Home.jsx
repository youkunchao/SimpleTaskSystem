import React, { useState, useEffect } from 'react';
import { MODULE_LABELS, REVIEW_INTERVALS, reviewText, reviewEmoji, speakReview } from '../utils/review.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
import Icon from '../components/Icon.jsx';

// 复习卡内容：汉字显示字+拼音+释义，单词显示中英文，其余显示标题/题目
function ReviewDetail({ detail }) {
  if (!detail) return null;
  if (detail.hanzi) {
    return (
      <div className="text-center py-2">
        <div className="text-5xl font-bold text-kid-orange">{detail.hanzi}</div>
        {detail.pinyin && <div className="text-gray-600 mt-1">{detail.pinyin}</div>}
        {detail.meaning && <div className="text-gray-500 text-sm">{detail.meaning}</div>}
      </div>
    );
  }
  if (detail.english) {
    return (
      <div className="text-center py-2">
        <div className="text-4xl font-bold text-kid-blue">{detail.english}</div>
        <div className="text-gray-600 mt-1">{detail.chinese}</div>
      </div>
    );
  }
  // 其余模块：标题行已展示题目/标题，这里补充可看可听的材料
  const material = detail.passage || detail.content;
  return (
    <div className="space-y-2 py-1">
      {material && (
        <p className="text-gray-700 text-sm bg-white/70 rounded-xl p-3 leading-relaxed max-h-40 overflow-y-auto">
          {material}
        </p>
      )}
      {detail.explanation && <div className="text-sm text-gray-600">💡 {detail.explanation}</div>}
      {!material && !detail.explanation && (
        <div className="text-center text-sm text-gray-500">闭上眼睛想一想，再点「朗读」听一听～</div>
      )}
    </div>
  );
}

export default function Home() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [reviewItems, setReviewItems] = useState([]);
  const [reward, setReward] = useState(null);
  const [openReview, setOpenReview] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [reviewHint, setReviewHint] = useState('');

  const loadData = () => {
    if (activeChild) {
      api.get(`/progress/review/${activeChild.id}`).then(res => setReviewItems(res.data)).catch(() => {});
      api.get(`/rewards/${activeChild.id}`).then(res => setReward(res.data)).catch(() => {});
    }
  };

  useEffect(loadData, [activeChild]);

  // 朗读：按钮显示"播放中"，避免点了像没反应
  const handleSpeak = (item) => {
    setSpeakingId(item.id);
    speakReview(item, { onEnd: () => setSpeakingId(null) });
  };

  // 提交复习结果：记住了就提升记忆等级并加星，没记住则当天再来
  const submitReview = async (item, remembered) => {
    try {
      await api.post('/progress', {
        child_id: activeChild.id,
        module: item.module,
        item_id: item.item_id,
        correct: remembered,
        duration: 5,
        question: reviewText(item.detail),
        user_answer: remembered ? reviewText(item.detail) : '',
        correct_answer: reviewText(item.detail),
      });
      setReviewHint(remembered ? '太棒了！记住啦 +2 ⭐' : '没关系，明天再复习一次～');
      setOpenReview(null);
      loadData();
      setTimeout(() => setReviewHint(''), 2500);
    } catch (e) {
      setReviewHint('提交失败，请重试');
    }
  };

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
            {reviewHint && (
              <div className="text-center text-kid-green font-bold py-1">{reviewHint}</div>
            )}
            {reviewItems.map(item => (
              <div key={item.id} className="bg-kid-yellow/10 rounded-2xl p-3">
                <button
                  onClick={() => setOpenReview(openReview === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{reviewEmoji(item.detail)}</span>
                    <div>
                      <div className="font-bold text-lg">{reviewText(item.detail)}</div>
                      <div className="text-xs text-gray-400">
                        {MODULE_LABELS[item.module] || item.module} · {item.memory_label} · 间隔 {REVIEW_INTERVALS[item.interval_level] ?? REVIEW_INTERVALS[0]}天
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-kid-blue text-sm font-bold">
                    {openReview === item.id ? '收起 ⌄' : '复习 ›'}
                  </span>
                </button>

                {openReview === item.id && (
                  <div className="mt-3 pt-3 border-t-2 border-kid-yellow/40">
                    <ReviewDetail detail={item.detail} />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleSpeak(item)}
                        className="flex-1 py-2 rounded-xl bg-kid-blue text-white font-bold text-sm"
                      >
                        {speakingId === item.id ? '🔊 播放中…' : '🔊 朗读'}
                      </button>
                      <button
                        onClick={() => submitReview(item, true)}
                        className="flex-1 py-2 rounded-xl bg-kid-green text-white font-bold text-sm"
                      >
                        我记住了 ✓
                      </button>
                      <button
                        onClick={() => submitReview(item, false)}
                        className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-700 font-bold text-sm"
                      >
                        还没记住
                      </button>
                    </div>
                  </div>
                )}
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

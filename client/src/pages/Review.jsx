import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
import Icon from '../components/Icon.jsx';
import { MODULE_LABELS, REVIEW_INTERVALS, reviewText, reviewEmoji, speakReview } from '../utils/review.js';

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

export default function Review() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [reviewItems, setReviewItems] = useState([]);
  const [openReview, setOpenReview] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [reviewHint, setReviewHint] = useState('');

  const loadData = () => {
    if (activeChild) {
      api.get(`/progress/review/${activeChild.id}`).then(res => setReviewItems(res.data)).catch(() => {});
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
    return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
        <Icon name="refresh" size={26} className="text-kid-blue" />今日复习
      </h2>

      <div className="bg-white rounded-3xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">{reviewItems.length} 项待复习</span>
        </div>
        {reviewItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-gray-500">没有需要复习的内容，去学新知识吧！</p>
          </div>
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
    </div>
  );
}

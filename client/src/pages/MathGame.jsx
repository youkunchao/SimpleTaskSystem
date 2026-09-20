import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import ReadAloud from '../components/ReadAloud.jsx';

const TYPES = [
  { id: 'compare', name: '比大小', icon: 'scale' },
  { id: 'arithmetic', name: '加减法', icon: 'calculator' },
  { id: 'shape', name: '认图形', icon: 'shapes' },
];

// 把数学题面转成适合朗读的中文，避免 TTS 把 "8 + 5 = ?" 读成"八 加号 五 等号 问号"
function mathSpeakText(q) {
  if (/[<>]/.test(q)) {
    const nums = q.match(/\d+/g) || [];
    return nums.length >= 2 ? `${nums[0]} 和 ${nums[1]} 比大小` : q;
  }
  if (q.includes('+') || q.includes('-')) {
    return q.replace(/\+/g, '加').replace(/-/g, '减').replace(/=/g, '等于').replace(/\?/g, '几');
  }
  return q;
}

export default function MathGame() {
  const { activeChild } = useAuth();
  const [type, setType] = useState('compare');
  const [problems, setProblems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  const timerRef = useRef(null);
  const idxRef = useRef(0);
  const wrongRef = useRef(0);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  useEffect(() => {
    if (activeChild) {
      api.get(`/courses/math?type=${type}`).then(res => {
        const shuffled = [...res.data].sort(() => Math.random() - 0.5);
        setProblems(shuffled);
        setIdx(0); setScore(0); setAnswered(false); setFeedback(null);
        wrongRef.current = 0; setWrongCount(0);
      }).catch(() => {});
    }
    // 切换题型时取消尚未触发的跳转，避免跳到错误题号
    return () => clearTimeout(timerRef.current);
  }, [type, activeChild]);

  const current = problems[idx];

  // 进入下一题（答对时自动调用，答错时由孩子自己点）
  const goNext = () => {
    clearTimeout(timerRef.current);
    if (idxRef.current < problems.length - 1) {
      setIdx(idxRef.current + 1);
      setAnswered(false);
      setFeedback(null);
      wrongRef.current = 0;
      setWrongCount(0);
    } else {
      setFeedback('done');
    }
  };

  // 再试一次：同一题重做
  const retry = () => {
    clearTimeout(timerRef.current);
    setAnswered(false);
    setFeedback(null);
  };

  const handleAnswer = (optIdx) => {
    if (answered || !current) return;
    setAnswered(true);
    const correct = optIdx === current.answer;
    setFeedback(correct);
    if (correct) setScore(s => s + 1);
    api.post('/progress', { child_id: activeChild.id, module: 'math', item_id: current.id, correct, duration: 15 }).catch(() => {});
    clearTimeout(timerRef.current);
    if (correct) {
      // 答对：停留一下展示奖励后自动推进
      wrongRef.current = 0;
      setWrongCount(0);
      timerRef.current = setTimeout(goNext, 1500);
    } else {
      // 答错：停住，等孩子决定再试一次还是下一题
      wrongRef.current += 1;
      setWrongCount(wrongRef.current);
    }
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (problems.length === 0) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  const options = current ? JSON.parse(current.options) : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl font-bold transition-all duration-200 active:scale-95 ${
              type === t.id ? 'bg-kid-green text-white shadow-lg scale-105' : 'bg-white text-gray-500'
            }`}>
            <Icon name={t.icon} size={24} />
            <span className="text-xs mt-1">{t.name}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
        <div className="flex justify-between mb-4">
          <span className="text-lg font-bold text-kid-orange inline-flex items-center gap-1">
            得分: {score} <Icon name="star" size={18} />
          </span>
          <span className="text-lg text-gray-500">{idx + 1}/{problems.length}</span>
        </div>

        {feedback === 'done' ? (
          <div className="py-8">
            <div className="text-6xl mb-3"><Icon name="trophy" size={60} className="mx-auto text-kid-orange" /></div>
            <h2 className="text-2xl font-bold text-kid-green mb-2">游戏结束！</h2>
            <p className="text-xl text-gray-600">你答对了 {score} / {problems.length} 题</p>
            <button onClick={() => { setIdx(0); setScore(0); setAnswered(false); setFeedback(null); wrongRef.current = 0; setWrongCount(0); }}
              className="btn-kid bg-kid-blue text-white mt-4">再玩一次</button>
          </div>
        ) : current ? (
          <>
            <div className="flex items-center justify-center gap-3 text-5xl font-bold text-gray-800 my-8">
              {current.question}
              <ReadAloud text={mathSpeakText(current.question)} lang="zh-CN" size={28} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
                  className={`p-5 text-2xl font-bold rounded-2xl border-4 transition ${
                    !answered ? 'bg-gray-50 border-gray-200 hover:border-kid-green' :
                    i === current.answer ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                  }`}>{opt}</button>
              ))}
            </div>
            {feedback === true && (
              <div className="text-2xl font-bold mt-4 text-kid-green">
                🎉 答对啦！<span className="text-kid-yellow">得分 +1</span>
              </div>
            )}
            {feedback === false && (
              <div className="mt-4 space-y-3">
                <div className="text-2xl font-bold text-red-500">❌ 正确答案是「{options[current.answer]}」</div>
                {wrongCount >= 2 && (
                  <div className="text-sm text-gray-500">这题有点难，记住正确答案再继续哦</div>
                )}
                <div className="flex gap-2 justify-center">
                  <button onClick={retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                  <button onClick={goNext} className="btn-kid bg-kid-blue text-white">下一题</button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

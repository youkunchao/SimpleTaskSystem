import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';

const TYPES = [
  { id: 'compare', name: '比大小', icon: '⚖️' },
  { id: 'arithmetic', name: '加减法', icon: '➕' },
  { id: 'shape', name: '认图形', icon: '🔷' },
];

export default function MathGame() {
  const { activeChild } = useAuth();
  const [type, setType] = useState('compare');
  const [problems, setProblems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (activeChild) {
      api.get(`/courses/math?type=${type}`).then(res => {
        const shuffled = [...res.data].sort(() => Math.random() - 0.5);
        setProblems(shuffled);
        setIdx(0); setScore(0); setAnswered(false); setFeedback(null);
      }).catch(() => {});
    }
  }, [type, activeChild]);

  const current = problems[idx];

  const handleAnswer = (optIdx) => {
    if (answered || !current) return;
    setAnswered(true);
    const correct = optIdx === current.answer;
    setFeedback(correct);
    if (correct) setScore(s => s + 1);
    api.post('/progress', { child_id: activeChild.id, module: 'math', item_id: current.id, correct, duration: 15 }).catch(() => {});
    setTimeout(() => {
      if (idx < problems.length - 1) { setIdx(idx + 1); setAnswered(false); setFeedback(null); }
      else setFeedback('done');
    }, 1000);
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (problems.length === 0) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  const options = current ? JSON.parse(current.options) : [];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`px-4 py-2 rounded-2xl font-bold whitespace-nowrap ${type === t.id ? 'bg-kid-green text-white' : 'bg-white text-gray-600'}`}>
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
        <div className="flex justify-between mb-4">
          <span className="text-lg font-bold text-kid-orange">得分: {score} ⭐</span>
          <span className="text-lg text-gray-500">{idx + 1}/{problems.length}</span>
        </div>

        {feedback === 'done' ? (
          <div className="py-8">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-2xl font-bold text-kid-green mb-2">游戏结束！</h2>
            <p className="text-xl text-gray-600">你答对了 {score} / {problems.length} 题</p>
            <button onClick={() => { setIdx(0); setScore(0); setAnswered(false); setFeedback(null); }}
              className="btn-kid bg-kid-blue text-white mt-4">再玩一次</button>
          </div>
        ) : current ? (
          <>
            <div className="text-5xl font-bold text-gray-800 my-8">{current.question}</div>
            <div className="grid grid-cols-3 gap-3">
              {options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
                  className={`p-5 text-2xl font-bold rounded-2xl border-4 transition ${
                    !answered ? 'bg-gray-50 border-gray-200 hover:border-kid-green' :
                    i === current.answer ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                  }`}>{opt}</button>
              ))}
            </div>
            {feedback !== null && (
              <div className={`text-2xl font-bold mt-4 ${feedback ? 'text-kid-green' : 'text-red-500'}`}>
                {feedback ? '🎉 答对啦！' : '❌ 再想想～'}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

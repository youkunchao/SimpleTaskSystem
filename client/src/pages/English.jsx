import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';

const CATEGORIES = ['动物', '食物', '颜色', '数字', '家庭'];

export default function English() {
  const { activeChild } = useAuth();
  const [category, setCategory] = useState('动物');
  const [words, setWords] = useState([]);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState('learn');
  const [testAnswer, setTestAnswer] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/courses/words?category=${category}`).then(res => setWords(res.data)).catch(() => {});
      setIdx(0); setMode('learn'); setTestAnswer(null);
    }
  }, [category, activeChild]);

  const current = words[idx];

  const recordProgress = async (itemId, correct) => {
    try { await api.post('/progress', { child_id: activeChild.id, module: 'english', item_id: itemId, correct, duration: 10 }); } catch (e) {}
  };

  const submitTest = (ans) => {
    const correct = ans === current.english;
    setTestAnswer(correct);
    recordProgress(current.id, correct);
    setTimeout(() => {
      if (idx < words.length - 1) { setIdx(idx + 1); setMode('learn'); setTestAnswer(null); }
      else setMode('done');
    }, 1200);
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (words.length === 0) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  const wrongOptions = words.filter(w => w.id !== current.id).slice(0, 3).map(w => w.english);
  const options = [...wrongOptions, current.english].sort(() => Math.random() - 0.5);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-2xl font-bold whitespace-nowrap ${category === c ? 'bg-kid-purple text-white' : 'bg-white text-gray-600'}`}>
            {c}
          </button>
        ))}
      </div>

      {mode === 'learn' && current && (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-8xl mb-3">{current.emoji}</div>
          <div className="text-5xl font-bold text-kid-blue mb-2">{current.english}</div>
          <div className="text-2xl text-gray-600 mb-4">{current.chinese}</div>
          <button onClick={() => speak(current.english, 'en-US')} className="btn-kid bg-kid-blue text-white mr-2">🔊 听读音</button>
          <button onClick={() => { setMode('test'); setTestAnswer(null); }} className="btn-kid bg-kid-green text-white">🎯 选词测试</button>
          <div className="mt-4 text-sm text-gray-400">{idx + 1} / {words.length}</div>
        </div>
      )}

      {mode === 'test' && current && (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-3">{current.emoji}</div>
          <div className="text-2xl text-gray-600 mb-2">{current.chinese}</div>
          <div className="text-lg text-gray-500 mb-6">对应的英文单词是？</div>
          <div className="space-y-3 mb-4">
            {options.map((opt, i) => (
              <button key={i} onClick={() => submitTest(opt)} disabled={testAnswer !== null}
                className={`w-full p-4 text-2xl font-bold rounded-2xl border-4 transition ${
                  testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-blue' :
                  opt === current.english ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                }`}>{opt}</button>
            ))}
          </div>
          {testAnswer !== null && (
            <div className={`text-2xl font-bold ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
              {testAnswer ? '🎉 答对了！' : `❌ 正确答案是「${current.english}」`}
            </div>
          )}
        </div>
      )}

      {mode === 'done' && (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-3">🎊</div>
          <h2 className="text-2xl font-bold text-kid-purple mb-4">完成！</h2>
          <button onClick={() => { setIdx(0); setMode('learn'); }} className="btn-kid bg-kid-blue text-white">再来一遍</button>
        </div>
      )}
    </div>
  );
}

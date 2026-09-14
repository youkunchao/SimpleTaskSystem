import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';

const LEVELS = [
  { id: 1, name: 'L1 入门', desc: '简单象形字' },
  { id: 2, name: 'L2 基础', desc: '常用基础字' },
  { id: 3, name: 'L3 进阶', desc: '家人与情感' },
  { id: 4, name: 'L4 提高', desc: '学习与生活' },
];

export default function Characters() {
  const { activeChild } = useAuth();
  const [level, setLevel] = useState(1);
  const [chars, setChars] = useState([]);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState('learn'); // learn | test
  const [testAnswer, setTestAnswer] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/courses/characters?level=${level}`).then(res => setChars(res.data)).catch(() => {});
      setIdx(0);
      setMode('learn');
      setTestAnswer(null);
    }
  }, [level, activeChild]);

  const current = chars[idx];

  const recordProgress = async (itemId, correct) => {
    try {
      await api.post('/progress', { child_id: activeChild.id, module: 'characters', item_id: itemId, correct, duration: 10 });
    } catch (e) {}
  };

  const startTest = () => { setMode('test'); setTestAnswer(null); };

  const submitTest = (ans) => {
    const correct = ans === current.hanzi;
    setTestAnswer(correct);
    recordProgress(current.id, correct);
    setTimeout(() => {
      if (idx < chars.length - 1) {
        setIdx(idx + 1);
        setMode('learn');
        setTestAnswer(null);
      } else {
        setMode('done');
      }
    }, 1200);
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (chars.length === 0) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  const wrongOptions = chars.filter(c => c.id !== current.id).slice(0, 3).map(c => c.hanzi);
  const options = [...wrongOptions, current.hanzi].sort(() => Math.random() - 0.5);

  return (
    <div className="space-y-5">
      {/* 级别选择 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {LEVELS.map(l => (
          <button key={l.id} onClick={() => setLevel(l.id)}
            className={`px-4 py-2 rounded-2xl font-bold whitespace-nowrap ${level === l.id ? 'bg-kid-orange text-white' : 'bg-white text-gray-600'}`}>
            {l.name}
          </button>
        ))}
      </div>

      {/* 字卡 */}
      {mode === 'learn' && current && (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-8xl mb-3">{current.emoji}</div>
          <div className="text-7xl font-bold text-kid-orange mb-2" style={{ textShadow: '3px 3px 0 #FFE4B5' }}>{current.hanzi}</div>
          <div className="text-2xl text-gray-600 mb-1">{current.pinyin}</div>
          <div className="text-xl text-gray-500 mb-4">{current.meaning}</div>
          <div className="bg-kid-yellow/20 rounded-2xl p-3 mb-4">
            <div className="text-sm text-gray-500">组词</div>
            <div className="text-lg font-bold text-gray-700">{current.words}</div>
          </div>
          <button onClick={() => speak(current.hanzi)} className="btn-kid bg-kid-blue text-white mr-2">🔊 听读音</button>
          <button onClick={startTest} className="btn-kid bg-kid-green text-white">✏️ 我认识</button>
          <div className="mt-4 text-sm text-gray-400">{idx + 1} / {chars.length}</div>
        </div>
      )}

      {/* 测试 */}
      {mode === 'test' && current && (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-3">{current.emoji}</div>
          <div className="text-2xl text-gray-600 mb-2">{current.pinyin}</div>
          <div className="text-lg text-gray-500 mb-6">这是哪个字？</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {options.map((opt, i) => (
              <button key={i} onClick={() => submitTest(opt)}
                disabled={testAnswer !== null}
                className={`p-6 text-5xl font-bold rounded-2xl border-4 transition ${
                  testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-blue' :
                  opt === current.hanzi ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                }`}>{opt}</button>
            ))}
          </div>
          {testAnswer !== null && (
            <div className={`text-2xl font-bold ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
              {testAnswer ? '🎉 太棒了！' : `❌ 正确答案是「${current.hanzi}」`}
            </div>
          )}
        </div>
      )}

      {mode === 'done' && (
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-3">🎊</div>
          <h2 className="text-2xl font-bold text-kid-orange mb-4">本级完成！</h2>
          <p className="text-gray-500 mb-4">你已经学习了 {chars.length} 个汉字</p>
          <button onClick={() => { setIdx(0); setMode('learn'); }} className="btn-kid bg-kid-blue text-white">再来一遍</button>
        </div>
      )}
    </div>
  );
}

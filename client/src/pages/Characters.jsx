import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
import Icon from '../components/Icon.jsx';

const LEVELS = [
  { id: 1, name: 'L1 入门', desc: '简单象形字' },
  { id: 2, name: 'L2 基础', desc: '常用基础字' },
  { id: 3, name: 'L3 进阶', desc: '家人与情感' },
  { id: 4, name: 'L4 提高', desc: '学习与生活' },
];

const TABS = [
  { id: 'learn', name: '汉字', icon: 'pen' },
  { id: 'reading', name: '阅读', icon: 'book' },
  { id: 'wrong', name: '错题', icon: 'wrong' },
];

export default function Characters() {
  const { activeChild } = useAuth();
  const [tab, setTab] = useState('learn');
  const [level, setLevel] = useState(1);
  const [chars, setChars] = useState([]);
  const [readings, setReadings] = useState([]);
  const [wrongList, setWrongList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState('learn');
  const [testAnswer, setTestAnswer] = useState(null);

  const submitAnswer = async (module, item, correct, question, userAns, correctAns, explanation) => {
    setTestAnswer(correct);
    try {
      await api.post('/progress', {
        child_id: activeChild.id, module, item_id: item.id, correct, duration: 10,
        question, user_answer: userAns, correct_answer: correctAns, explanation,
      });
    } catch (e) {}
  };

  useEffect(() => { setIdx(0); setMode('learn'); setTestAnswer(null); }, [tab, level]);

  useEffect(() => {
    if (!activeChild) return;
    api.get(`/courses/characters?level=${level}`).then(r => setChars(r.data)).catch(() => {});
  }, [level, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'reading') return;
    api.get('/courses/chinese-reading').then(r => setReadings(r.data)).catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'wrong') return;
    api.get(`/progress/wrong/${activeChild.id}?module=characters`).then(r => setWrongList(r.data)).catch(() => {});
  }, [tab, activeChild]);

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  const current = chars[idx];
  const curRead = readings[idx];

  return (
    <div className="space-y-5">
      {/* Tab 导航 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'bg-kid-orange text-white' : 'bg-white text-gray-600'}`}>
            <Icon name={t.icon} size={20} />{t.name}
          </button>
        ))}
      </div>

      {/* 汉字认知 */}
      {tab === 'learn' && chars.length > 0 && current && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {LEVELS.map(l => (
              <button key={l.id} onClick={() => setLevel(l.id)}
                className={`tab-btn ${level === l.id ? 'bg-kid-orange text-white' : 'bg-white text-gray-600'}`}>
                {l.name}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            {mode === 'learn' ? (
              <>
                <div className="text-8xl mb-3">{current.emoji}</div>
                <div className="text-7xl font-bold text-kid-orange mb-2" style={{ textShadow: '3px 3px 0 #FFE4B5' }}>{current.hanzi}</div>
                <div className="text-2xl text-gray-600 mb-1">{current.pinyin}</div>
                <div className="text-xl text-gray-500 mb-4">{current.meaning}</div>
                <div className="bg-kid-yellow/20 rounded-2xl p-3 mb-4">
                  <div className="text-sm text-gray-500">组词</div>
                  <div className="text-lg font-bold text-gray-700">{current.words}</div>
                </div>
                <button onClick={() => speak(current.hanzi)} className="btn-kid bg-kid-blue text-white mr-2">
                  <Icon name="speaker" size={22} />听读音
                </button>
                <button onClick={() => { setMode('test'); setTestAnswer(null); }} className="btn-kid bg-kid-green text-white">
                  <Icon name="pencil" size={22} />我认识
                </button>
                <div className="mt-4 text-sm text-gray-400">{idx + 1} / {chars.length}</div>
              </>
            ) : mode === 'test' ? (
              <>
                <div className="text-6xl mb-3">{current.emoji}</div>
                <div className="text-2xl text-gray-600 mb-2">{current.pinyin}</div>
                <div className="text-lg text-gray-500 mb-6">这是哪个字？</div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[...chars.filter(c => c.id !== current.id).slice(0, 3), current].sort(() => Math.random() - 0.5).map((opt, i) => (
                    <button key={i} onClick={() => {
                      const correct = opt.id === current.id;
                      submitAnswer('characters', current, correct, current.pinyin, opt.hanzi, current.hanzi, '');
                      setTimeout(() => {
                        if (idx < chars.length - 1) { setIdx(idx + 1); setMode('learn'); setTestAnswer(null); }
                        else setMode('done');
                      }, 800);
                    }} disabled={testAnswer !== null}
                      className={`p-6 text-5xl font-bold rounded-2xl border-4 transition ${
                        testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-blue' :
                        opt.id === current.id ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                      }`}>{opt.hanzi}</button>
                  ))}
                </div>
                {testAnswer !== null && (
                  <div className={`text-2xl font-bold ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
                    {testAnswer ? '🎉 太棒了！' : `❌ 正确答案是「${current.hanzi}」`}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8">
                <div className="text-6xl mb-3">🎊</div>
                <h2 className="text-2xl font-bold text-kid-orange mb-4">本级完成！</h2>
                <p className="text-gray-500 mb-4">你已经学习了 {chars.length} 个汉字</p>
                <button onClick={() => { setIdx(0); setMode('learn'); }} className="btn-kid bg-kid-blue text-white">再来一遍</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 中文阅读理解 */}
      {tab === 'reading' && readings.length > 0 && curRead && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-orange/10 text-kid-orange px-3 py-1 rounded-full text-sm font-bold">L{curRead.level} 阅读</span>
            <span className="text-sm text-gray-400">{idx + 1}/{readings.length}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">{curRead.title}</h3>
          <p className="text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-2xl mb-4 text-lg">{curRead.content}</p>
          <div className="text-lg font-bold text-gray-800 mb-4">{curRead.question}</div>
          <div className="space-y-3">
            {JSON.parse(curRead.options).map((opt, i) => (
              <button key={i} onClick={() => {
                const correct = i === curRead.answer;
                submitAnswer('reading', curRead, correct, curRead.question, opt, JSON.parse(curRead.options)[curRead.answer], '');
                setTimeout(() => {
                  if (idx < readings.length - 1) { setIdx(idx + 1); setTestAnswer(null); }
                  else setMode('done');
                }, 800);
              }} disabled={testAnswer !== null}
                className={`w-full p-4 text-lg font-bold rounded-2xl border-4 transition text-left ${
                  testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-orange' :
                  i === curRead.answer ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                }`}>{String.fromCharCode(65 + i)}. {opt}</button>
            ))}
          </div>
          {testAnswer !== null && (
            <div className={`text-xl font-bold text-center mt-4 ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
              {testAnswer ? '🎉 答对了！' : `❌ 正确答案：${JSON.parse(curRead.options)[curRead.answer]}`}
            </div>
          )}
          {mode === 'done' && (
            <div className="text-center mt-4">
              <button onClick={() => { setIdx(0); setMode('learn'); setTestAnswer(null); }} className="btn-kid bg-kid-orange text-white">再来一遍</button>
            </div>
          )}
        </div>
      )}

      {/* 错题本 */}
      {tab === 'wrong' && (
        <div className="bg-white rounded-3xl shadow-xl p-5">
          <h3 className="text-xl font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Icon name="wrong" size={22} className="text-red-500" />汉字错题本
          </h3>
          {wrongList.length === 0 ? (
            <p className="text-center text-gray-400 py-8">太棒了，暂无错题！</p>
          ) : (
            <div className="space-y-3">
              {wrongList.map(w => (
                <div key={w.id} className="p-4 bg-red-50 rounded-2xl border-2 border-red-100">
                  <div className="font-bold text-gray-800 mb-2 text-lg">{w.question}</div>
                  <div className="text-sm space-y-1">
                    <div className="text-red-500">你的答案：{w.user_answer || '未作答'}</div>
                    <div className="text-kid-green">正确答案：{w.correct_answer}</div>
                    <div className="text-gray-400 text-xs mt-1">错了 {w.wrong_count} 次</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

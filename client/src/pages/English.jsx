import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
import Icon from '../components/Icon.jsx';

const CATEGORIES = ['动物', '食物', '水果', '颜色', '数字', '家庭', '家具', '球类', '交通', '衣物'];
const GRAMMAR_TYPES = [
  { id: 'noun', name: '名词' },
  { id: 'pronoun', name: '代词' },
  { id: 'tense', name: '时态' },
  { id: 'article', name: '冠词' },
  { id: 'prep', name: '介词' },
  { id: 'adj', name: '形容词' },
  { id: 'question', name: '疑问句' },
];

const TABS = [
  { id: 'words', name: '单词', icon: 'pencil' },
  { id: 'grammar', name: '语法', icon: 'grad' },
  { id: 'listening', name: '听力', icon: 'headphones' },
  { id: 'reading', name: '阅读', icon: 'book' },
  { id: 'wrong', name: '错题', icon: 'wrong' },
];

const MEMORY_LEVELS = ['陌生', '初识', '熟悉', '熟练', '精通'];
const MEMORY_COLORS = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700'];

export default function English() {
  const { activeChild } = useAuth();
  const [tab, setTab] = useState('words');
  const [category, setCategory] = useState('动物');
  const [words, setWords] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [listening, setListening] = useState([]);
  const [reading, setReading] = useState([]);
  const [wrongList, setWrongList] = useState([]);

  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState('learn');
  const [testAnswer, setTestAnswer] = useState(null);

  // 通用提交答案
  const submitAnswer = async (module, item, correct, question, userAns, correctAns, explanation) => {
    setTestAnswer(correct);
    try {
      await api.post('/progress', {
        child_id: activeChild.id, module, item_id: item.id, correct, duration: 15,
        question, user_answer: userAns, correct_answer: correctAns, explanation,
      });
    } catch (e) {}
    return correct;
  };

  const nextItem = (list) => {
    setTimeout(() => {
      if (idx < list.length - 1) { setIdx(idx + 1); setMode('learn'); setTestAnswer(null); }
      else setMode('done');
    }, 800);
  };

  useEffect(() => { setIdx(0); setMode('learn'); setTestAnswer(null); }, [tab, category]);

  // 加载各模块数据
  useEffect(() => {
    if (!activeChild) return;
    api.get('/courses/words', { params: { category } }).then(r => setWords(r.data)).catch(() => {});
  }, [category, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'grammar') return;
    api.get('/courses/grammar').then(r => setGrammar([...r.data].sort(() => Math.random() - 0.5))).catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'listening') return;
    api.get('/courses/listening').then(r => setListening(r.data)).catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'reading') return;
    api.get('/courses/reading').then(r => setReading(r.data)).catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'wrong') return;
    api.get(`/progress/wrong/${activeChild.id}?module=english`).then(r => setWrongList(r.data)).catch(() => {});
  }, [tab, activeChild]);

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  // ---- 单词模块 ----
  const curWord = words[idx];
  // ---- 语法模块 ----
  const curGram = grammar[idx];
  // ---- 听力模块 ----
  const curListen = listening[idx];
  // ---- 阅读模块 ----
  const curRead = reading[idx];

  return (
    <div className="space-y-4">
      {/* Tab 导航 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'bg-kid-purple text-white' : 'bg-white text-gray-600'}`}>
            <Icon name={t.icon} size={20} />{t.name}
          </button>
        ))}
      </div>

      {/* 单词记忆 */}
      {tab === 'words' && curWord && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`tab-btn ${category === c ? 'bg-kid-blue text-white' : 'bg-white text-gray-600'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            {mode === 'learn' ? (
              <>
                <div className="text-8xl mb-3">{curWord.emoji}</div>
                <div className="text-5xl font-bold text-kid-blue mb-2">{curWord.english}</div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-3xl text-gray-700">{curWord.chinese}</span>
                  <button onClick={() => speak(curWord.chinese, 'zh-CN')} className="text-kid-green" title="读中文">
                    <Icon name="speaker" size={22} />
                  </button>
                </div>
                <div className="text-sm text-gray-400 mb-4">中英文对照学习</div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => speak(curWord.english, 'en-US')} className="btn-kid bg-kid-blue text-white">
                    <Icon name="speaker" size={22} />英文
                  </button>
                  <button onClick={() => { setMode('test'); setTestAnswer(null); }} className="btn-kid bg-kid-green text-white">
                    <Icon name="target" size={22} />选词测试
                  </button>
                </div>
                <div className="mt-4 text-sm text-gray-400">{idx + 1} / {words.length}</div>
              </>
            ) : mode === 'test' ? (
              <>
                <div className="text-6xl mb-3">{curWord.emoji}</div>
                <div className="text-2xl text-gray-600 mb-2">{curWord.chinese}</div>
                <div className="text-lg text-gray-500 mb-6">对应的英文单词是？</div>
                <div className="space-y-3 mb-4">
                  {[...words.filter(w => w.id !== curWord.id).slice(0, 3), curWord].sort(() => Math.random() - 0.5).map((opt, i) => (
                    <button key={i} onClick={() => { submitAnswer('english', curWord, opt.id === curWord.id, curWord.chinese, opt.english, curWord.english, ''); nextItem(words); }}
                      disabled={testAnswer !== null}
                      className={`w-full p-4 text-2xl font-bold rounded-2xl border-4 transition ${
                        testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-blue' :
                        opt.id === curWord.id ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                      }`}>{opt.english}</button>
                  ))}
                </div>
                {testAnswer !== null && (
                  <div className={`text-2xl font-bold ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
                    {testAnswer ? '🎉 答对了！' : `❌ 正确答案是「${curWord.english}」`}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8">
                <div className="text-6xl mb-3">🎊</div>
                <h2 className="text-2xl font-bold text-kid-purple mb-4">完成！</h2>
                <button onClick={() => { setIdx(0); setMode('learn'); }} className="btn-kid bg-kid-blue text-white">再来一遍</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 语法练习 */}
      {tab === 'grammar' && curGram && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-purple/10 text-kid-purple px-3 py-1 rounded-full text-sm font-bold">{curGram.knowledge_point}</span>
            <span className="text-sm text-gray-400">{idx + 1}/{grammar.length}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-6 text-center">{curGram.question}</div>
          <div className="space-y-3">
            {JSON.parse(curGram.options).map((opt, i) => (
              <button key={i} onClick={() => { submitAnswer('grammar', curGram, i === curGram.answer, curGram.question, opt, JSON.parse(curGram.options)[curGram.answer], curGram.explanation); nextItem(grammar); }}
                disabled={testAnswer !== null}
                className={`w-full p-4 text-xl font-bold rounded-2xl border-4 transition text-left ${
                  testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-purple' :
                  i === curGram.answer ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                }`}>{String.fromCharCode(65 + i)}. {opt}</button>
            ))}
          </div>
          {testAnswer !== null && (
            <div className="mt-4 p-4 rounded-2xl bg-gray-50">
              <div className={`font-bold mb-1 ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
                {testAnswer ? '✅ 答对了！' : '❌ 答错了'}
              </div>
              <div className="text-sm text-gray-600">💡 {curGram.explanation}</div>
            </div>
          )}
        </div>
      )}

      {/* 听力训练 */}
      {tab === 'listening' && curListen && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-blue/10 text-kid-blue px-3 py-1 rounded-full text-sm font-bold">{curListen.category}</span>
            <span className="text-sm text-gray-400">{idx + 1}/{listening.length}</span>
          </div>
          <div className="text-center my-4">
            <button onClick={() => speak(curListen.content, 'en-US')} className="btn-kid bg-kid-blue text-white text-3xl">
              <Icon name="play" size={26} />播放听力
            </button>
          </div>
          <details className="mb-4">
            <summary className="text-kid-blue cursor-pointer text-sm">查看原文</summary>
            <p className="mt-2 p-3 bg-gray-50 rounded-xl text-gray-700">{curListen.content}</p>
          </details>
          <div className="text-xl font-bold text-gray-800 mb-4 text-center">{curListen.question}</div>
          <div className="grid grid-cols-2 gap-3">
            {JSON.parse(curListen.options).map((opt, i) => (
              <button key={i} onClick={() => { submitAnswer('listening', curListen, i === curListen.answer, curListen.question, opt, JSON.parse(curListen.options)[curListen.answer], ''); nextItem(listening); }}
                disabled={testAnswer !== null}
                className={`p-4 text-lg font-bold rounded-2xl border-4 transition ${
                  testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-blue' :
                  i === curListen.answer ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                }`}>{opt}</button>
            ))}
          </div>
          {testAnswer !== null && (
            <div className={`text-xl font-bold text-center mt-4 ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
              {testAnswer ? '🎉 答对了！' : `❌ 正确答案：${JSON.parse(curListen.options)[curListen.answer]}`}
            </div>
          )}
        </div>
      )}

      {/* 阅读理解 */}
      {tab === 'reading' && curRead && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-green/10 text-kid-green px-3 py-1 rounded-full text-sm font-bold">{curRead.category}</span>
            <span className="text-sm text-gray-400">{idx + 1}/{reading.length}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{curRead.title}</h3>
          <p className="text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-2xl mb-4">{curRead.passage}</p>
          <div className="text-lg font-bold text-gray-800 mb-4">{curRead.question}</div>
          <div className="space-y-3">
            {JSON.parse(curRead.options).map((opt, i) => (
              <button key={i} onClick={() => { submitAnswer('reading', curRead, i === curRead.answer, curRead.question, opt, JSON.parse(curRead.options)[curRead.answer], ''); nextItem(reading); }}
                disabled={testAnswer !== null}
                className={`w-full p-4 text-lg font-bold rounded-2xl border-4 transition text-left ${
                  testAnswer === null ? 'bg-gray-50 border-gray-200 hover:border-kid-green' :
                  i === curRead.answer ? 'bg-kid-green/30 border-kid-green' : 'bg-red-100 border-red-300'
                }`}>{String.fromCharCode(65 + i)}. {opt}</button>
            ))}
          </div>
          {testAnswer !== null && (
            <div className={`text-xl font-bold text-center mt-4 ${testAnswer ? 'text-kid-green' : 'text-red-500'}`}>
              {testAnswer ? '🎉 答对了！' : `❌ 正确答案：${JSON.parse(curRead.options)[curRead.answer]}`}
            </div>
          )}
        </div>
      )}

      {/* 错题本 */}
      {tab === 'wrong' && (
        <div className="bg-white rounded-3xl shadow-xl p-5">
          <h3 className="text-xl font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Icon name="wrong" size={22} className="text-red-500" />英语错题本
          </h3>
          {wrongList.length === 0 ? (
            <p className="text-center text-gray-400 py-8">太棒了，暂无错题！继续保持～</p>
          ) : (
            <div className="space-y-3">
              {wrongList.map(w => (
                <div key={w.id} className="p-4 bg-red-50 rounded-2xl border-2 border-red-100">
                  <div className="font-bold text-gray-800 mb-2">{w.question}</div>
                  <div className="text-sm space-y-1">
                    <div className="text-red-500">你的答案：{w.user_answer || '未作答'}</div>
                    <div className="text-kid-green">正确答案：{w.correct_answer}</div>
                    {w.explanation && <div className="text-gray-500 inline-flex items-center gap-1"><Icon name="info" size={14} /> {w.explanation}</div>}
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

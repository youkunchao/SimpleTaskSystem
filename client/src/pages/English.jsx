import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { speak } from '../api.js';
import Icon from '../components/Icon.jsx';
import LearningProgress from '../components/LearningProgress.jsx';
import AudioReader from '../components/AudioReader.jsx';
import { useQuiz } from '../hooks/useQuiz.js';

const CATEGORIES = ['动物', '食物', '水果', '颜色', '数字', '家庭', '家具', '球类', '交通', '衣物'];
// 给每个分类配一个图形，孩子认图比认字快
const CATEGORY_ICONS = {
  动物: '🐶', 食物: '🍔', 水果: '🍎', 颜色: '🎨', 数字: '🔢',
  家庭: '👨‍👩‍👧', 家具: '🛏️', 球类: '⚽', 交通: '🚗', 衣物: '👕',
};
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

// 错题本需要覆盖英语下的所有子模块
const WRONG_MODULES = 'english,grammar,listening,reading';

function DoneCard({ onRestart, color = 'text-kid-purple' }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
      <div className="text-6xl mb-3">🎊</div>
      <h2 className={`text-2xl font-bold ${color} mb-4`}>全部完成！</h2>
      <button onClick={onRestart} className="btn-kid bg-kid-blue text-white">再来一遍</button>
    </div>
  );
}

export default function English() {
  const { activeChild } = useAuth();
  const [tab, setTab] = useState('words');
  const [category, setCategory] = useState('动物');
  const [words, setWords] = useState([]);
  const [grammar, setGrammar] = useState([]);
  const [listening, setListening] = useState([]);
  const [reading, setReading] = useState([]);
  const [wrongList, setWrongList] = useState([]);

  // 答题节奏统一由 useQuiz 控制：答对自动推进，答错停下等孩子决定
  const quiz = useQuiz({ resetKey: `${tab}-${category}`, initialMode: 'learn' });
  const { idx, mode, testAnswer, wrongCount } = quiz;

  // 上报答题结果；答题节奏由 useQuiz 控制，这里不碰作答状态
  const submitAnswer = async (module, item, correct, question, userAns, correctAns, explanation) => {
    try {
      await api.post('/progress', {
        child_id: activeChild.id, module, item_id: item.id, correct, duration: 15,
        question, user_answer: userAns, correct_answer: correctAns, explanation,
      });
    } catch (e) {}
  };

  // 答对自动推进，答错停下来等孩子选择
  const handleAnswer = (module, item, isRight, hasLearnMode, listLength, question, userAns, correctAns, explanation) => {
    submitAnswer(module, item, isRight, question, userAns, correctAns, explanation);
    if (isRight) quiz.markCorrect(listLength);
    else quiz.markWrong(hasLearnMode);
  };

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
    api.get(`/progress/wrong/${activeChild.id}`, { params: { module: WRONG_MODULES } })
      .then(r => setWrongList(r.data)).catch(() => {});
  }, [tab, activeChild]);

  // 当前题目
  const curWord = words[idx];
  const curGram = grammar[idx];
  const curListen = listening[idx];
  const curRead = reading[idx];

  // 单词选项只按当前题目生成一次。
  // 之前直接在 JSX 里 sort 随机，导致每次渲染（包括答题后）都重新洗牌：
  // 用户点第 3 个选项，高亮却出现在第 1 个，看起来像"选对了却判错"。
  const wordOptions = useMemo(() => {
    if (!curWord) return [];
    // 同时按 id 和 english 排除，避免题库里存在重复单词时选项出现两个相同的词
    const others = words.filter(w => w.id !== curWord.id && w.english !== curWord.english)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    return [...others, curWord].sort(() => Math.random() - 0.5);
  }, [words, curWord]);

  const gramOptions = useMemo(() => (curGram ? JSON.parse(curGram.options) : []), [curGram]);
  const listenOptions = useMemo(() => (curListen ? JSON.parse(curListen.options) : []), [curListen]);
  const readOptions = useMemo(() => (curRead ? JSON.parse(curRead.options) : []), [curRead]);

  // 断点续学：进入单词模块时恢复上次学到第几个
  const [posReady, setPosReady] = useState(false);
  // 记录这次恢复对应哪个分类，避免切换分类时把上一个分类的位置写错地方
  const readyScopeRef = useRef('');
  useEffect(() => {
    if (!activeChild || tab !== 'words' || words.length === 0) return;
    setPosReady(false);
    readyScopeRef.current = '';
    api.get(`/learning/${activeChild.id}`, { params: { module: 'english', scope: category } })
      .then(r => {
        const pos = Number(r.data?.position || 0);
        if (pos > 0 && pos < words.length) quiz.jumpTo(pos, 'learn');
        readyScopeRef.current = category;
        setPosReady(true);
      })
      .catch(() => { readyScopeRef.current = category; setPosReady(true); });
  }, [activeChild, category, tab, words.length]);

  useEffect(() => {
    if (!activeChild || !posReady || tab !== 'words') return;
    if (readyScopeRef.current !== category) return;
    api.put('/learning', { child_id: activeChild.id, module: 'english', scope: category, position: idx })
      .catch(() => {});
  }, [idx, category, posReady, tab, activeChild]);

  const restartFromBegin = () => {
    api.put('/learning', { child_id: activeChild.id, module: 'english', scope: category, position: 0 }).catch(() => {});
    quiz.restart('learn');
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  return (
    <div className="space-y-4">
      {/* Tab 导航：一屏铺满，不用横向滑动 */}
      <div className="grid grid-cols-5 gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center justify-center py-2 rounded-2xl font-bold transition-all duration-200 active:scale-95 ${
              tab === t.id ? 'bg-kid-purple text-white shadow-lg scale-105' : 'bg-white text-gray-500'
            }`}>
            <Icon name={t.icon} size={24} />
            <span className="text-xs mt-1">{t.name}</span>
          </button>
        ))}
      </div>

      {/* 单词记忆 */}
      {tab === 'words' && (mode === 'done' ? (
        <DoneCard onRestart={() => quiz.restart('learn')} />
      ) : curWord && (
        <>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex flex-col items-center justify-center py-2 rounded-2xl font-bold transition-all duration-200 active:scale-95 ${
                  category === c ? 'bg-kid-blue text-white shadow-lg scale-105' : 'bg-white text-gray-600'
                }`}>
                <span className="text-2xl leading-none">{CATEGORY_ICONS[c] || '📘'}</span>
                <span className="text-xs mt-1">{c}</span>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <LearningProgress done={idx} total={words.length} unit="个单词" onRestart={restartFromBegin} gradient="from-kid-blue to-kid-purple" />
            {mode === 'learn' ? (
              <>
                {/* 学过的打勾、当前高亮、未学的灰显，点一下可跳到任意单词 */}
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {words.map((w, i) => (
                    <button key={w.id} onClick={() => quiz.jumpTo(i, 'learn')}
                      className={`w-11 h-11 rounded-xl text-xl border-2 transition ${
                        i < idx ? 'bg-kid-green/20 border-kid-green' :
                        i === idx ? 'bg-kid-blue border-kid-blue scale-110' :
                        'bg-gray-50 border-gray-200 opacity-50'
                      }`}>
                      {i < idx ? '✓' : w.emoji}
                    </button>
                  ))}
                </div>
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
                  <button onClick={quiz.startTest} className="btn-kid bg-kid-green text-white">
                    <Icon name="target" size={22} />选词测试
                  </button>
                </div>
                <div className="mt-4 text-sm text-gray-400">{idx + 1} / {words.length}</div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-3">{curWord.emoji}</div>
                <AudioReader
                  question={`${curWord.chinese}，对应的英文单词是？`}
                  options={wordOptions.map(o => o.english)}
                  lang="zh-CN"
                  correctIndex={wordOptions.findIndex(o => o.id === curWord.id)}
                  status={testAnswer}
                  disabled={testAnswer !== null}
                  onSelect={(i) => {
                    const opt = wordOptions[i];
                    handleAnswer('english', curWord, opt.id === curWord.id, true, words.length, 'learn', curWord.chinese, opt.english, curWord.english, '');
                  }}
                  footer={testAnswer === true ? (
                    <div className="text-2xl font-bold text-kid-green">
                      🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
                    </div>
                  ) : testAnswer === false ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-red-500">❌ 正确答案是「{curWord.english}」</div>
                      <div className="flex gap-2 justify-center">
                        <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                        <button onClick={() => quiz.goNext(words.length, 'learn')} className="btn-kid bg-kid-blue text-white">下一题</button>
                      </div>
                    </div>
                  ) : null}
                />
              </>
            )}
          </div>
        </>
      ))}

      {/* 语法练习 */}
      {tab === 'grammar' && (mode === 'done' ? (
        <DoneCard onRestart={() => quiz.restart('test')} />
      ) : curGram && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-purple/10 text-kid-purple px-3 py-1 rounded-full text-sm font-bold">{curGram.knowledge_point}</span>
            <span className="text-sm text-gray-400">{idx + 1}/{grammar.length}</span>
          </div>
          <AudioReader
            question={curGram.question}
            options={gramOptions}
            lang="en-US"
            correctIndex={curGram.answer}
            status={testAnswer}
            disabled={testAnswer !== null}
            onSelect={(i) => handleAnswer('grammar', curGram, i === curGram.answer, false, grammar.length, 'test', curGram.question, gramOptions[i], gramOptions[curGram.answer], curGram.explanation)}
            footer={testAnswer === true ? (
              <div className="mt-4 p-4 rounded-2xl bg-gray-50">
                <div className="font-bold text-kid-green">✅ 答对了！<span className="text-kid-yellow">+2 ⭐</span></div>
              </div>
            ) : testAnswer === false ? (
              <div className="mt-4 p-4 rounded-2xl bg-gray-50 space-y-3">
                <div>
                  <div className="font-bold text-red-500">❌ 答错了</div>
                  <div className="text-sm text-gray-600 mt-1">💡 {curGram.explanation}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                  <button onClick={() => quiz.goNext(grammar.length, 'test')} className="btn-kid bg-kid-blue text-white">下一题</button>
                </div>
              </div>
            ) : null}
          />
        </div>
      ))}

      {/* 听力训练 */}
      {tab === 'listening' && (mode === 'done' ? (
        <DoneCard onRestart={() => quiz.restart('test')} />
      ) : curListen && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-blue/10 text-kid-blue px-3 py-1 rounded-full text-sm font-bold">{curListen.category}</span>
            <span className="text-sm text-gray-400">{idx + 1}/{listening.length}</span>
          </div>
          <AudioReader
            passage={curListen.content}
            question={curListen.question}
            options={listenOptions}
            lang="en-US"
            correctIndex={curListen.answer}
            status={testAnswer}
            disabled={testAnswer !== null}
            onSelect={(i) => handleAnswer('listening', curListen, i === curListen.answer, false, listening.length, 'test', curListen.question, listenOptions[i], listenOptions[curListen.answer], '')}
            footer={testAnswer === true ? (
              <div className="text-xl font-bold text-center mt-4 text-kid-green">
                🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
              </div>
            ) : testAnswer === false ? (
              <div className="mt-4 space-y-3">
                <div className="text-xl font-bold text-center text-red-500">❌ 正确答案：{listenOptions[curListen.answer]}</div>
                <div className="flex gap-2 justify-center">
                  <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                  <button onClick={() => quiz.goNext(listening.length, 'test')} className="btn-kid bg-kid-blue text-white">下一题</button>
                </div>
              </div>
            ) : null}
          />
        </div>
      ))}

      {/* 阅读理解 */}
      {tab === 'reading' && (mode === 'done' ? (
        <DoneCard onRestart={() => quiz.restart('test')} />
      ) : curRead && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-green/10 text-kid-green px-3 py-1 rounded-full text-sm font-bold">{curRead.category}</span>
            <span className="text-sm text-gray-400">{idx + 1}/{reading.length}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{curRead.title}</h3>
          <AudioReader
            passage={curRead.passage}
            question={curRead.question}
            options={readOptions}
            lang="en-US"
            correctIndex={curRead.answer}
            status={testAnswer}
            disabled={testAnswer !== null}
            onSelect={(i) => handleAnswer('reading', curRead, i === curRead.answer, false, reading.length, 'test', curRead.question, readOptions[i], readOptions[curRead.answer], '')}
            footer={testAnswer === true ? (
              <div className="text-xl font-bold text-center mt-4 text-kid-green">
                🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
              </div>
            ) : testAnswer === false ? (
              <div className="mt-4 space-y-3">
                <div className="text-xl font-bold text-center text-red-500">❌ 正确答案：{readOptions[curRead.answer]}</div>
                <div className="flex gap-2 justify-center">
                  <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                  <button onClick={() => quiz.goNext(reading.length, 'test')} className="btn-kid bg-kid-blue text-white">下一题</button>
                </div>
              </div>
            ) : null}
          />
        </div>
      ))}

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

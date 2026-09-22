import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api.js';
import Icon from '../Icon.jsx';
import AudioReader from '../AudioReader.jsx';
import { useQuiz } from '../../hooks/useQuiz.js';
import { useLandscape } from '../../hooks/useLandscape.js';

// 技能练习：语法 / 听力 / 阅读 / 错题（从原 English 页整体抽出，行为保持不变）
const TABS = [
  { id: 'grammar', name: '语法', icon: 'grad' },
  { id: 'listening', name: '听力', icon: 'headphones' },
  { id: 'reading', name: '阅读', icon: 'book' },
  { id: 'wrong', name: '错题', icon: 'wrong' },
];
// 错题本需要覆盖英语下的所有子模块
const WRONG_MODULES = 'english,grammar,listening,reading';

function DoneCard({ onRestart }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
      <div className="text-6xl mb-3">🎊</div>
      <h2 className="text-2xl font-bold text-kid-purple mb-4">全部完成！</h2>
      <button onClick={onRestart} className="btn-kid bg-kid-blue text-white">
        再来一遍
      </button>
    </div>
  );
}

export default function SkillsTabs({ activeChild }) {
  const landscape = useLandscape();
  const [tab, setTab] = useState('grammar');
  const [grammar, setGrammar] = useState([]);
  const [listening, setListening] = useState([]);
  const [reading, setReading] = useState([]);
  const [wrongList, setWrongList] = useState([]);

  const quiz = useQuiz({ resetKey: tab, initialMode: 'test' });
  const { idx, mode, testAnswer } = quiz;

  useEffect(() => {
    if (!activeChild || tab !== 'grammar') return;
    api
      .get('/courses/grammar')
      .then((r) => setGrammar([...r.data].sort(() => Math.random() - 0.5)))
      .catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'listening') return;
    api.get('/courses/listening').then((r) => setListening(r.data)).catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'reading') return;
    api.get('/courses/reading').then((r) => setReading(r.data)).catch(() => {});
  }, [tab, activeChild]);

  useEffect(() => {
    if (!activeChild || tab !== 'wrong') return;
    api
      .get(`/progress/wrong/${activeChild.id}`, { params: { module: WRONG_MODULES } })
      .then((r) => setWrongList(r.data))
      .catch(() => {});
  }, [tab, activeChild]);

  const curGram = grammar[idx];
  const curListen = listening[idx];
  const curRead = reading[idx];

  const gramOptions = useMemo(() => (curGram ? JSON.parse(curGram.options) : []), [curGram]);
  const listenOptions = useMemo(() => (curListen ? JSON.parse(curListen.options) : []), [curListen]);
  const readOptions = useMemo(() => (curRead ? JSON.parse(curRead.options) : []), [curRead]);

  const submitAnswer = async (module, item, correct, question, userAns, correctAns, explanation) => {
    try {
      await api.post('/progress', {
        child_id: activeChild.id,
        module,
        item_id: item.id,
        correct,
        duration: 15,
        question,
        user_answer: userAns,
        correct_answer: correctAns,
        explanation,
      });
    } catch (e) {}
  };

  // 答对自动推进，答错停下来等孩子决定
  const handleAnswer = (module, item, isRight, hasLearnMode, listLength, question, userAns, correctAns, explanation) => {
    submitAnswer(module, item, isRight, question, userAns, correctAns, explanation);
    if (isRight) quiz.markCorrect(listLength);
    else quiz.markWrong(hasLearnMode);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center justify-center rounded-2xl font-bold transition-all duration-200 active:scale-95 ${
              landscape ? 'py-1.5' : 'py-2'
            } ${tab === t.id ? 'bg-kid-purple text-white shadow-lg scale-105' : 'bg-white text-gray-500'}`}
          >
            <Icon name={t.icon} size={landscape ? 18 : 22} />
            <span className={`mt-1 ${landscape ? 'text-[10px]' : 'text-xs'}`}>{t.name}</span>
          </button>
        ))}
      </div>

      {/* 语法练习 */}
      {tab === 'grammar' &&
        (mode === 'done' ? (
          <DoneCard onRestart={() => quiz.restart('test')} />
        ) : (
          curGram && (
            <div className={`bg-white rounded-3xl shadow-xl ${landscape ? 'p-4' : 'p-6'}`}>
              <div className="flex justify-between mb-3">
                <span className="bg-kid-purple/10 text-kid-purple px-3 py-1 rounded-full text-sm font-bold">
                  {curGram.knowledge_point}
                </span>
                <span className="text-sm text-gray-400">
                  {idx + 1}/{grammar.length}
                </span>
              </div>
              <AudioReader
                question={curGram.question}
                options={gramOptions}
                lang="en-US"
                correctIndex={curGram.answer}
                status={testAnswer}
                disabled={testAnswer !== null}
                compact={landscape}
                twoCol={landscape}
                onSelect={(i) =>
                  handleAnswer(
                    'grammar',
                    curGram,
                    i === curGram.answer,
                    false,
                    grammar.length,
                    curGram.question,
                    gramOptions[i],
                    gramOptions[curGram.answer],
                    curGram.explanation
                  )
                }
                footer={
                  testAnswer === true ? (
                    <div className="mt-4 p-4 rounded-2xl bg-gray-50">
                      <div className="font-bold text-kid-green">
                        ✅ 答对了！<span className="text-kid-yellow">+2 ⭐</span>
                      </div>
                    </div>
                  ) : testAnswer === false ? (
                    <div className="mt-4 p-4 rounded-2xl bg-gray-50 space-y-3">
                      <div>
                        <div className="font-bold text-amber-600">再看看正确答案</div>
                        <div className="text-sm text-gray-600 mt-1">💡 {curGram.explanation}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-kid-ink">
                          再试一次
                        </button>
                        <button onClick={() => quiz.goNext(grammar.length, 'test')} className="btn-kid bg-kid-blue text-white">
                          下一题
                        </button>
                      </div>
                    </div>
                  ) : null
                }
              />
            </div>
          )
        ))}

      {/* 听力训练 */}
      {tab === 'listening' &&
        (mode === 'done' ? (
          <DoneCard onRestart={() => quiz.restart('test')} />
        ) : (
          curListen && (
            <div className={`bg-white rounded-3xl shadow-xl ${landscape ? 'p-4' : 'p-6'}`}>
              <div className="flex justify-between mb-3">
                <span className="bg-kid-blue/10 text-kid-blue px-3 py-1 rounded-full text-sm font-bold">
                  {curListen.category}
                </span>
                <span className="text-sm text-gray-400">
                  {idx + 1}/{listening.length}
                </span>
              </div>
              <AudioReader
                passage={curListen.content}
                question={curListen.question}
                options={listenOptions}
                lang="en-US"
                correctIndex={curListen.answer}
                status={testAnswer}
                disabled={testAnswer !== null}
                compact={landscape}
                twoCol={landscape}
                onSelect={(i) =>
                  handleAnswer(
                    'listening',
                    curListen,
                    i === curListen.answer,
                    false,
                    listening.length,
                    curListen.question,
                    listenOptions[i],
                    listenOptions[curListen.answer],
                    ''
                  )
                }
                footer={
                  testAnswer === true ? (
                    <div className="text-xl font-bold text-center mt-4 text-kid-green">
                      🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
                    </div>
                  ) : testAnswer === false ? (
                    <div className="mt-4 space-y-3">
                      <div className="text-xl font-bold text-center text-amber-600">
                        正确答案：{listenOptions[curListen.answer]}
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-kid-ink">
                          再试一次
                        </button>
                        <button onClick={() => quiz.goNext(listening.length, 'test')} className="btn-kid bg-kid-blue text-white">
                          下一题
                        </button>
                      </div>
                    </div>
                  ) : null
                }
              />
            </div>
          )
        ))}

      {/* 阅读理解 */}
      {tab === 'reading' &&
        (mode === 'done' ? (
          <DoneCard onRestart={() => quiz.restart('test')} />
        ) : (
          curRead && (
            <div className={`bg-white rounded-3xl shadow-xl ${landscape ? 'p-4' : 'p-6'}`}>
              <div className="flex justify-between mb-3">
                <span className="bg-kid-green/10 text-kid-green px-3 py-1 rounded-full text-sm font-bold">
                  {curRead.category}
                </span>
                <span className="text-sm text-gray-400">
                  {idx + 1}/{reading.length}
                </span>
              </div>
              <h3 className={`font-bold text-gray-800 mb-2 ${landscape ? 'text-lg' : 'text-xl'}`}>
                {curRead.title}
              </h3>
              <AudioReader
                passage={curRead.passage}
                question={curRead.question}
                options={readOptions}
                lang="en-US"
                correctIndex={curRead.answer}
                status={testAnswer}
                disabled={testAnswer !== null}
                compact={landscape}
                twoCol={landscape}
                onSelect={(i) =>
                  handleAnswer(
                    'reading',
                    curRead,
                    i === curRead.answer,
                    false,
                    reading.length,
                    curRead.question,
                    readOptions[i],
                    readOptions[curRead.answer],
                    ''
                  )
                }
                footer={
                  testAnswer === true ? (
                    <div className="text-xl font-bold text-center mt-4 text-kid-green">
                      🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
                    </div>
                  ) : testAnswer === false ? (
                    <div className="mt-4 space-y-3">
                      <div className="text-xl font-bold text-center text-amber-600">
                        正确答案：{readOptions[curRead.answer]}
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-kid-ink">
                          再试一次
                        </button>
                        <button onClick={() => quiz.goNext(reading.length, 'test')} className="btn-kid bg-kid-blue text-white">
                          下一题
                        </button>
                      </div>
                    </div>
                  ) : null
                }
              />
            </div>
          )
        ))}

      {/* 错题本 */}
      {tab === 'wrong' && (
        <div className={`bg-white rounded-3xl shadow-xl ${landscape ? 'p-4' : 'p-5'}`}>
          <h3 className="text-xl font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
            <Icon name="wrong" size={22} className="text-red-500" />
            英语错题本
          </h3>
          {wrongList.length === 0 ? (
            <p className="text-center text-gray-400 py-8">太棒了，暂无错题！继续保持～</p>
          ) : (
            <div className="space-y-3">
              {wrongList.map((w) => (
                <div key={w.id} className="p-4 bg-red-50 rounded-2xl border-2 border-red-100">
                  <div className="font-bold text-gray-800 mb-2">{w.question}</div>
                  <div className="text-sm space-y-1">
                    <div className="text-red-500">你的答案：{w.user_answer || '未作答'}</div>
                    <div className="text-kid-green">正确答案：{w.correct_answer}</div>
                    {w.explanation && (
                      <div className="text-gray-500 inline-flex items-center gap-1">
                        <Icon name="info" size={14} /> {w.explanation}
                      </div>
                    )}
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

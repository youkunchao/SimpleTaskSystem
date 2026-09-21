import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import AudioReader from '../components/AudioReader.jsx';
import { useLandscape } from '../hooks/useLandscape.js';
import { useQuiz } from '../hooks/useQuiz.js';

// 独立模块：中文阅读（读短文 → 答问题），与"汉字学习"解耦
function DoneCard({ onRestart }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
      <div className="text-6xl mb-3">🎊</div>
      <h2 className="text-2xl font-bold text-kid-orange mb-4">阅读完成啦！</h2>
      <button onClick={onRestart} className="btn-kid bg-kid-blue text-[#3a2a1a]">再来一遍</button>
    </div>
  );
}

export default function ChineseReading() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [readings, setReadings] = useState([]);
  const landscape = useLandscape();
  // 纯答题模块：直接从 test 态开始
  const quiz = useQuiz({ resetKey: 'chinese-reading', initialMode: 'test' });
  const { idx, mode, testAnswer } = quiz;

  useEffect(() => {
    if (!activeChild) return;
    api.get('/courses/chinese-reading').then(r => setReadings(r.data)).catch(() => {});
  }, [activeChild]);

  const curRead = readings[idx];
  const readOptions = curRead ? JSON.parse(curRead.options) : [];

  // 上报答题结果
  const submitAnswer = async (item, correct, userAns, correctAns) => {
    try {
      await api.post('/progress', {
        child_id: activeChild.id, module: 'chinese-reading', item_id: item.id,
        correct, duration: 10, question: item.question, user_answer: userAns, correct_answer: correctAns, explanation: '',
      });
    } catch (e) {}
  };

  // 答对自动推进，答错停下等孩子选择
  const handleAnswer = (isRight, userAns, correctAns) => {
    submitAnswer(curRead, isRight, userAns, correctAns);
    if (isRight) quiz.markCorrect(readings.length, 'test');
    else quiz.markWrong(false);
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => navigate('/courses')} className="w-10 h-10 rounded-2xl bg-white shadow flex items-center justify-center active:scale-90" title="返回课程">
          <Icon name="back" size={20} className="text-gray-600" />
        </button>
        <h3 className="text-lg font-bold text-gray-800 inline-flex items-center gap-2">
          <Icon name="bookText" size={22} className="text-kid-green" />中文阅读
        </h3>
      </div>

      {mode === 'done' ? (
        <DoneCard onRestart={() => quiz.restart('test')} />
      ) : curRead && (
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between mb-3">
            <span className="bg-kid-green/10 text-kid-green px-3 py-1 rounded-full text-sm font-bold">L{curRead.level} 阅读</span>
            <span className="text-sm text-gray-400">{idx + 1}/{readings.length}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">{curRead.title}</h3>
          <AudioReader
            passage={curRead.content}
            question={curRead.question}
            options={readOptions}
            lang="zh-CN"
            correctIndex={curRead.answer}
            status={testAnswer}
            disabled={testAnswer !== null}
            twoCol={landscape}
            compact={landscape}
            onSelect={(i) => handleAnswer(i === curRead.answer, readOptions[i], readOptions[curRead.answer])}
            footer={testAnswer === true ? (
              <div className="text-xl font-bold text-center mt-4 text-kid-green">
                🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
              </div>
            ) : testAnswer === false ? (
              <div className="mt-4 space-y-3">
                <div className="text-xl font-bold text-center text-red-500">❌ 正确答案：{readOptions[curRead.answer]}</div>
                <div className="flex gap-2 justify-center">
                  <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-[#3a2a1a]">再试一次</button>
                  <button onClick={() => quiz.goNext(readings.length, 'test')} className="btn-kid bg-kid-blue text-[#3a2a1a]">下一题</button>
                </div>
              </div>
            ) : null}
          />
        </div>
      )}
    </div>
  );
}

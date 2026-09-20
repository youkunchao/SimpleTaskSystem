import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import AudioReader from '../components/AudioReader.jsx';
import HanziStudy from '../components/HanziStudy.jsx';
import HanziMap from '../components/HanziMap.jsx';
import { useQuiz } from '../hooks/useQuiz.js';

// 错题本需要覆盖汉字下的所有子模块
const WRONG_MODULES = 'characters,chinese-reading';
// 汉字地图不再分关：一条连续轨道展示全部汉字，靠懒加载渲染
const LEARN_SCOPE = 'all';

function DoneCard({ onRestart }) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
      <div className="text-6xl mb-3">🎊</div>
      <h2 className="text-2xl font-bold text-kid-orange mb-4">本级完成！</h2>
      <button onClick={onRestart} className="btn-kid bg-kid-blue text-white">再来一遍</button>
    </div>
  );
}

// 阅读 / 错题等子页面的返回头
function SubHeader({ title, icon, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white shadow flex items-center justify-center active:scale-90" title="返回地图">
        <Icon name="back" size={20} className="text-gray-600" />
      </button>
      <h3 className="text-lg font-bold text-gray-800 inline-flex items-center gap-2">
        <Icon name={icon} size={22} className="text-kid-orange" />{title}
      </h3>
    </div>
  );
}

export default function Characters() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const [chars, setChars] = useState([]);
  const [readings, setReadings] = useState([]);
  const [wrongList, setWrongList] = useState([]);
  // 五步学习：当前学到第几个字、是否学完
  const [studyIdx, setStudyIdx] = useState(0);
  const [studyDone, setStudyDone] = useState(false);
  // map = 地图选字；study = 五步学习；library = 字库；reading = 中文阅读；wrong = 错题本
  const [view, setView] = useState('map');
  // 答题节奏统一由 useQuiz 控制：答对自动推进，答错停下等孩子决定
  const quiz = useQuiz({ resetKey: view === 'reading' ? 'reading' : 'learn', initialMode: 'learn' });
  const { idx, mode, testAnswer } = quiz;

  // 上报答题结果；答题节奏由 useQuiz 控制，这里不碰作答状态
  const submitAnswer = async (module, item, correct, question, userAns, correctAns, explanation) => {
    try {
      await api.post('/progress', {
        child_id: activeChild.id, module, item_id: item.id, correct, duration: 10,
        question, user_answer: userAns, correct_answer: correctAns, explanation,
      });
    } catch (e) {}
  };

  // 答对自动推进，答错停下来等孩子选择
  const handleAnswer = (module, item, isRight, hasLearnMode, listLength, nextMode, question, userAns, correctAns, explanation) => {
    submitAnswer(module, item, isRight, question, userAns, correctAns, explanation);
    if (isRight) quiz.markCorrect(listLength, nextMode);
    else quiz.markWrong(hasLearnMode);
  };

  // 一次性加载全部汉字（不分关），地图靠懒加载渲染，1000 字也不卡
  useEffect(() => {
    if (!activeChild) return;
    api.get('/courses/characters').then(r => setChars(r.data)).catch(() => {});
  }, [activeChild]);

  // 中文阅读理解
  useEffect(() => {
    if (!activeChild || view !== 'reading') return;
    api.get('/courses/chinese-reading').then(r => setReadings(r.data)).catch(() => {});
  }, [view, activeChild]);

  // 错题本
  useEffect(() => {
    if (!activeChild || view !== 'wrong') return;
    api.get(`/progress/wrong/${activeChild.id}`, { params: { module: WRONG_MODULES } })
      .then(r => setWrongList(r.data)).catch(() => {});
  }, [view, activeChild]);

  const studyChar = chars[studyIdx];
  const curRead = readings[idx];

  // 五步学习选项：每次换字洗牌一次（从全部汉字里取 4 个）
  const charOptions = useMemo(() => {
    if (!studyChar || chars.length < 2) return [];
    const others = chars.filter(c => c.id !== studyChar.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return [...others, studyChar].sort(() => Math.random() - 0.5);
  }, [chars, studyChar?.id]);

  const readOptions = useMemo(() => (curRead ? JSON.parse(curRead.options) : []), [curRead]);

  // 断点续学：进入时恢复上次学到的第几个字
  const [posReady, setPosReady] = useState(false);
  const readyScopeRef = useRef('');
  useEffect(() => {
    if (!activeChild || chars.length === 0) return;
    setPosReady(false);
    readyScopeRef.current = '';
    api.get(`/learning/${activeChild.id}`, { params: { module: 'characters', scope: LEARN_SCOPE } })
      .then(r => {
        const pos = Number(r.data?.position || 0);
        if (pos > 0 && pos < chars.length) setStudyIdx(pos);
        readyScopeRef.current = LEARN_SCOPE;
        setPosReady(true);
      })
      .catch(() => { readyScopeRef.current = LEARN_SCOPE; setPosReady(true); });
  }, [activeChild, chars.length]);

  // 位置推进时保存，下次进来接着学
  useEffect(() => {
    if (!activeChild || !posReady) return;
    if (readyScopeRef.current !== LEARN_SCOPE) return;
    api.put('/learning', { child_id: activeChild.id, module: 'characters', scope: LEARN_SCOPE, position: studyIdx })
      .catch(() => {});
  }, [studyIdx, posReady, activeChild]);

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  // 中文阅读理解
  if (view === 'reading') {
    return (
      <div className="p-4 space-y-4">
        <SubHeader title="中文阅读" icon="bookText" onBack={() => setView('map')} />
        {mode === 'done' ? (
          <DoneCard onRestart={() => quiz.restart('test')} />
        ) : curRead && (
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex justify-between mb-3">
              <span className="bg-kid-orange/10 text-kid-orange px-3 py-1 rounded-full text-sm font-bold">L{curRead.level} 阅读</span>
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
              onSelect={(i) => handleAnswer('chinese-reading', curRead, i === curRead.answer, false, readings.length, 'test', curRead.question, readOptions[i], readOptions[curRead.answer], '')}
              footer={testAnswer === true ? (
                <div className="text-xl font-bold text-center mt-4 text-kid-green">
                  🎉 答对了！<span className="text-kid-yellow">+2 ⭐</span>
                </div>
              ) : testAnswer === false ? (
                <div className="mt-4 space-y-3">
                  <div className="text-xl font-bold text-center text-red-500">❌ 正确答案：{readOptions[curRead.answer]}</div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                    <button onClick={() => quiz.goNext(readings.length, 'test')} className="btn-kid bg-kid-blue text-white">下一题</button>
                  </div>
                </div>
              ) : null}
            />
          </div>
        )}
      </div>
    );
  }

  // 错题本
  if (view === 'wrong') {
    return (
      <div className="p-4 space-y-4">
        <SubHeader title="汉字错题本" icon="wrong" onBack={() => setView('map')} />
        <div className="bg-white rounded-3xl shadow-xl p-5">
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
      </div>
    );
  }

  // 字库
  if (view === 'library') {
    return (
      <div className="p-4 space-y-4">
        <SubHeader title="字库" icon="listChecks" onBack={() => setView('map')} />
        <div className="bg-white rounded-3xl shadow-xl p-4">
          <div className="grid grid-cols-5 gap-2">
            {chars.map((c, i) => (
              <button key={c.id} onClick={() => { setStudyIdx(i); setStudyDone(false); setView('study'); }}
                className={`flex flex-col items-center py-1.5 rounded-xl border-2 transition active:scale-95 ${
                  i < studyIdx ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'
                }`}>
                <span className="text-2xl font-bold text-gray-700">{c.hanzi}</span>
                <span className="text-[10px] text-gray-400">{c.pinyin}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 五步学习
  if (view === 'study' && studyChar) {
    return (
      <HanziStudy
        char={studyChar}
        charOptions={charOptions.map(o => o.hanzi)}
        correctIndex={charOptions.findIndex(o => o.id === studyChar.id)}
        index={studyIdx}
        total={chars.length}
        onSubmit={(ok, userAns, correctAns) => submitAnswer('characters', studyChar, ok, studyChar.pinyin, userAns, correctAns, '')}
        onNext={() => { if (studyIdx < chars.length - 1) setStudyIdx(studyIdx + 1); else setStudyDone(true); }}
        onRestart={() => { setStudyIdx(0); setStudyDone(false); setView('map'); }}
        onBack={() => setView('map')}
        done={studyDone}
      />
    );
  }

  // 首页：卡通闯关地图（横屏左右拖动 / 竖屏上下拖动，懒加载）
  return (
    <div className="space-y-5">
      {!chars.length ? (
        <p className="text-center text-gray-400 py-10">加载中...</p>
      ) : (
        <HanziMap
          chars={chars}
          currentIdx={studyIdx}
          child={activeChild}
          onPick={(i) => { setStudyIdx(i); setStudyDone(false); setView('study'); }}
          onBack={() => navigate('/courses')}
          onSettings={() => navigate('/settings')}
          onBooks={() => navigate('/books')}
          onReading={() => setView('reading')}
          onReview={() => setView('wrong')}
          onLibrary={() => setView('library')}
        />
      )}
    </div>
  );
}

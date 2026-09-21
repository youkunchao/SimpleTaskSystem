import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { buildLesson } from '../utils/lessonContent.js';
import Icon from '../components/Icon.jsx';
import HanziStudy from '../components/HanziStudy.jsx';
import HanziMap from '../components/HanziMap.jsx';

// 错题本：汉字学习只覆盖汉字本身（中文阅读已独立为单独模块）
const WRONG_MODULES = 'characters';
// 汉字地图不再分关：一条连续轨道展示全部汉字，靠懒加载渲染
const LEARN_SCOPE = 'all';

// 错题 / 字库等子页面的返回头
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
  const [wrongList, setWrongList] = useState([]);
  // 五步学习：当前学到第几个字、是否学完
  const [studyIdx, setStudyIdx] = useState(0);
  const [studyDone, setStudyDone] = useState(false);
  // map = 地图选字；study = 五步学习；library = 字库；wrong = 错题本
  const [view, setView] = useState('map');

  // 上报答题结果
  const submitAnswer = async (module, item, correct, question, userAns, correctAns, explanation) => {
    try {
      await api.post('/progress', {
        child_id: activeChild.id, module, item_id: item.id, correct, duration: 10,
        question, user_answer: userAns, correct_answer: correctAns, explanation,
      });
    } catch (e) {}
  };

  // 一次性加载全部汉字（不分关），地图靠懒加载渲染，1000 字也不卡
  useEffect(() => {
    if (!activeChild) return;
    api.get('/courses/characters').then(r => setChars(r.data)).catch(() => {});
  }, [activeChild]);

  // 错题本
  useEffect(() => {
    if (!activeChild || view !== 'wrong') return;
    api.get(`/progress/wrong/${activeChild.id}`, { params: { module: WRONG_MODULES } })
      .then(r => setWrongList(r.data)).catch(() => {});
  }, [view, activeChild]);

  const studyChar = chars[studyIdx];

  // 轻提示（解锁规则 / 模式 B 引导）
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  // 五步内容：用规范生成器为每个字产出 玩/认/说/练/写（仅用已解锁字组题）
  const lesson = useMemo(() => {
    if (!studyChar || chars.length === 0) return null;
    return buildLesson(studyChar, chars, studyIdx);
  }, [chars, studyChar?.id, studyIdx]);

  // 已解锁边界：index <= studyIdx 可正式学习；之后的字需切到「模式 B·自由探索」
  const unlockedIdx = studyIdx;

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
            {chars.map((c, i) => {
              const locked = i > unlockedIdx; // 未解锁：主线模式不可正式学习
              return (
                <button key={c.id}
                  onClick={() => locked
                    ? showToast('正式学习要按顺序解锁哦～想提前看后面的字，请切换到「模式 B·自由探索」')
                    : (() => { setStudyIdx(i); setStudyDone(false); setView('study'); })()}
                  className={`flex flex-col items-center py-1.5 rounded-xl border-2 transition active:scale-95 ${
                    locked
                      ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                      : i < studyIdx ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                  <span className={`text-2xl font-bold ${locked ? 'text-gray-400' : 'text-gray-700'}`}>{locked ? '🔒' : c.hanzi}</span>
                  <span className="text-[10px] text-gray-400">{locked ? '未解锁' : c.pinyin}</span>
                </button>
              );
            })}
          </div>
        </div>
        {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-black/80 text-white text-sm rounded-full px-4 py-2 shadow-lg">{toast}</div>}
      </div>
    );
  }

  // 五步学习
  if (view === 'study' && studyChar) {
    return (
      <HanziStudy
        char={studyChar}
        lesson={lesson}
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
        <>
          <HanziMap
            chars={chars}
            currentIdx={studyIdx}
            unlockedIdx={unlockedIdx}
            child={activeChild}
            onPick={(i) => { setStudyIdx(i); setStudyDone(false); setView('study'); }}
            onLockedPick={() => showToast('正式学习要按顺序解锁哦～想提前看后面的字，请切换到「模式 B·自由探索」')}
            onBack={() => navigate('/courses')}
            onSettings={() => navigate('/settings')}
            onBooks={() => navigate('/books')}
            onReview={() => setView('wrong')}
            onLibrary={() => setView('library')}
          />
          {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-black/80 text-white text-sm rounded-full px-4 py-2 shadow-lg">{toast}</div>}
        </>
      )}
    </div>
  );
}

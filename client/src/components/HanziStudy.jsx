import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { speak, cancelSpeak, prefetchEdge, clearEdgeCache } from '../api.js';
import HanziWriter from 'hanzi-writer';
import { useLandscape } from '../hooks/useLandscape.js';
import { getEmoji } from '../utils/lessonContent.js';
import { getStars, addStars, subscribeStars } from '../utils/stars.js';

// 洪恩式五步学习法：玩 → 认 → 说 → 练 → 写（v3.0 固定顺序）
const STEPS = [
  { id: 'play', name: '玩', color: 'bg-kid-pink' },
  { id: 'know', name: '认', color: 'bg-kid-orange' },
  { id: 'speak', name: '说', color: 'bg-kid-green' },
  { id: 'practice', name: '练', color: 'bg-kid-blue' },
  { id: 'write', name: '写', color: 'bg-kid-purple' },
];

/* 全局星星展示 hook */
function useStars() {
  const [s, setS] = useState(getStars());
  useEffect(() => subscribeStars(setS), []);
  return s;
}

/* ---------- 练：固定 4 选 1，每题重试 ≤2，每题 1 星（v3.0） ---------- */
function PracticePanel({ qs, landscape, awardStar }) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState(null); // null | 选中的下标 | 'done'
  const [retries, setRetries] = useState(0);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [shake, setShake] = useState(false);
  const [finished, setFinished] = useState(false);
  const q = qs[i];

  // 切题重置；听音题进题自动播题干音频（v3.0 自动播放规则）
  useEffect(() => {
    setAns(null); setRetries(0); setRevealCorrect(false); setShake(false);
    if (q.type === 'listen') speak(q.audio || q.句子 || q.提问, 'zh-CN');
  }, [i]); // eslint-disable-line

  const pick = (idx) => {
    if (ans !== null || finished) return;
    if (idx === q.correctIndex) {
      setAns(idx);
      awardStar(); // 每答对1题1星
      setTimeout(() => {
        if (i < qs.length - 1) setI(i + 1);
        else setFinished(true);
      }, 800);
    } else if (retries >= 1) {
      // 第2次答错：温和提示 + 高亮正确项 + 自动下一题（铁律4：不打叉、不显"错误"）
      setAns(idx);
      setRevealCorrect(true);
      setTimeout(() => {
        if (i < qs.length - 1) setI(i + 1);
        else setFinished(true);
      }, 1400);
    } else {
      setRetries(1);
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
  };

  const optCls = (idx) => {
    let base = 'w-full p-3 text-lg font-bold rounded-2xl border-4 transition text-left ';
    if (ans === null) return base + 'bg-gray-50 border-gray-200 hover:border-kid-orange';
    if (revealCorrect && idx === q.correctIndex) return base + 'bg-kid-green/30 border-kid-green';
    if (idx === q.correctIndex) return base + 'bg-kid-green/30 border-kid-green';
    if (ans === idx) return base + 'bg-amber-100 border-amber-300';
    return base + 'bg-gray-50 border-gray-200 opacity-60';
  };

  return (
    <div className={`w-full ${landscape ? 'max-w-lg p-3' : 'max-w-md p-4'} bg-white/95 rounded-3xl shadow-xl`}>
      <div className="flex items-center justify-between mb-3">
        <span className="bg-kid-blue/15 text-kid-blue font-bold rounded-full px-3 py-1 text-sm">第 {i + 1} / {qs.length} 题</span>
        {q.type === 'listen' && (
          <button onClick={() => speak(q.audio, 'zh-CN')}
            className="btn-3d bg-kid-yellow text-[#3a2a1a] px-3 py-1 inline-flex items-center gap-1 text-sm">
            <Icon name="speaker" size={16} />听一听
          </button>
        )}
      </div>

      {/* 题面 */}
      {q.type === 'listen' && (
        <div className={`text-center font-bold text-kid-orange ${landscape ? 'text-5xl' : 'text-6xl'}`} style={{ WebkitTextStroke: '2px #7a3e12' }}>{q.audio}</div>
      )}
      {q.type === 'look' && (
        <div className="text-center space-y-1">
          <div className={`${landscape ? 'text-3xl' : 'text-4xl'}`}>🖼️</div>
          <div className="text-gray-500 text-sm">{q.配图}</div>
        </div>
      )}
      {q.type === 'fill' && (
        <div className={`text-center font-bold text-gray-800 ${landscape ? 'text-xl' : 'text-2xl'}`}>
          {q.句子.split('___').map((seg, k, arr) => (
            <span key={k}>{seg}{k < arr.length - 1 && <span className="inline-block w-8 border-b-4 border-kid-orange mx-1 align-middle" />}</span>
          ))}
        </div>
      )}
      <div className={`text-center font-bold text-gray-700 mt-2 ${landscape ? 'text-base' : 'text-lg'}`}>{q.提问}</div>

      {/* 选项：固定 4 选 1 */}
      <div className={`mt-3 ${landscape ? 'grid grid-cols-2 gap-2' : 'space-y-3'} ${shake ? 'animate-pulse' : ''}`}>
        {q.options.map((opt, idx) => (
          <button key={idx} onClick={() => pick(idx)} disabled={ans !== null}
            className={optCls(idx)}>
            {String.fromCharCode(65 + idx)}. {opt}
          </button>
        ))}
      </div>

      {/* 反馈（铁律4：只鼓励，不打叉） */}
      <div className="mt-3 text-center min-h-[3rem]">
        {ans === null ? null : (ans === q.correctIndex || revealCorrect) ? (
          revealCorrect && ans !== q.correctIndex ? (
            <div className="text-xl font-bold text-amber-600">看看这个字~</div>
          ) : (
            <div className="text-2xl font-bold text-kid-green">🎉 真棒！<span className="text-kid-yellow">+1 ⭐</span></div>
          )
        ) : (
          <div className="text-xl font-bold text-amber-600">再试试~</div>
        )}
        {finished && <div className="text-xl font-bold text-kid-green mt-1">这一关练完啦，真棒！</div>}
      </div>
    </div>
  );
}

/* ---------- 说：三层递进 + 麦克风跟读 + 每层1星 + 完成大星（v3.0） ---------- */
function SpeakPanel({ lesson, landscape, awardStar }) {
  const s = lesson.speak || {};
  const layers = [];
  layers.push({ key: '1', label: '单字', py: s.pinyin, text: s.hanzi, img: s.hanzi, demo: s.hanzi });
  if (s.word) layers.push({ key: '2', label: '词语', py: s.wordPinyin, text: s.word, img: s.wordImg, demo: s.word });
  if (s.sentence) layers.push({ key: '3', label: '短句', py: s.sentencePinyin, text: s.sentence, img: s.sentenceImg, demo: s.sentence });

  const [li, setLi] = useState(0);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | listening | ok | retry | noise | skip
  const [done, setDone] = useState(false);
  const layer = layers[li];
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // 进入每一层自动播示范读音（v3.0 自动播放规则）
  useEffect(() => {
    if (done) return;
    setRetry(0); setStatus('idle');
    speak(layer.demo || layer.text, 'zh-CN');
  }, [li, done]); // eslint-disable-line

  const advance = () => {
    if (li < layers.length - 1) setLi(li + 1);
    else { awardStar(); setDone(true); } // 三层全读完：额外大星星
  };
  const onOk = () => { awardStar(); setStatus('ok'); setTimeout(advance, 700); };
  const onWrong = () => {
    const n = retry + 1;
    if (n >= 3) {
      // 3次读不好：自动播放2遍标准读音，然后允许跳过（点下一步）
      setStatus('skip');
      speak(layer.demo || layer.text, 'zh-CN');
      setTimeout(() => speak(layer.demo || layer.text, 'zh-CN'), 1300);
    } else {
      setRetry(n); setStatus('retry');
    }
  };
  const startMic = () => {
    if (!SR) { onOk(); return; } // 无语音识别能力：点即算读完（兜底，保证流程可走通）
    setStatus('listening');
    let rec;
    try { rec = new SR(); } catch { onOk(); return; }
    rec.lang = 'zh-CN'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const t = (ev.results[0][0].transcript || '').replace(/\s/g, '');
      if (!t) { setStatus('noise'); return; }
      if (t.includes(layer.text) || (layer.text.length <= 2 && t.includes(layer.text[0]))) onOk();
      else onWrong();
    };
    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'audio-capture') setStatus('noise');
      else onWrong();
    };
    rec.onend = () => { if (status === 'listening') setStatus('idle'); };
    try { rec.start(); } catch { setStatus('noise'); }
  };

  const feedback = {
    ok: <div className="text-2xl font-bold text-kid-green">🎉 真棒！<span className="text-kid-yellow">+1 ⭐</span></div>,
    retry: <div className="text-xl font-bold text-amber-600">再听一遍，跟着读读看</div>,
    noise: <div className="text-xl font-bold text-amber-600">安静一点，再读一读</div>,
    skip: <div className="text-xl font-bold text-amber-600">看看这个字~ 点下一步继续</div>,
  }[status];

  if (done) {
    return (
      <div className="pop-in w-full max-w-md p-4 bg-white/95 rounded-3xl shadow-xl text-center space-y-2">
        <div className="text-6xl">🌟</div>
        <div className="text-2xl font-bold text-kid-green">三层都读完啦，真棒！</div>
        <div className="text-sm text-gray-400">点右下角「下一步」继续</div>
      </div>
    );
  }

  return (
    <div className={`pop-in w-full ${landscape ? 'max-w-lg p-3' : 'max-w-md p-4'} bg-white/95 rounded-3xl shadow-xl space-y-3`}>
      <div className="text-center text-sm font-bold text-kid-green">第 {li + 1} / {layers.length} 层 · {layer.label}</div>
      <div className="text-center">
        <div className={`font-bold text-kid-orange ${landscape ? 'text-6xl' : 'text-8xl'}`} style={{ WebkitTextStroke: '3px #7a3e12', textShadow: '3px 3px 0 rgba(0,0,0,0.12)' }}>{layer.text}</div>
        <div className="text-kid-blue font-bold">{layer.py}</div>
        {layer.img && layer.img !== layer.text && <div className="text-gray-400 text-xs mt-1">{layer.img}</div>}
      </div>
      <button onClick={startMic}
        className={`btn-3d w-full py-3 inline-flex items-center justify-center gap-2 text-lg ${status === 'listening' ? 'bg-kid-green text-white' : 'bg-kid-pink text-[#3a2a1a]'}`}>
        <Icon name="mic" size={22} />{status === 'listening' ? '在听…' : '读一读'}
      </button>
      <div className="text-center min-h-[2.5rem]">{feedback || <div className="text-gray-300 text-sm">听示范，跟着读</div>}</div>
    </div>
  );
}

/**
 * 五步学习场景（v3.0）。
 * 横屏/竖屏两套独立排版；方向类样式互斥（见 useLandscape）。
 */
export default function HanziStudy({
  char, lesson, index, total,
  onSubmit, onNext, onRestart, done, onBack,
}) {
  const [step, setStep] = useState(0);
  // 玩：三段式流程 acting(自动动作动画) → ending(收尾) → revealed(汉字最后才浮现)
  const [playStage, setPlayStage] = useState('acting');
  // 写：严格按规范 4 阶段 —— 0 看动画 → 1 分步描 → 2 灰字影描 → 3 空格独立写
  const [writeStage, setWriteStage] = useState(0);
  const [writeDone, setWriteDone] = useState(false);
  const [writeNonce, setWriteNonce] = useState(0); // 重来当前阶段
  const writerBox = useRef(null);
  const writerApi = useRef(null);
  const writeAwardedRef = useRef(false);
  const stepId = STEPS[step].id;
  const landscape = useLandscape();
  const emoji = getEmoji(char);
  const stars = useStars();
  const awardedRef = useRef(false);

  // 换字：回到第一步、清空状态（绝不能把 stepId 放进依赖，否则切换步骤会被打回「玩」）
  useEffect(() => {
    setStep(0);
    setPlayStage('acting');
    setWriteStage(0);
    setWriteDone(false);
    awardedRef.current = false;
    writeAwardedRef.current = false;
  }, [char?.id]);

  // 每次进入「玩」时回到"自动动作动画"阶段，保证汉字最后才亮出
  useEffect(() => {
    if (stepId === 'play') setPlayStage('acting');
  }, [stepId]);

  // 每次进入「写」时回到第 1 阶段
  useEffect(() => {
    if (stepId === 'write') { setWriteStage(0); setWriteDone(false); }
  }, [stepId]);

  // 自动播放规则（v3.0 3.4）：仅「玩」进页自动播旁白；认/写不自动播（由按钮触发）；说/练各自在子面板内自动播
  useEffect(() => {
    if (!char || !lesson) return;
    if (stepId === 'play') speak(lesson.play.旁白配音, 'zh-CN');
  }, [stepId, char?.id]); // eslint-disable-line

  // 玩：汉字揭示时给 1 颗星（v3.0 奖励：玩页互动完成给1星）
  useEffect(() => {
    if (playStage === 'revealed' && !awardedRef.current) {
      awardedRef.current = true;
      addStars(1);
    }
  }, [playStage, char?.id]);

  // 写：4 阶段全部完成给 1 颗星（用 ref 防止切字重复给）
  useEffect(() => {
    if (writeDone && !writeAwardedRef.current) {
      writeAwardedRef.current = true;
      addStars(1);
    }
  }, [writeDone, char?.id]);

  // 切步骤 / 换字 / 离开组件：停止所有音频 + 释放缓存（v3.0 3.3 切走即停），杜绝叠音与内存堆积
  useEffect(() => () => { cancelSpeak(); clearEdgeCache(); }, [stepId, char?.id]);

  // 进入某步骤即预热本步骤主要固定音频，点按时零延迟（首次也无网络往返）
  useEffect(() => {
    if (!char || !lesson) return;
    if (stepId === 'play') {
      prefetchEdge(lesson.play.旁白配音, 'zh-CN', 'teach');
    } else if (stepId === 'know') {
      const k = lesson.know || {};
      prefetchEdge(char.hanzi, 'zh-CN', 'teach'); // 听读音
      if (k.oral || k.shapeHint) prefetchEdge(`${k.oral || ''}。${k.shapeHint || ''}`, 'zh-CN', 'teach'); // 听讲解
      (k.words || []).forEach((w) => prefetchEdge(w.word, 'zh-CN', 'teach')); // 词组
    } else if (stepId === 'speak') {
      const s = lesson.speak || {};
      if (s.hanzi) prefetchEdge(s.hanzi, 'zh-CN', 'teach');
      if (s.word) prefetchEdge(s.word, 'zh-CN', 'teach');
      if (s.sentence) prefetchEdge(s.sentence, 'zh-CN', 'teach');
    } else if (stepId === 'practice') {
      (lesson.practice || []).forEach((q) => {
        if (q.type === 'listen') prefetchEdge(q.audio || q.句子 || q.提问, 'zh-CN', 'teach');
      });
    }
    // 写：无语音，无需预热
  }, [stepId, char?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 写：初始化笔顺动画
  useEffect(() => {
    if (stepId !== 'write' || !writerBox.current || !char) return;
    writerBox.current.innerHTML = '';
    const WS = landscape ? 140 : 190;
    const w = HanziWriter.create(writerBox.current, char.hanzi, {
      width: WS, height: WS, padding: 6,
      showOutline: true, showCharacter: false,
      strokeColor: '#FF8C42', outlineColor: '#E5E7EB', radicalColor: '#FF6B9D',
      strokeAnimationSpeed: 1, delayBetweenStrokes: 320,
      charDataLoader: (c, onComplete) => {
        fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${c}.json`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then(onComplete)
          .catch(() => onComplete(null));
      },
    });
    writerApi.current = w;
    return () => { try { w.cancelQuiz(); } catch {} };
  }, [stepId, char?.hanzi, landscape]);

  // 写：按规范 4 阶段驱动 hanzi-writer（看动画 → 分步描 → 灰字影描 → 空格写）
  useEffect(() => {
    if (stepId !== 'write') return;
    const w = writerApi.current;
    if (!w) return;
    try { w.cancelQuiz(); } catch {}
    if (writeStage === 0) {
      // 阶段1：完整播放一遍笔顺动画，播完自动进入"跟着描"
      w.showOutline(); w.hideCharacter();
      w.animateCharacter({ onComplete: () => setWriteStage(1) });
    } else if (writeStage === 1) {
      // 阶段2：分步描红——每一画都亮出来给孩子跟着描
      w.showOutline();
      w.quiz({ showHintAfterMisses: 1, markStrokeCorrectAfterMisses: 2, onComplete: () => setWriteStage(2) });
    } else if (writeStage === 2) {
      // 阶段3：在灰色字影上描红，提示减少
      w.showOutline();
      w.quiz({ showHintAfterMisses: 5, onComplete: () => setWriteStage(3) });
    } else {
      // 阶段4：空田字格独立写一个——无字影、无提示
      w.hideOutline();
      w.quiz({ showHintAfterMisses: 12, onComplete: () => setWriteDone(true) });
    }
  }, [stepId, writeStage, writeNonce, char?.hanzi, landscape]);

  const replayWrite = () => { setWriteStage(0); setWriteNonce((n) => n + 1); }; // 再看一遍完整笔顺
  const retryStage = () => setWriteNonce((n) => n + 1);                      // 重来当前阶段
  const revealPlay = () => {
    if (playStage !== 'acting') return; // 只在"自动动作动画"阶段可点
    setPlayStage('ending'); // 动画收尾（不打断，结束后才亮字）
    setTimeout(() => {
      setPlayStage('revealed'); // 最后才浮现汉字
      speak(char.hanzi, 'zh-CN'); // 字最后才念出来
    }, 850);
  };
  const sayAgain = () => char && speak(char.hanzi, 'zh-CN');
  const canNextStep = step < STEPS.length - 1;

  if (done) {
    return (
      <div className="scene p-8 text-center h-[100dvh] flex flex-col items-center justify-center pop-in" style={{ borderRadius: 0 }}>
        <div className="scene-ground" />
        <div className="text-7xl mb-3 relative">🎊</div>
        <h2 className="text-2xl font-bold text-[#3a2a1a] drop-shadow relative">本关学完啦！</h2>
        <p className="text-[#3a2a1a] mb-4 relative">太厉害了，继续加油～</p>
        <button onClick={onRestart} className="btn-3d bg-kid-orange text-[#3a2a1a] px-6 py-3 text-lg relative">再来一遍</button>
      </div>
    );
  }

  return (
    <div className="scene h-[100dvh] flex flex-col overflow-hidden" style={{ borderRadius: 0 }}>
      <div className={`absolute right-4 text-4xl floaty ${landscape ? 'top-1' : 'top-3'}`}>🌞</div>
      <div className={`absolute left-6 text-3xl cloud-drift opacity-90 ${landscape ? 'top-6' : 'top-10'}`}>☁️</div>
      <div className={`absolute right-16 text-2xl cloud-drift opacity-80 ${landscape ? 'top-12' : 'top-24'}`}>☁️</div>
      <div className="scene-ground" />

      {/* 顶部：返回 + 五步条 + 星星 */}
      <div className={`relative shrink-0 flex items-center gap-1.5 ${landscape ? 'px-2 pt-1.5' : 'px-3 pt-3'}`}>
        {onBack && (
          <button onClick={onBack}
            className={`rounded-xl bg-white/90 shadow flex items-center justify-center shrink-0 active:scale-90 ${landscape ? 'w-8 h-8' : 'w-9 h-9'}`} title="返回地图">
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
        )}
        {STEPS.map((s, i) => {
          const active = i === step;
          return (
            <button key={s.id} onClick={() => setStep(i)}
              style={landscape ? { width: '2.5rem', height: '2.5rem' } : undefined}
              className={`step-chip ${s.color} text-[#3a2a1a] ${active ? 'step-chip-active scale-105' : 'opacity-70'}`}>
              <span className={landscape ? 'text-base leading-none' : 'text-lg leading-none'}>{s.name}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="bg-white/85 rounded-xl px-2 py-1 text-sm font-bold text-kid-yellow inline-flex items-center gap-1" title="星星总数">
            <Icon name="star" size={16} />{stars}
          </span>
          <span className="bg-white/85 rounded-xl px-2 py-1 text-sm font-bold text-gray-600">{index + 1}/{total}</span>
          <button onClick={() => setStep(step + 1 >= STEPS.length ? STEPS.length - 1 : step + 1)}
            className={`bg-white/85 rounded-xl flex items-center justify-center text-gray-500 ${landscape ? 'w-7 h-7' : 'w-8 h-8'}`} title="下一步">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      {/* 步骤内容：唯一可滚动区 */}
      <div className="relative flex-1 min-h-0 overflow-y-auto">
        <div className={`min-h-full flex flex-col items-center ${landscape ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <div className={`m-auto w-full flex flex-col items-center ${landscape ? 'gap-2' : 'gap-3'}`}>

        {/* 玩：情景动画(自动动作) → 点一点 → 收尾动画 → 最后亮字。仅保留"动画画面+点一点"给孩子看 */}
        {stepId === 'play' && lesson && (() => {
          const acting = playStage === 'acting';
          const ending = playStage === 'ending';
          const revealed = playStage === 'revealed';
          return (
            <div className="pop-in w-full flex flex-col items-center">
              <div className={`relative flex items-end justify-center ${landscape ? 'h-40 mt-2' : 'h-52 mt-3'}`}>
                <div className="absolute bottom-1 w-44 h-3 bg-black/10 rounded-[50%] blur-[2px]" />
                {revealed ? (
                  <div className="pop-in font-bold text-kid-orange" style={{ WebkitTextStroke: '3px #7a3e12', textShadow: '3px 3px 0 rgba(0,0,0,0.12)', fontSize: landscape ? '5rem' : '7rem' }}>{char.hanzi}</div>
                ) : (
                  <button onClick={revealPlay} disabled={!acting} title="点一点"
                    className={`relative leading-none active:scale-95 transition ${ending ? 'play-ending' : 'play-acting'} ${landscape ? 'text-[5rem]' : 'text-[7rem]'}`}>
                    {emoji}
                  </button>
                )}
              </div>
              {!revealed && (
                <button onClick={revealPlay} disabled={!acting}
                  className={`btn-3d mt-2 ${acting ? 'bg-kid-yellow text-[#3a2a1a]' : 'bg-gray-200 text-gray-400'} ${landscape ? 'px-6 py-2 text-base' : 'px-8 py-3 text-lg'}`}>
                  点一点
                </button>
              )}
              {revealed && (
                <button onClick={() => speak(char.hanzi, 'zh-CN')} className={`btn-3d bg-kid-blue text-[#3a2a1a] mt-3 inline-flex items-center gap-2 ${landscape ? 'px-5 py-2' : 'px-6 py-3'}`}>
                  <Icon name="speaker" size={20} />听读音
                </button>
              )}
            </div>
          );
        })()}

        {/* 认：进页不自动播；口语释义 + 字形提示 + 配图(emoji) + 词组卡片 + 听读音/听讲解（清理了开发备注文字） */}
        {stepId === 'know' && lesson && (() => {
          const k = lesson.know;
          return (
            <div className={`pop-in flex ${landscape ? 'flex-row items-center gap-6' : 'flex-col items-center'}`}>
              <div className="flex flex-col items-center">
                <div className={`mb-1 ${landscape ? 'text-4xl' : 'text-5xl'}`}>{k.emoji}</div>
                <div className={`font-bold text-kid-orange ${landscape ? 'text-6xl' : 'text-8xl'}`} style={{ WebkitTextStroke: '3px #7a3e12', textShadow: '3px 3px 0 rgba(0,0,0,0.12)' }}>{k.hanzi}</div>
              </div>
              <div className={`w-full bg-white/95 rounded-3xl shadow-xl text-center ${landscape ? 'max-w-xs p-4' : 'max-w-sm p-5'}`}>
                <div className={`text-kid-blue font-bold ${landscape ? 'text-xl mt-0.5' : 'text-2xl mt-1'}`}>{k.pinyin}</div>
                <div className={`text-gray-700 leading-relaxed ${landscape ? 'text-sm mt-1' : 'mt-2'}`}>{k.oral}</div>
                <div className={`text-gray-500 leading-relaxed ${landscape ? 'text-xs mt-1' : 'text-sm mt-1'}`}>{k.shapeHint}</div>
                <div className={`flex flex-wrap justify-center gap-2 ${landscape ? 'mt-2' : 'mt-3'}`}>
                  {k.words.map((w) => (
                    <button key={w.word} onClick={() => speak(w.word, 'zh-CN')} title={w.配图}
                      className="bg-kid-yellow/25 text-gray-700 rounded-2xl px-3 py-1 text-sm font-bold active:scale-95">
                      {w.word}
                    </button>
                  ))}
                </div>
                <div className={`flex justify-center gap-2 ${landscape ? 'mt-2' : 'mt-4'}`}>
                  <button onClick={() => speak(char.hanzi, 'zh-CN')} className={`btn-3d bg-kid-blue text-[#3a2a1a] inline-flex items-center gap-2 ${landscape ? 'px-4 py-1.5' : 'px-5 py-2'}`}>
                    <Icon name="speaker" size={20} />听读音
                  </button>
                  <button onClick={() => speak(`${k.oral}。${k.shapeHint}`, 'zh-CN')} className={`btn-3d bg-kid-green text-[#3a2a1a] inline-flex items-center gap-2 ${landscape ? 'px-4 py-1.5' : 'px-5 py-2'}`}>
                    <Icon name="speaker" size={20} />听讲解
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 说：三层递进 + 麦克风跟读 */}
        {stepId === 'speak' && lesson && (
          <SpeakPanel lesson={lesson} landscape={landscape} awardStar={addStars} />
        )}

        {/* 练：固定 4 选 1 */}
        {stepId === 'practice' && lesson && (
          <PracticePanel qs={lesson.practice} landscape={landscape} awardStar={addStars} />
        )}

        {/* 写：严格按规范 4 阶段（看动画 → 分步描 → 灰字影描 → 空格写）。UI 只保留给孩子看的内容，不显示描红引导等开发备注 */}
        {stepId === 'write' && lesson && (() => {
          const w = lesson.write;
          const STAGE_NAMES = ['看动画', '跟着描', '看影子描', '自己写'];
          return (
            <div className={`pop-in flex ${landscape ? 'flex-row items-center gap-6' : 'flex-col items-center'}`}>
              <div className={`bg-white rounded-3xl shadow-xl ${landscape ? 'p-2' : 'p-3'} inline-block`}>
                <div className="relative">
                  <div ref={writerBox} />
                  <div className="pointer-events-none absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,150,150,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,150,150,.35) 1px, transparent 1px)',
                    backgroundPosition: 'center', backgroundSize: '50% 50%',
                  }} />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`text-[#4a2f17] font-bold ${landscape ? 'mt-0 text-sm' : 'mt-2'}`}>笔顺练习 · 共 {w.总笔画数} 画</div>
                <div className={`text-gray-500 ${landscape ? 'text-xs mt-0.5 max-w-[12rem]' : 'text-sm mt-1'}`}>易错：{w.易错提示}</div>

                {/* 4 阶段步骤指示（给孩子看的短标签） */}
                <div className={`flex items-center gap-1.5 ${landscape ? 'mt-2' : 'mt-3'}`}>
                  {STAGE_NAMES.map((n, i) => (
                    <span key={n} className={`rounded-full font-bold px-2 py-0.5 ${landscape ? 'text-[10px]' : 'text-xs'} ${
                      i === writeStage ? 'bg-kid-purple text-white'
                        : i < writeStage ? 'bg-kid-green/25 text-kid-green'
                        : 'bg-gray-100 text-gray-400'
                    }`}>{n}</span>
                  ))}
                </div>

                <div className={`flex justify-center gap-2 ${landscape ? 'mt-2' : 'mt-3'}`}>
                  <button onClick={replayWrite} className="btn-3d bg-kid-purple text-[#3a2a1a] px-4 py-2 inline-flex items-center gap-1">
                    <Icon name="play" size={18} />看笔顺
                  </button>
                  <button onClick={retryStage} className="btn-3d bg-kid-orange text-[#3a2a1a] px-4 py-2">重来</button>
                </div>

                {writeDone && <div className={`font-bold text-kid-green ${landscape ? 'text-base mt-1' : 'text-xl mt-2'}`}>🎉 写好啦，真棒！</div>}
              </div>
            </div>
          );
        })()}

        </div>
        </div>
      </div>

      {/* 底部：上/下一步 + 下一个字（固定高度，不覆盖内容） */}
      <div className={`relative shrink-0 flex items-center justify-between ${landscape ? 'px-3 pb-2' : 'px-4 pb-4'}`}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className={`rounded-2xl bg-white/90 shadow-lg flex items-center justify-center disabled:opacity-30 active:scale-90 ${landscape ? 'w-10 h-10' : 'w-12 h-12'}`}>
          <Icon name="chevronRight" size={24} className="rotate-180 text-gray-500" />
        </button>
        {canNextStep ? (
          <button onClick={() => setStep(step + 1)} className={`btn-3d bg-kid-yellow text-[#3a2a1a] ${landscape ? 'px-6 py-2 text-base' : 'px-8 py-3 text-lg'}`}>下一步</button>
        ) : (
          <button onClick={onNext} className={`btn-3d bg-kid-green text-[#3a2a1a] ${landscape ? 'px-6 py-2 text-base' : 'px-8 py-3 text-lg'}`}>下一个字 ›</button>
        )}
        <button onClick={onNext} className={`rounded-2xl bg-white/90 shadow-lg flex items-center justify-center active:scale-90 ${landscape ? 'w-10 h-10' : 'w-12 h-12'}`}>
          <Icon name="chevronRight" size={24} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}

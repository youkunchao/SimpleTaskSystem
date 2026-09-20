import React, { useState, useEffect, useRef, useMemo } from 'react';
import Icon from './Icon.jsx';
import AudioReader from './AudioReader.jsx';
import { speak } from '../api.js';
import HanziWriter from 'hanzi-writer';
import { useLandscape } from '../hooks/useLandscape.js';

// 洪恩式五步学习法：玩 → 认 → 练 → 写 → 说
const STEPS = [
  { id: 'play', name: '玩', color: 'bg-kid-pink' },
  { id: 'know', name: '认', color: 'bg-kid-orange' },
  { id: 'practice', name: '练', color: 'bg-kid-blue' },
  { id: 'write', name: '写', color: 'bg-kid-purple' },
  { id: 'speak', name: '说', color: 'bg-kid-green' },
];

// 汉字的象形/联想配图（玩这一步用），让孩子先建立图像记忆
const FUN = {
  日: '☀️', 月: '🌙', 水: '💧', 火: '🔥', 山: '⛰️', 石: '🪨', 木: '🌳', 田: '🌾',
  竹: '🎋', 米: '🍚', 花: '🌸', 草: '🌿', 树: '🌳', 叶: '🍃', 果: '🍎', 云: '☁️',
  雨: '🌧️', 雪: '❄️', 电: '⚡', 星: '⭐', 牛: '🐄', 羊: '🐑', 马: '🐴', 兔: '🐰',
  猫: '🐱', 狗: '🐶', 鸡: '🐔', 鸭: '🦆', 鸟: '🐦', 虫: '🐛', 鱼: '🐟', 家: '🏠',
  车: '🚗', 船: '🚢', 书: '📖', 笔: '✏️', 纸: '📄', 伞: '☂️', 衣: '👕', 鞋: '👟',
  心: '❤️', 手: '✋', 口: '👄', 耳: '👂', 目: '👁️', 牙: '🦷', 足: '🦶', 笑: '😊',
};

export default function HanziStudy({
  char, charOptions, correctIndex, index, total,
  onSubmit, onNext, onRestart, done, onBack,
}) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState(null);      // 练：null | true | false
  const [traceDone, setTraceDone] = useState(false); // 写：是否完成描红
  const writerBox = useRef(null);
  const writerApi = useRef(null);
  const stepId = STEPS[step].id;
  const landscape = useLandscape();
  const emoji = FUN[char.hanzi] || char.emoji || '✨';

  // 换字：回到第一步并清空作答状态
  useEffect(() => {
    setStep(0);
    setAnswer(null);
    setTraceDone(false);
  }, [char?.id]);

  // 玩 / 认 / 说：进入时自动朗读，帮孩子建立音形联系
  useEffect(() => {
    if ((stepId === 'play' || stepId === 'know' || stepId === 'speak') && char) {
      speak(char.hanzi, 'zh-CN');
    }
  }, [stepId, char?.id]);

  // 写：初始化笔顺动画
  useEffect(() => {
    if (stepId !== 'write' || !writerBox.current || !char) return;
    writerBox.current.innerHTML = '';
    const WS = landscape ? 150 : 190;
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
    w.animateCharacter();
  }, [stepId, char?.hanzi]);

  const replayWrite = () => {
    if (writerApi.current) { writerApi.current.animateCharacter(); setTraceDone(false); }
  };
  const startTrace = () => {
    if (!writerApi.current) return;
    writerApi.current.quiz({
      onComplete: () => setTraceDone(true),
    });
  };
  const sayAgain = () => char && speak(char.hanzi, 'zh-CN');
  const pick = (i) => {
    if (answer !== null) return;
    const ok = i === correctIndex;
    setAnswer(ok);
    onSubmit && onSubmit(ok, charOptions[i], char.hanzi);
  };
  const canNextStep = step < STEPS.length - 1;

  if (done) {
    return (
      <div className="scene p-8 text-center h-[100dvh] flex flex-col items-center justify-center pop-in" style={{ borderRadius: 0 }}>
        <div className="scene-ground" />
        <div className="text-7xl mb-3 relative">🎊</div>
        <h2 className="text-2xl font-bold text-white drop-shadow relative">本关学完啦！</h2>
        <p className="text-white/90 mb-4 relative">太厉害了，继续加油～</p>
        <button onClick={onRestart} className="btn-3d bg-kid-orange text-white px-6 py-3 text-lg relative">再来一遍</button>
      </div>
    );
  }

  return (
    <div className="scene h-[100dvh] flex flex-col" style={{ borderRadius: 0 }}>
      {/* 场景装饰：太阳 + 云朵 + 草地 */}
      <div className="absolute top-3 right-4 text-4xl floaty">🌞</div>
      <div className="absolute top-10 left-6 text-3xl cloud-drift opacity-90">☁️</div>
      <div className="absolute top-24 right-16 text-2xl cloud-drift opacity-80">☁️</div>
      <div className="scene-ground" />

      {/* 顶部：返回 + 五步条 */}
      <div className="relative flex items-center gap-1.5 px-3 pt-3">
        {onBack && (
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/90 shadow flex items-center justify-center shrink-0 active:scale-90"
            title="返回地图">
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
        )}
        {STEPS.map((s, i) => {
          const active = i === step;
          return (
            <button key={s.id} onClick={() => setStep(i)}
              className={`step-chip ${s.color} text-white ${active ? 'step-chip-active scale-105' : 'opacity-70'}`}>
              <span className="text-lg leading-none">{s.name}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="bg-white/85 rounded-xl px-2 py-1 text-sm font-bold text-gray-600">{index + 1}/{total}</span>
          <button onClick={() => setStep(step + 1 >= STEPS.length ? STEPS.length - 1 : step + 1)}
            className="bg-white/85 rounded-xl w-8 h-8 flex items-center justify-center text-gray-500" title="下一步">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      {/* 步骤内容：竖屏居中单栏，横屏左右双栏（图左文右） */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-3 overflow-y-auto">
        {stepId === 'play' && (
          <div className={`pop-in flex flex-col items-center ${landscape ? 'flex-row gap-8' : ''}`}>
            <div className="flex flex-col items-center">
              <div className={`leading-none wiggle ${landscape ? 'text-[5rem]' : 'text-[7rem]'}`}>{emoji}</div>
              <div className={`mt-2 font-bold text-white drop-shadow-lg ${landscape ? 'text-4xl' : 'text-5xl'}`} style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.12)' }}>{char.hanzi}</div>
            </div>
            <p className="text-white/95 font-bold mt-2 text-center">看一看、猜一猜，这是什么字？</p>
          </div>
        )}

        {stepId === 'know' && (
          <div className={`pop-in flex flex-col items-center ${landscape ? 'flex-row gap-8' : ''}`}>
            <div className="flex flex-col items-center">
              <div className="text-5xl mb-1">{emoji}</div>
              <div className={`font-bold text-kid-orange ${landscape ? 'text-6xl' : 'text-8xl'}`} style={{ textShadow: '3px 3px 0 #FFE4B5' }}>{char.hanzi}</div>
            </div>
            <div className="w-full max-w-sm bg-white/95 rounded-3xl shadow-xl p-5 text-center">
              <div className="text-2xl text-kid-blue font-bold mt-1">{char.pinyin}</div>
              <div className="text-gray-600 mt-1">{char.meaning}</div>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {(char.words || '').split(',').filter(Boolean).map((wd) => (
                  <span key={wd} className="bg-kid-yellow/25 text-gray-700 rounded-full px-3 py-1 text-sm font-bold">{wd}</span>
                ))}
              </div>
              <button onClick={() => speak(char.hanzi, 'zh-CN')}
                className="btn-3d bg-kid-blue text-white px-5 py-2 mt-4 inline-flex items-center gap-2">
                <Icon name="speaker" size={20} />听读音
              </button>
            </div>
          </div>
        )}

        {stepId === 'practice' && (
          <div className="w-full max-w-md bg-white/95 rounded-3xl shadow-xl p-4">
            <AudioReader
              prompt={char.pinyin}
              question={`${char.meaning}，是哪个字？`}
              options={charOptions}
              lang="zh-CN"
              correctIndex={correctIndex}
              status={answer}
              disabled={answer !== null}
              onSelect={pick}
              footer={answer === true ? (
                <div className="text-2xl font-bold text-kid-green text-center">🎉 答对啦！<span className="text-kid-yellow">+2 ⭐</span></div>
              ) : answer === false ? (
                <div className="space-y-2 text-center">
                  <div className="text-xl font-bold text-red-500">❌ 正确答案是「{char.hanzi}」</div>
                  <button onClick={() => setAnswer(null)} className="btn-kid bg-kid-yellow text-white">再试一次</button>
                </div>
              ) : null}
            />
          </div>
        )}

        {stepId === 'write' && (
          <div className={`pop-in flex flex-col items-center ${landscape ? 'flex-row gap-8' : ''}`}>
            <div className="bg-white rounded-3xl shadow-xl p-3 inline-block">
              <div className="relative">
                <div ref={writerBox} />
                {/* 田字格 */}
                <div className="pointer-events-none absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(to right, rgba(255,150,150,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,150,150,.35) 1px, transparent 1px)',
                  backgroundPosition: 'center', backgroundSize: '50% 50%',
                }} />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-white font-bold mt-2">笔顺练习 · 共 {char.stroke_count} 画</div>
              <div className="flex justify-center gap-2 mt-3">
                <button onClick={replayWrite} className="btn-3d bg-kid-purple text-white px-4 py-2 inline-flex items-center gap-1">
                  <Icon name="play" size={18} />看笔顺
                </button>
                <button onClick={startTrace} className="btn-3d bg-kid-orange text-white px-4 py-2">
                  {traceDone ? '再写一次 ✓' : '我来写'}
                </button>
              </div>
            </div>
          </div>
        )}

        {stepId === 'speak' && (
          <div className={`pop-in flex flex-col items-center ${landscape ? 'flex-row gap-8' : ''}`}>
            <div className="flex flex-col items-center">
              <div className="text-6xl mb-2 floaty">🎤</div>
              <div className={`font-bold text-white drop-shadow-lg ${landscape ? 'text-5xl' : 'text-7xl'}`} style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.12)' }}>{char.hanzi}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-white/90 font-bold mt-1">{char.pinyin}</div>
              <p className="text-white/95 font-bold mt-2 text-center">大声读一读，让孩子跟着说～</p>
              <button onClick={sayAgain} className="btn-3d bg-kid-green text-white px-5 py-2 mt-3 inline-flex items-center gap-2">
                <Icon name="speaker" size={20} />再听一遍
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部：上/下一步 + 下一个字 */}
      <div className="relative flex items-center justify-between px-4 pb-4">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="w-12 h-12 rounded-2xl bg-white/90 shadow-lg flex items-center justify-center disabled:opacity-30 active:scale-90">
          <Icon name="chevronRight" size={24} className="rotate-180 text-gray-500" />
        </button>
        {canNextStep ? (
          <button onClick={() => setStep(step + 1)} className="btn-3d bg-kid-yellow text-white px-8 py-3 text-lg">下一步</button>
        ) : (
          <button onClick={onNext} className="btn-3d bg-kid-green text-white px-8 py-3 text-lg">下一个字 ›</button>
        )}
        <button onClick={onNext} className="w-12 h-12 rounded-2xl bg-white/90 shadow-lg flex items-center justify-center active:scale-90">
          <Icon name="chevronRight" size={24} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}

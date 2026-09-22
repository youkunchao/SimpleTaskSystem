import React, { useState, useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';
import api, { speak, cancelSpeak } from '../../api.js';
import { useLandscape } from '../../hooks/useLandscape.js';

// 只保留字母，忽略大小写与标点，避免"Cat."和"cat"判成不一样
function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * 英语沟通（口语跟读）：麦克风识别英文跟读。
 * 浏览器不支持语音识别时自动降级为「点按即算读完」，保证流程永远能走通。
 * 奖励统一走 /progress 由服务端加星，前端不重复加分。
 * 竖屏：纵向居中；横屏：左侧单词、右侧麦克风与状态，避免一屏放不下。
 */
export default function SpeakMode({ word, childId, onNext, onExit }) {
  const landscape = useLandscape();
  const [status, setStatus] = useState('idle'); // idle | listening | ok | retry | noise | skip
  const [heard, setHeard] = useState('');
  const [tries, setTries] = useState(0);
  const awardedRef = useRef(false);
  const recRef = useRef(null);
  const supported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const target = normalize(word?.english || '');

  const stopRec = () => {
    try {
      recRef.current?.stop?.();
    } catch {}
  };

  const award = (transcript) => {
    if (awardedRef.current || !childId || !word) return;
    awardedRef.current = true;
    api
      .post('/progress', {
        child_id: childId,
        module: 'english',
        item_id: word.id,
        correct: true,
        duration: 15,
        question: `跟读：${word.english}`,
        user_answer: transcript || word.english,
        correct_answer: word.english,
        explanation: '',
      })
      .catch(() => {});
  };

  const succeed = (transcript) => {
    setStatus('ok');
    stopRec();
    award(transcript);
    setTimeout(() => {
      setStatus('idle');
      onNext && onNext();
    }, 1000);
  };

  function fail() {
    const n = tries + 1;
    setTries(n);
    stopRec();
    if (n >= 3) {
      // 连读三次不到位：自动放两遍标准读音，然后允许继续
      setStatus('skip');
      speak(word.english, 'en-US');
      setTimeout(() => speak(word.english, 'en-US'), 1300);
    } else {
      setStatus('retry');
    }
  }

  const start = () => {
    if (!target) return;
    if (!supported) {
      succeed(''); // 不支持识别：点按即算读完
      return;
    }
    setStatus('listening');
    let rec;
    try {
      rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    } catch {
      succeed('');
      return;
    }
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const t = ev?.results?.[0]?.[0]?.transcript || '';
      setHeard(t);
      const h = normalize(t);
      if (h === target || h.includes(target) || (target.length >= 4 && h.includes(target.slice(0, 3)))) {
        succeed(t);
      } else {
        fail();
      }
    };
    rec.onerror = () => setStatus('noise');
    rec.onend = () => setStatus((s) => (s === 'listening' ? 'idle' : s));
    try {
      rec.start();
    } catch {
      setStatus('noise');
    }
  };

  // 离开页面/切换模式：停掉朗读与识别，避免后台还在收音
  useEffect(
    () => () => {
      cancelSpeak();
      try {
        recRef.current?.abort?.();
      } catch {}
    },
    []
  );
  // 换词重置状态
  useEffect(() => {
    setStatus('idle');
    setHeard('');
    setTries(0);
    awardedRef.current = false;
  }, [word?.id]);

  if (!word) return null;

  const wordBlock = (
    <>
      <div className={landscape ? 'text-5xl' : 'text-6xl'}>{word.emoji}</div>
      <div>
        <div className={`font-extrabold text-kid-blue ${landscape ? 'text-2xl' : 'text-3xl'}`}>
          {word.english}
        </div>
        <div className={`text-kid-orange font-bold ${landscape ? 'text-base' : 'text-lg'}`}>
          {word.chinese}
        </div>
      </div>
    </>
  );

  const micBlock = (
    <>
      <button
        onClick={start}
        className={`mx-auto rounded-full flex items-center justify-center text-white shadow-lg transition active:scale-95 ${
          landscape ? 'w-20 h-20' : 'w-24 h-24'
        } ${status === 'listening' ? 'bg-kid-green animate-pulse' : 'bg-kid-pink'}`}
        title="点一下，跟着读"
      >
        <Icon name="mic" size={landscape ? 32 : 40} />
      </button>
      <div className={`min-h-[2rem] font-bold ${landscape ? 'text-base' : 'text-lg'}`}>
        {status === 'listening' && <span className="text-kid-blue">在听… 大声读出来</span>}
        {status === 'ok' && <span className="text-kid-green">🎉 真棒！</span>}
        {status === 'retry' && <span className="text-amber-600">再听一遍，跟着读读看</span>}
        {status === 'noise' && <span className="text-amber-600">没听清，再读一次</span>}
        {status === 'skip' && <span className="text-amber-600">跟着读两遍，然后继续</span>}
        {status === 'idle' && <span className="text-gray-300 text-sm">点麦克风，跟着读</span>}
      </div>
    </>
  );

  return (
    <div className={`bg-white rounded-3xl shadow-xl text-center space-y-3 ${landscape ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-90"
          title="返回单词"
        >
          <Icon name="back" size={18} className="text-gray-500" />
        </button>
        <span className="font-bold text-gray-500">英语沟通 · 跟读</span>
        <span className="w-9" />
      </div>

      {landscape ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">{wordBlock}</div>
          <div className="flex-1 space-y-2">{micBlock}</div>
        </div>
      ) : (
        <>
          {wordBlock}
          {micBlock}
        </>
      )}

      {heard && (
        <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600 break-words">
          听到：{heard}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => speak(word.english, 'en-US')} className="btn-kid bg-kid-blue text-white text-sm">
          听示范
        </button>
        {/* 慢速版：读 role='slow' 的预合成音频（语速 -30%），方便孩子听清每个音再跟读 */}
        <button
          onClick={() => speak(word.english, 'en-US', { role: 'slow' })}
          className="btn-kid bg-kid-yellow text-kid-ink text-sm"
        >
          慢速
        </button>
        <button
          onClick={() => {
            setStatus('idle');
            onNext && onNext();
          }}
          className="btn-kid bg-kid-green text-white text-sm"
        >
          下一个词
        </button>
      </div>

      {!supported && (
        <p className="text-xs text-gray-400">
          当前浏览器不支持语音识别，点麦克风即算读完（照样能继续学习）
        </p>
      )}
    </div>
  );
}

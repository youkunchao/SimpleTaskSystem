import React, { useState, useEffect } from 'react';
import Icon from '../Icon.jsx';
import { speak, cancelSpeak } from '../../api.js';
import { explainOf } from '../../utils/englishContent.js';
import { useLandscape } from '../../hooks/useLandscape.js';
import WordQuiz from './WordQuiz.jsx';

// 五步引导：听单词 → 看音标 → 懂意思 → 读例句 → 小测试（一次一步，大按钮，只鼓励）
const STEPS = [
  { id: 'listen', name: '听', color: 'bg-kid-blue' },
  { id: 'phonetic', name: '音', color: 'bg-kid-purple' },
  { id: 'meaning', name: '义', color: 'bg-kid-orange' },
  { id: 'example', name: '句', color: 'bg-kid-pink' },
  { id: 'quiz', name: '测', color: 'bg-kid-green' },
];

export default function LearnSteps({
  word, words, idx, total, quiz, wordOptions, onSelect, onStartTest,
  onBack, onNextWord, onOpenSpeak, stars, landscape,
}) {
  const [subStep, setSubStep] = useState(0); // 0 听 1 音 2 义 3 句
  const [interpreting, setInterpreting] = useState(false);
  const { mode: stepMode, testAnswer, retry, goNext, jumpTo } = quiz;
  if (!word) return null;
  const { meaning, exampleEn, exampleCn, phonetic, tips } = explainOf(word);

  const isQuiz = stepMode === 'test';
  const isDone = stepMode === 'done';
  const activeIndex = isQuiz || isDone ? 4 : subStep;

  // 进「听单词」自动读一遍英文（像老师带读），让孩子先听到正确发音
  useEffect(() => {
    if (isQuiz || isDone || subStep !== 0) return;
    cancelSpeak();
    speak(word.english, 'en-US', { role: 'teach' });
  }, [word?.id, subStep, isQuiz, isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // 发音讲解：先让孩子听到单词「真实读音」（英文朗读，这才是音标真正代表的声音），
  // 再用中文给「这个音怎么发」的友好提示。
  // 重要：不要把 IPA 符号串（/ʃɝt/、ː、ɹ 等）直接交给中文 TTS 朗读——它读不出音标符号，会变成乱码。
  const speakGuide = ({ model = true } = {}) => {
    setInterpreting(true);
    cancelSpeak();
    const zh =
      tips.length > 0
        ? `“${word.chinese}”这个词的发音要注意：${tips.map((t) => `“${t.sym}”${t.tip}`).join('，')}。`
        : `“${word.chinese}”跟着老师多听几遍、多读几遍就好啦。`;
    const finish = () => setInterpreting(false);
    if (!model) {
      speak(zh, 'zh-CN', { role: 'teach', onEnd: finish });
      return;
    }
    speak(word.english, 'en-US', {
      role: 'teach',
      onEnd: () => speak(zh, 'zh-CN', { role: 'teach', onEnd: finish }),
    });
  };

  // 听单词：只读「英文单词 + 中文意思」（音标在专门的「音」步骤里讲，这里不读）
  const handleRead = () => {
    setInterpreting(true);
    cancelSpeak();
    speak(word.english, 'en-US', {
      role: 'teach',
      onEnd: () => speak(`“${word.chinese}”`, 'zh-CN', { role: 'teach', onEnd: () => setInterpreting(false) }),
    });
  };
  // 看音标：同样先听真实读音，再听逐音素的中文提示（IPA 只在屏幕上显示，不朗读符号）
  const readPhonetic = () => speakGuide({ model: true });

  const goSub = (i) => {
    cancelSpeak();
    setSubStep(i);
  };
  const startTest = () => {
    cancelSpeak();
    onStartTest();
  };

  // ---------- 顶部：返回 + 五步条 + 星星 + 进度 ----------
  const topBar = (
    <div className={`relative z-20 flex items-center gap-1.5 shrink-0 ${landscape ? 'px-2 pt-1.5' : 'px-3 pt-3'}`}>
      <button
        onClick={onBack}
        className="rounded-xl bg-white/90 shadow flex items-center justify-center shrink-0 active:scale-90 w-9 h-9"
        title="返回分类"
      >
        <Icon name="back" size={20} className="text-gray-600" />
      </button>
      {STEPS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => (i === 4 ? (isQuiz ? null : startTest()) : goSub(i))}
          style={landscape ? { width: '2.4rem', height: '2.4rem' } : undefined}
          className={`step-chip ${s.color} text-white ${activeIndex === i ? 'step-chip-active scale-105' : 'opacity-70'}`}
        >
          <span className={landscape ? 'text-base leading-none' : 'text-lg leading-none'}>{s.name}</span>
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="bg-white/85 rounded-xl px-2 py-1 text-sm font-bold text-kid-yellow inline-flex items-center gap-1" title="星星总数">
          <Icon name="star" size={16} />{stars}
        </span>
        <span className="bg-white/85 rounded-xl px-2 py-1 text-sm font-bold text-kid-navy">
          {idx + 1}/{total}
        </span>
        {onOpenSpeak && (
          <button onClick={onOpenSpeak} className="bg-white/85 rounded-xl w-8 h-8 flex items-center justify-center active:scale-90" title="口语评测">
            <Icon name="mic" size={18} className="text-kid-purple" />
          </button>
        )}
        <button
          onClick={onNextWord}
          className="bg-white/85 rounded-xl w-8 h-8 flex items-center justify-center active:scale-90"
          title="下一个词"
        >
          <Icon name="chevronRight" size={18} className="text-gray-500" />
        </button>
      </div>
    </div>
  );

  // ---------- 单步内容 ----------
  const listenBlock = (
    <div className="pop-in flex flex-col items-center text-center w-full">
      <div className={`floaty leading-none ${landscape ? 'text-[5rem]' : 'text-[7rem]'}`}>{word.emoji || '✨'}</div>
      <div className={`font-extrabold text-white drop-shadow mt-1 ${landscape ? 'text-3xl' : 'text-5xl'}`}>{word.english}</div>
      <div className={`font-bold text-kid-yellow mt-1 ${landscape ? 'text-xl' : 'text-2xl'}`}>{word.chinese}</div>
      <button
        onClick={handleRead}
        className={`btn-3d mt-4 bg-kid-blue text-white inline-flex items-center gap-2 ${landscape ? 'px-6 py-2 text-base' : 'px-8 py-3 text-lg'} ${interpreting ? 'playing-glow' : ''}`}
      >
        <Icon name="speaker" size={landscape ? 18 : 22} />
        {interpreting ? '正在讲解…' : '读单词'}
      </button>
    </div>
  );

  const phoneticBlock = (
    <div className="pop-in w-full max-w-md glass rounded-3xl p-5 text-center">
      <div className="text-sm font-bold text-kid-purple mb-1">💡 音标讲解</div>
      <div className={`font-extrabold text-kid-navy ${landscape ? 'text-3xl' : 'text-4xl'}`}>{phonetic || '—'}</div>
      <div className="mt-3 space-y-1.5 text-left">
        {tips.length > 0 ? (
          tips.map((t) => (
            <div key={t.sym} className="text-kid-navy/80 text-sm">
              <span className="font-bold text-kid-purple mr-1">/{t.sym}/</span>
              {t.tip}
            </div>
          ))
        ) : (
          <div className="text-kid-navy/60 text-sm">这个单词先跟着老师多听几遍就好啦～</div>
        )}
      </div>
      <button
        onClick={readPhonetic}
        className={`btn-3d mt-3 bg-kid-purple text-white inline-flex items-center gap-2 ${landscape ? 'px-5 py-2 text-sm' : 'px-6 py-2.5'}`}
      >
        <Icon name="speaker" size={18} />读音标讲解
      </button>
    </div>
  );

  const meaningBlock = (
    <div className="pop-in w-full max-w-md glass rounded-3xl p-5 text-center">
      <div className="text-sm font-bold text-kid-orange mb-2">📖 什么意思</div>
      <div className={`font-bold text-kid-navy leading-relaxed ${landscape ? 'text-lg' : 'text-xl'}`}>{meaning}</div>
      <button
        onClick={() => speak(meaning, 'zh-CN', { role: 'teach' })}
        className="btn-3d mt-3 bg-kid-orange text-kid-ink inline-flex items-center gap-2 px-6 py-2.5"
      >
        <Icon name="speaker" size={18} />读讲解
      </button>
    </div>
  );

  const exampleBlock = (
    <div className="pop-in w-full max-w-md glass rounded-3xl p-5 text-center">
      <div className="text-sm font-bold text-kid-pink mb-2">💬 读例句</div>
      <div className={`font-bold text-kid-navy leading-relaxed ${landscape ? 'text-lg' : 'text-xl'}`}>
        {exampleEn || '—'}
      </div>
      <div className="text-kid-navy/60 mt-1">{exampleCn}</div>
      <div className="flex justify-center gap-2 mt-3">
        <button
          onClick={() => speak(exampleEn, 'en-US', { role: 'teach' })}
          className="btn-3d bg-kid-blue text-white inline-flex items-center gap-1 px-4 py-2 text-sm"
        >
          <Icon name="speaker" size={16} />听例句
        </button>
        {exampleCn && (
          <button
            onClick={() => speak(exampleCn, 'zh-CN', { role: 'teach' })}
            className="btn-3d bg-kid-green text-white inline-flex items-center gap-1 px-4 py-2 text-sm"
          >
            <Icon name="speaker" size={16} />听中文
          </button>
        )}
      </div>
    </div>
  );

  // 底部前进按钮（测试/完成态不显示，交给 WordQuiz / 完成卡）
  const bottomBar = isQuiz || isDone ? null : (
    <div className={`relative z-20 shrink-0 flex items-center justify-between ${landscape ? 'px-3 pb-2' : 'px-4 pb-4'}`}>
      <button
        onClick={() => goSub(Math.max(0, subStep - 1))}
        disabled={subStep === 0}
        className="rounded-2xl bg-white/90 shadow-lg w-12 h-12 flex items-center justify-center disabled:opacity-30 active:scale-90"
        title="上一步"
      >
        <Icon name="chevronRight" size={24} className="rotate-180 text-gray-500" />
      </button>
      {subStep < 3 ? (
        <button onClick={() => goSub(subStep + 1)} className="btn-3d bg-kid-yellow text-kid-ink px-8 py-3 text-lg">
          下一步 ▶
        </button>
      ) : (
        <button onClick={startTest} className="btn-3d bg-kid-green text-white px-8 py-3 text-lg inline-flex items-center gap-2">
          <Icon name="target" size={20} />开始小测试 ▶
        </button>
      )}
      <div className="w-12" />
    </div>
  );

  return (
    <div className="ocean-scene h-[100dvh] flex flex-col overflow-hidden">
      {topBar}

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className={`min-h-full flex flex-col items-center ${landscape ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <div className="m-auto w-full flex flex-col items-center gap-3">
            {isDone ? (
              <div className="pop-in w-full max-w-md glass rounded-3xl p-8 text-center">
                <div className="text-6xl mb-3">🎊</div>
                <h2 className="text-2xl font-bold text-kid-navy mb-4">这一组单词学完啦！</h2>
                <div className="flex flex-col gap-2">
                  <button onClick={onNextWord} className="btn-3d bg-kid-green text-white px-6 py-3 text-lg">
                    下一个词 ›
                  </button>
                  <button onClick={onBack} className="btn-3d bg-kid-blue text-white px-6 py-3 text-lg">
                    返回分类
                  </button>
                </div>
              </div>
            ) : isQuiz ? (
              <WordQuiz
                word={word}
                options={wordOptions}
                status={testAnswer}
                onSelect={onSelect}
                onRetry={retry}
                onNext={() => goNext(words.length, 'learn')}
                onBackLearn={() => jumpTo(idx, 'learn')}
              />
            ) : subStep === 0 ? listenBlock : subStep === 1 ? phoneticBlock : subStep === 2 ? meaningBlock : exampleBlock}
          </div>
        </div>
      </div>

      {bottomBar}
    </div>
  );
}

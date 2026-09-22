import React, { useEffect, useState } from 'react';
import api, { speak, cancelSpeak } from '../../api.js';
import { useQuiz } from '../../hooks/useQuiz.js';
import Icon from '../Icon.jsx';
import { mathSpeakText, stripForSpeech } from '../../utils/mathContent.js';
import { addStars } from '../../utils/stars.js';

// 讲解步骤类型 → 标签
const STEP_LABEL = { explain: '💡 讲解', example: '📘 例子', guide: '✏️ 练一练' };

// 分步学习 + 本知识点测验（对应英语 LearnSteps）。
// 复用 useQuiz：mode='learn' 展示讲解步骤，startTest 进入 mode='test' 逐题测验，全部完成进入 'done'。
export default function MathLearnSteps({ topic, quizzes, childId, onBack, onExit }) {
  const quiz = useQuiz({ resetKey: topic.id, initialMode: 'learn' });
  const [speaking, setSpeaking] = useState(false);
  const [subStep, setSubStep] = useState(0); // 讲题：当前正在讲第几句
  const cur = quizzes[quiz.idx];
  const steps = Array.isArray(topic.content) ? topic.content : [];
  const step = steps[subStep];

  // 切步骤/卸载：立刻停朗读，杜绝叠音
  useEffect(() => () => cancelSpeak(), []);
  useEffect(() => { cancelSpeak(); }, [quiz.mode, quiz.idx, topic.id]);

  // 讲题：进入 / 切换句子时自动朗读，实现「语音与动画同步」。
  // 朗读中 → emoji 做"说话"动画、卡片呼吸发光、声波跳动；读完复位，引导孩子点"下一句"。
  useEffect(() => {
    if (quiz.mode !== 'learn' || topic.status === 'placeholder') return;
    const s = steps[subStep];
    if (!s) return;
    cancelSpeak();
    setSpeaking(true);
    speak(stripForSpeech(s.text), 'zh-CN', { role: 'teach', onEnd: () => setSpeaking(false) });
    return () => cancelSpeak();
  }, [subStep, quiz.mode, topic.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 测验：每道题出现时自动读一遍题面（孩子还不识字也能独立作答）；答错/重试也可点"读题"重听
  useEffect(() => {
    if (quiz.mode !== 'test' || !cur) return;
    cancelSpeak();
    setSpeaking(true);
    speak(mathSpeakText(cur.question), 'zh-CN', { role: 'teach', onEnd: () => setSpeaking(false) });
    return () => cancelSpeak();
  }, [quiz.mode, quiz.idx, cur && cur.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 占位知识点（内容筹备中）：直接给提示，不进测验
  if (topic.status === 'placeholder' || quizzes.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-3">🚧</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{topic.title}</h2>
        <p className="text-gray-500 mb-6">这个知识点内容正在筹备中，敬请期待～</p>
        <button onClick={onBack} className="btn-kid bg-kid-blue text-white">返回知识点</button>
      </div>
    );
  }

  const handleAnswer = (i) => {
    if (quiz.testAnswer !== null || !cur) return;
    const options = cur.options || [];
    const correct = i === cur.answer;
    api
      .post('/progress', {
        child_id: childId,
        module: 'math',
        item_id: cur.id,
        correct,
        duration: 10,
        question: cur.question,
        user_answer: options[i],
        correct_answer: options[cur.answer],
      })
      .catch(() => {});
    if (correct) {
      addStars(1);
      quiz.markCorrect(quizzes.length, 'test'); // 答对：停留展示奖励后自动下一题
    } else {
      quiz.markWrong(false); // 答错：停住，等孩子决定
    }
  };

  const readQuestion = () => {
    if (!cur) return;
    setSpeaking(true);
    speak(mathSpeakText(cur.question), 'zh-CN', { onEnd: () => setSpeaking(false) });
  };

  // —— 学习阶段：讲题（先讲清楚，再进测验）——
  const goStep = (i) => {
    if (i < 0 || i > steps.length - 1) return;
    cancelSpeak();
    setSubStep(i);
  };
  const replay = () => {
    if (!step) return;
    cancelSpeak();
    setSpeaking(true);
    speak(stripForSpeech(step.text), 'zh-CN', { role: 'teach', onEnd: () => setSpeaking(false) });
  };
  const startTest = () => {
    cancelSpeak();
    setSpeaking(false);
    quiz.startTest();
  };

  if (quiz.mode === 'learn') {
    const isLast = subStep >= steps.length - 1;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-90"
            title="返回"
          >
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-1">
            <span className="text-2xl">{topic.emoji}</span>{topic.title}
          </h2>
          {steps.length > 0 && (
            <span className="ml-auto text-sm font-bold text-gray-400">讲解 {subStep + 1}/{steps.length}</span>
          )}
        </div>

        {steps.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-6 text-center">
            <p className="text-gray-600 mb-4">这个知识点我们直接来试一试吧！</p>
            <button onClick={startTest} className="btn-kid bg-kid-green text-white w-full text-lg">
              开始测验 🚀
            </button>
          </div>
        ) : (
          <>
            {/* 讲题进度点：点一点可回听任意一句 */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goStep(i)}
                  className={`math-dot ${i <= subStep ? 'math-dot-active' : ''}`}
                  title={`第 ${i + 1} 句`}
                  aria-label={`第 ${i + 1} 句`}
                />
              ))}
            </div>

            {/* 讲题卡：emoji 动画 + 语音同步 */}
            <div
              key={subStep}
              className={`math-step-in bg-white rounded-3xl shadow-xl p-6 text-center ${speaking ? 'playing-glow' : ''}`}
            >
              <div className={`${speaking ? 'math-say' : 'floaty'} text-7xl leading-none select-none`}>
                {step.emoji || '🧮'}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-kid-orange/15 text-kid-orange">
                  {STEP_LABEL[step.type] || '💡 讲解'}
                </span>
                {speaking && (
                  <span className="flex items-end gap-0.5 h-5 text-kid-orange" title="正在讲解">
                    <i className="wave-bar" /><i className="wave-bar" /><i className="wave-bar" />
                  </span>
                )}
              </div>
              <p className="mt-3 text-gray-800 text-xl font-bold leading-relaxed">{step.text}</p>
            </div>

            {/* 控制条：上一句 / 再听一遍 / 下一句（最后一句变成开始测验） */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => goStep(subStep - 1)}
                disabled={subStep === 0}
                className="w-14 h-14 shrink-0 rounded-2xl bg-white shadow flex items-center justify-center disabled:opacity-30 active:scale-90"
                title="上一句"
              >
                <Icon name="chevronRight" size={24} className="rotate-180 text-gray-500" />
              </button>

              <button
                onClick={replay}
                className={`h-14 shrink-0 px-4 rounded-2xl bg-white shadow font-bold text-kid-orange inline-flex items-center gap-1.5 active:scale-95 ${speaking ? 'playing-glow' : ''}`}
                title="再听一遍"
              >
                <Icon name="speaker" size={20} />{speaking ? '正在讲…' : '再听一遍'}
              </button>

              {isLast ? (
                <button onClick={startTest} className="btn-kid bg-kid-green text-white flex-1 h-14 text-lg">
                  开始测验 🚀
                </button>
              ) : (
                <button
                  onClick={() => goStep(subStep + 1)}
                  className={`btn-kid bg-kid-yellow text-white flex-1 h-14 text-lg ${speaking ? '' : 'math-next'}`}
                >
                  下一句 ▶
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // —— 完成阶段 ——
  if (quiz.mode === 'done') {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-3"><Icon name="trophy" size={60} className="mx-auto text-kid-orange" /></div>
        <h2 className="text-2xl font-bold text-kid-green mb-2">测验完成！</h2>
        <p className="text-gray-600 mb-6">你学完了「{topic.title}」，真棒！</p>
        <div className="flex gap-2 justify-center">
          <button onClick={onBack} className="btn-kid bg-kid-blue text-white">返回知识点</button>
          {onExit && (
            <button onClick={onExit} className="btn-kid bg-kid-yellow text-white">退出</button>
          )}
        </div>
      </div>
    );
  }

  // —— 测验阶段 ——
  if (!cur) return null;
  const options = cur.options || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-90"
          title="返回"
        >
          <Icon name="back" size={20} className="text-gray-600" />
        </button>
        <span className="text-lg text-gray-500 font-bold">{quiz.idx + 1}/{quizzes.length}</span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-2xl font-bold text-gray-800 my-6">
          <span className="break-words">{cur.question}</span>
          <button
            onClick={readQuestion}
            className={`w-10 h-10 rounded-full bg-kid-yellow/30 flex items-center justify-center active:scale-90 ${speaking ? 'animate-pulse' : ''}`}
            title="读题"
          >
            <Icon name="speaker" size={22} className="text-kid-orange" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={quiz.testAnswer !== null}
              className={`p-5 text-2xl font-bold rounded-2xl border-4 transition ${
                quiz.testAnswer === null
                  ? 'bg-gray-50 border-gray-200 hover:border-kid-green'
                  : i === cur.answer
                  ? 'bg-kid-green/30 border-kid-green'
                  : 'bg-red-100 border-red-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {quiz.testAnswer === true && (
          <div className="text-2xl font-bold mt-4 text-kid-green">
            🎉 答对啦！<span className="text-kid-yellow">得分 +1</span>
          </div>
        )}
        {quiz.testAnswer === false && (
          <div className="mt-4 space-y-3">
            <div className="text-2xl font-bold text-red-500">
              ❌ 正确答案是「{options[cur.answer]}」
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={quiz.retry} className="btn-kid bg-kid-yellow text-white">再试一次</button>
              <button onClick={() => quiz.goNext(quizzes.length, 'test')} className="btn-kid bg-kid-blue text-white">下一题</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

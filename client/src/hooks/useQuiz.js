import { useState, useEffect, useRef } from 'react';

// 答题节奏对幼儿很重要：
// - 答对：短暂停留展示奖励后自动推进，减少孩子的操作负担，保持流畅感
// - 答错：绝不自动推进，停下来等孩子理解正确答案，由他自己决定"再试一次"还是"下一题"
// - 连错两次：自动退回学习态把内容重新学一遍，避免一直错下去产生挫败
const CORRECT_DELAY_MS = 2000;
const MAX_WRONG_BEFORE_LEARN = 2;

export function useQuiz({ resetKey, initialMode = 'learn' }) {
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState(initialMode);
  const [testAnswer, setTestAnswer] = useState(null);
  const [wrongCount, setWrongCount] = useState(0);

  const timerRef = useRef(null);
  const idxRef = useRef(0);
  const wrongRef = useRef(0);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  const clearTimer = () => clearTimeout(timerRef.current);

  // 切换 Tab / 分类 / 级别时重置进度，并取消尚未触发的自动推进
  useEffect(() => {
    setIdx(0);
    setMode(initialMode);
    setTestAnswer(null);
    wrongRef.current = 0;
    setWrongCount(0);
    return () => clearTimeout(timerRef.current);
  }, [resetKey]);

  // 答对：停留一会儿展示奖励，然后自动进入下一题。
  // nextMode 决定下一题的进入方式：有"学"环节的模块回到学习态（学新字），纯答题模块继续答题
  const markCorrect = (listLength, nextMode = 'test') => {
    setTestAnswer(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (idxRef.current < listLength - 1) {
        setIdx(idxRef.current + 1);
        setMode(nextMode);
        setTestAnswer(null);
        wrongRef.current = 0;
        setWrongCount(0);
      } else {
        setMode('done');
      }
    }, CORRECT_DELAY_MS);
  };

  // 答错：停住，不自动推进
  const markWrong = (fallbackToLearn = false) => {
    setTestAnswer(false);
    clearTimer();
    wrongRef.current += 1;
    setWrongCount(wrongRef.current);
    if (fallbackToLearn && wrongRef.current >= MAX_WRONG_BEFORE_LEARN) {
      setMode('learn');
    }
  };

  // 再试一次：清除作答状态，同一题重做
  const retry = () => {
    clearTimer();
    setTestAnswer(null);
  };

  // 下一题：答错后孩子主动跳过
  const goNext = (listLength, nextMode = 'test') => {
    clearTimer();
    if (idxRef.current < listLength - 1) {
      setIdx(idxRef.current + 1);
      setMode(nextMode);
      setTestAnswer(null);
      wrongRef.current = 0;
      setWrongCount(0);
    } else {
      setMode('done');
    }
  };

  const startTest = () => {
    clearTimer();
    setMode('test');
    setTestAnswer(null);
    wrongRef.current = 0;
    setWrongCount(0);
  };

  // 跳转到指定位置（用于恢复进度、点字表跳字）
  const jumpTo = (pos, nextMode) => {
    clearTimer();
    setIdx(pos);
    if (nextMode) setMode(nextMode);
    setTestAnswer(null);
    wrongRef.current = 0;
    setWrongCount(0);
  };

  const restart = (nextMode = initialMode) => {
    clearTimer();
    setIdx(0);
    setMode(nextMode);
    setTestAnswer(null);
    wrongRef.current = 0;
    setWrongCount(0);
  };

  return { idx, mode, testAnswer, wrongCount, markCorrect, markWrong, retry, goNext, startTest, restart, jumpTo };
}

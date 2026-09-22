import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import api, { cancelSpeak } from '../api.js';
import Icon from '../components/Icon.jsx';
import AgeSelector from '../components/english/AgeSelector.jsx';
import CategoryGrid from '../components/english/CategoryGrid.jsx';
import LearnSteps from '../components/english/LearnSteps.jsx';
import SpeakMode from '../components/english/SpeakMode.jsx';
import SkillsTabs from '../components/english/SkillsTabs.jsx';
import { ageGroupOfChild, CAT_SCOPE } from '../utils/englishContent.js';
import { useQuiz } from '../hooks/useQuiz.js';
import { useLandscape } from '../hooks/useLandscape.js';
import { getStars, addStars, subscribeStars } from '../utils/stars.js';

function useStars() {
  const [s, setS] = useState(getStars());
  useEffect(() => subscribeStars(setS), []);
  return s;
}

// 上浮气泡装饰（纯 CSS，营造海底纵深）
function Bubbles() {
  const bubbles = [
    { l: '8%', s: 18, d: 9, t: 0 },
    { l: '22%', s: 26, d: 12, t: 2 },
    { l: '38%', s: 14, d: 8, t: 4 },
    { l: '55%', s: 30, d: 14, t: 1 },
    { l: '70%', s: 20, d: 10, t: 3 },
    { l: '82%', s: 16, d: 9, t: 5 },
    { l: '92%', s: 24, d: 13, t: 2.5 },
    { l: '48%', s: 12, d: 7, t: 6 },
  ];
  return (
    <>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="ocean-bubble"
          style={{ left: b.l, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.t}s` }}
        />
      ))}
    </>
  );
}

/**
 * 英语模块容器页（单入口 /english，沉浸式全屏）。
 * 视图状态机：age（选年龄）→ category（选分类）→ learn（分步引导学习）；
 * 分类页角落保留 英语沟通 / 技能练习 入口。
 */
export default function English() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const landscape = useLandscape();
  const [view, setView] = useState('age'); // age | category | learn | speak | skills
  const [ageGroups, setAgeGroups] = useState([]);
  const [age, setAge] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [words, setWords] = useState([]);
  const [posReady, setPosReady] = useState(false);
  const readyScopeRef = useRef('');
  const quiz = useQuiz({ resetKey: categoryId, initialMode: 'learn' });
  const { idx, mode: stepMode, testAnswer } = quiz;
  const curWord = words[idx];
  const curCategory = categories.find((c) => c.id === categoryId);
  const recommended = ageGroupOfChild(activeChild?.age);
  const stars = useStars();

  // 年龄段
  useEffect(() => {
    api.get('/courses/english/age-groups').then((r) => setAgeGroups(r.data)).catch(() => {});
  }, []);

  // 主题分类（换年龄段重置已选主题，直接进对应年龄段分类页）
  useEffect(() => {
    if (!age) return;
    setCategoryId(null);
    api.get('/courses/english/categories', { params: { age } }).then((r) => setCategories(r.data)).catch(() => {});
  }, [age]);

  // 主题下的单词
  useEffect(() => {
    if (!categoryId) {
      setWords([]);
      return;
    }
    api.get('/courses/english/words', { params: { categoryId } }).then((r) => setWords(r.data)).catch(() => {});
  }, [categoryId]);

  // 断点续学：恢复上次学到第几个词
  useEffect(() => {
    if (!activeChild || !categoryId || words.length === 0) return;
    setPosReady(false);
    readyScopeRef.current = '';
    api
      .get(`/learning/${activeChild.id}`, { params: { module: 'english', scope: CAT_SCOPE(categoryId) } })
      .then((r) => {
        const pos = Number(r.data?.position || 0);
        if (pos > 0 && pos < words.length) quiz.jumpTo(pos, 'learn');
        readyScopeRef.current = String(categoryId);
        setPosReady(true);
      })
      .catch(() => {
        readyScopeRef.current = String(categoryId);
        setPosReady(true);
      });
  }, [activeChild, categoryId, words.length]);

  useEffect(() => {
    if (!activeChild || !posReady || !categoryId) return;
    if (readyScopeRef.current !== String(categoryId)) return;
    api
      .put('/learning', {
        child_id: activeChild.id,
        module: 'english',
        scope: CAT_SCOPE(categoryId),
        position: idx,
      })
      .catch(() => {});
  }, [idx, categoryId, posReady, activeChild]);

  // 切词 / 换主题 / 换视图：立刻停掉朗读，杜绝叠音
  useEffect(() => {
    cancelSpeak();
  }, [curWord?.id, categoryId, view]);
  useEffect(() => () => cancelSpeak(), []);

  // 选项必须 useMemo：在渲染里现洗牌会出现"点了第 3 个、高亮却在第 1 个"
  const wordOptions = useMemo(() => {
    if (!curWord) return [];
    const others = words
      .filter((w) => w.id !== curWord.id && w.english !== curWord.english)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [...others, curWord].sort(() => Math.random() - 0.5);
  }, [words, curWord]);

  const submitAnswer = (correct, userAns) => {
    if (!curWord || !activeChild) return;
    api
      .post('/progress', {
        child_id: activeChild.id,
        module: 'english',
        item_id: curWord.id,
        correct,
        duration: 15,
        question: `${curWord.chinese} 对应的英文单词是？`,
        user_answer: userAns,
        correct_answer: curWord.english,
        explanation: curWord.meaning || '',
      })
      .catch(() => {});
  };

  const handleSelect = (i) => {
    const opt = wordOptions[i];
    if (!opt || !curWord) return;
    const isRight = opt.id === curWord.id;
    submitAnswer(isRight, opt.english);
    // 答对后回到学习态进入下一个词，让孩子先看到新单词的讲解；答错则停下
    if (isRight) { addStars(1); quiz.markCorrect(words.length, 'learn'); }
    else quiz.markWrong(true);
  };

  const restartCategory = () => {
    if (!categoryId || !activeChild) return;
    api
      .put('/learning', {
        child_id: activeChild.id,
        module: 'english',
        scope: CAT_SCOPE(categoryId),
        position: 0,
      })
      .catch(() => {});
    quiz.restart('learn');
  };

  const nextWord = () => {
    if (words.length === 0) return;
    quiz.jumpTo(idx + 1 < words.length ? idx + 1 : 0, 'learn');
  };

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;

  // 选年龄
  if (view === 'age') {
    return (
      <div className="ocean-scene h-[100dvh] flex flex-col overflow-hidden">
        <Bubbles />
        <div className="relative z-20 flex items-center px-3 pt-3">
          <button
            onClick={() => navigate('/courses')}
            className="w-10 h-10 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-90"
            title="返回课程"
          >
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
          <AgeSelector groups={ageGroups} active={age} recommended={recommended} onPick={(k) => { setAge(k); setView('category'); }} />
        </div>
      </div>
    );
  }

  // 选分类
  if (view === 'category') {
    const ag = ageGroups.find((g) => g.key === age);
    return (
      <div className="ocean-scene h-[100dvh] flex flex-col overflow-hidden">
        <Bubbles />
        {/* 页面内顶栏：返回 / 孩子 / 可点改年龄 / 星星 / 设置 */}
        <div className="relative z-20 flex items-center justify-between gap-2 px-3 pt-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('age')} className="w-10 h-10 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-90" title="换年龄段">
              <Icon name="back" size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => navigate('/children', { state: { from: '/english' } })}
              className="w-11 h-11 rounded-full bg-white/85 shadow flex items-center justify-center border-2 border-white active:scale-90"
              title="切换孩子"
            >
              <Icon name={activeChild.avatar || 'smile'} size={24} className="text-kid-orange" />
            </button>
          </div>
          <button onClick={() => setView('age')} className="flex items-center gap-1 bg-white/85 rounded-full px-3 py-1.5 text-sm font-bold text-kid-blue shadow active:scale-95">
            <Icon name="user" size={14} />宝宝 {ag?.label || ''}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="bg-white/85 rounded-xl px-2 py-1 text-sm font-bold text-kid-yellow inline-flex items-center gap-1" title="星星总数">
              <Icon name="star" size={16} />{stars}
            </span>
            <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-90" title="设置">
              <Icon name="settings" size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* 分类宫格 */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 py-2">
          <CategoryGrid categories={categories} onPick={(id) => { setCategoryId(id); setView('learn'); }} />
        </div>

        {/* 吉祥物：角落小装饰，不占布局空间（放在卡片下方，避免遮挡） */}
        <img
          src="/assets/english/mascot.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-3 bottom-3 w-14 h-14 floaty opacity-90 z-20"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />

        {/* 角落入口：英语沟通 / 技能练习 */}
        <div className="absolute right-3 bottom-3 z-30 flex flex-col gap-2">
          <button
            onClick={() => { if (!categoryId && categories[0]) setCategoryId(categories[0].id); setView('speak'); }}
            className="glass rounded-full px-4 py-2 text-sm font-bold text-kid-purple inline-flex items-center gap-1 active:scale-90"
          >
            <Icon name="mic" size={16} />英语沟通
          </button>
          <button
            onClick={() => setView('skills')}
            className="glass rounded-full px-4 py-2 text-sm font-bold text-kid-blue inline-flex items-center gap-1 active:scale-90"
          >
            <Icon name="gamepad" size={16} />技能练习
          </button>
        </div>
      </div>
    );
  }

  // 分步引导学习
  if (view === 'learn') {
    if (!words.length || !curWord) {
      return (
        <div className="ocean-scene h-[100dvh] flex items-center justify-center text-white font-bold text-lg">
          加载中…
        </div>
      );
    }
    return (
      <LearnSteps
        key={curWord.id}
        word={curWord}
        words={words}
        idx={idx}
        total={words.length}
        quiz={quiz}
        wordOptions={wordOptions}
        onSelect={handleSelect}
        onStartTest={quiz.startTest}
        onBack={() => { setCategoryId(null); setView('category'); }}
        onNextWord={nextWord}
        onOpenSpeak={() => setView('speak')}
        stars={stars}
        landscape={landscape}
      />
    );
  }

  // 英语沟通（口语跟读）
  if (view === 'speak') {
    if (!curWord) {
      return <div className="ocean-scene h-[100dvh] flex items-center justify-center text-white font-bold text-lg">加载中…</div>;
    }
    return (
      <div className="ocean-scene h-[100dvh] flex flex-col overflow-hidden">
        <Bubbles />
        <div className="relative z-20 flex items-center gap-2 px-3 pt-3">
          <button onClick={() => setView('category')} className="w-10 h-10 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-90" title="返回分类">
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
          <span className="font-bold text-white drop-shadow">英语沟通 · 跟读</span>
        </div>
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-3">
          <SpeakMode word={curWord} childId={activeChild.id} onNext={nextWord} onExit={() => setView('category')} />
        </div>
      </div>
    );
  }

  // 技能练习
  return (
    <div className="ocean-scene h-[100dvh] flex flex-col overflow-hidden">
      <Bubbles />
      <div className="relative z-20 flex items-center gap-2 px-3 pt-3">
        <button onClick={() => setView('category')} className="w-10 h-10 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-90" title="返回分类">
          <Icon name="back" size={20} className="text-gray-600" />
        </button>
        <span className="font-bold text-white drop-shadow">技能练习</span>
      </div>
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-3">
        <SkillsTabs activeChild={activeChild} />
      </div>
    </div>
  );
}

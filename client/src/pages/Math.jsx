import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import MathStageSelector from '../components/math/MathStageSelector.jsx';
import MathTopicList from '../components/math/MathTopicList.jsx';
import MathLearnSteps from '../components/math/MathLearnSteps.jsx';
import { mathStageOfChild, MATH_SCOPE } from '../utils/mathContent.js';
import { getStars, addStars, subscribeStars } from '../utils/stars.js';

function useStars() {
  const [s, setS] = useState(getStars());
  useEffect(() => subscribeStars(setS), []);
  return s;
}

// 漂浮的装饰 emoji（纯 CSS 营造数学乐园氛围）
const DECOR = ['➕', '🔢', '🔺', '⚖️', '🔵', '✖️'];
function MathScene({ children }) {
  return (
    <div className="math-scene h-[100dvh] flex flex-col overflow-hidden relative">
      {DECOR.map((d, i) => (
        <span
          key={i}
          className="math-float absolute text-3xl opacity-20 pointer-events-none select-none"
          style={{ left: `${(i * 16 + 6) % 92}%`, top: `${(i * 23 + 10) % 80}%`, animationDelay: `${i * 0.7}s` }}
        >
          {d}
        </span>
      ))}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  );
}

/**
 * 数学模块容器页（单入口 /math，沉浸式全屏）。
 * 视图状态机：stage（选学段）→ topic（知识点列表）→ learn（分步学习+测验）。
 */
export default function Math() {
  const { activeChild } = useAuth();
  const navigate = useNavigate();
  const stars = useStars();
  const [view, setView] = useState('stage'); // stage | topic | learn
  const [stages, setStages] = useState([]);
  const [stage, setStage] = useState(null);
  const [stageLabel, setStageLabel] = useState('');
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState(null);
  const [quizzes, setQuizzes] = useState([]);

  const recommended = mathStageOfChild(activeChild?.age);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.get('/courses/math/stages').then((r) => {
      const list = r.data;
      setStages(list);
      // 支持 ?stage= 深链：从成长主线直接进入对应学段
      const q = searchParams.get('stage');
      if (q && list.some((s) => s.key === q)) pickStage(q);
    }).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!stage) return;
    api.get('/courses/math/topics', { params: { stage } }).then((r) => setTopics(r.data)).catch(() => {});
  }, [stage]);

  if (!activeChild) {
    return (
      <MathScene>
        <p className="text-center text-gray-500 py-10">请先选择孩子</p>
      </MathScene>
    );
  }

  const pickStage = (key) => {
    const st = stages.find((s) => s.key === key);
    setStage(key);
    setStageLabel(st ? st.label : '');
    setView('topic');
  };

  const openTopic = (t) => {
    if (!t.unlocked) return;
    api.get(`/courses/math/topics/${t.id}`).then((tr) => {
      setTopic(tr.data);
      if (tr.data.status !== 'placeholder') {
        api.get(`/courses/math/topics/${t.id}/quiz`).then((qr) => setQuizzes(qr.data)).catch(() => setQuizzes([]));
      } else {
        setQuizzes([]);
      }
      setView('learn');
    }).catch(() => {});
  };

  const backToTopic = () => {
    setTopic(null);
    setQuizzes([]);
    setView('topic');
  };
  const backToStage = () => {
    setStage(null);
    setStageLabel('');
    setTopics([]);
    setView('stage');
  };

  // 选学段
  if (view === 'stage') {
    return (
      <MathScene>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/courses')} className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-90" title="返回课程">
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
          <span className="font-bold text-kid-orange text-lg">数学思维</span>
          <div className="flex items-center gap-1.5">
            <span className="bg-white rounded-xl px-2 py-1 text-sm font-bold text-kid-yellow inline-flex items-center gap-1">
              <Icon name="star" size={16} />{stars}
            </span>
            <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-90" title="设置">
              <Icon name="settings" size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">选择学段</h2>
        <p className="text-gray-500 mb-4">从幼儿到小学六年级，一步步来～</p>
        <MathStageSelector stages={stages} active={stage} recommended={recommended} onPick={pickStage} />
      </MathScene>
    );
  }

  // 知识点列表
  if (view === 'topic') {
    return (
      <MathScene>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={backToStage} className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-90" title="换学段">
              <Icon name="back" size={20} className="text-gray-600" />
            </button>
            <button onClick={() => navigate('/children', { state: { from: '/math' } })} className="w-11 h-11 rounded-full bg-white shadow flex items-center justify-center border-2 border-white active:scale-90" title="切换孩子">
              <Icon name={activeChild.avatar || 'smile'} size={24} className="text-kid-orange" />
            </button>
          </div>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center active:scale-90" title="设置">
            <Icon name="settings" size={20} className="text-gray-600" />
          </button>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{stageLabel} · 知识点</h2>
        <p className="text-gray-500 mb-4">点亮的才能进入，先掌握前置知识点哦</p>
        <MathTopicList topics={topics} onPick={openTopic} />
      </MathScene>
    );
  }

  // 学习 + 测验
  if (view === 'learn' && topic) {
    return (
      <MathScene>
        <MathLearnSteps
          key={topic.id}
          topic={topic}
          quizzes={quizzes}
          childId={activeChild.id}
          onBack={backToTopic}
          onExit={() => navigate('/courses')}
        />
      </MathScene>
    );
  }

  return <MathScene><p className="text-center text-gray-400 py-10">加载中…</p></MathScene>;
}

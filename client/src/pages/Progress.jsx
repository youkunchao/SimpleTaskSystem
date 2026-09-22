import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { MODULE_LABELS } from '../utils/review.js';

const COLORS = ['#FF8C42', '#60A5FA', '#34D399', '#A78BFA', '#FF6B9D'];

// 统一风格的圆角提示气泡（避免 Recharts 默认的灰色方框）
const tooltipProps = {
  contentStyle: {
    borderRadius: 16,
    border: '2px solid rgba(167,139,250,0.35)',
    boxShadow: '0 10px 30px -12px rgba(60,50,90,0.35)',
    fontSize: 13,
    fontWeight: 700,
    color: '#3B3355',
    padding: '8px 12px',
  },
  labelStyle: { color: '#3B3355', fontWeight: 800 },
  cursor: { fill: 'rgba(96,165,250,0.08)' },
};

function StatCard({ value, label, icon, tone }) {
  return (
    <div className={`rounded-3xl p-4 text-center shadow-kid ${tone}`}>
      <div className="mb-1 flex justify-center">
        <Icon name={icon} size={26} />
      </div>
      <div className="text-3xl font-extrabold leading-none">{value}</div>
      <div className="text-xs font-bold opacity-80 mt-1">{label}</div>
    </div>
  );
}

export default function Progress() {
  const { activeChild } = useAuth();
  const [data, setData] = useState(null);
  const [ability, setAbility] = useState([]);

  useEffect(() => {
    if (activeChild) {
      api.get(`/progress/${activeChild.id}`).then(res => setData(res.data)).catch(() => {});
      api.get(`/progress/ability/${activeChild.id}`).then(res => setAbility(res.data || [])).catch(() => {});
    }
  }, [activeChild]);

  if (!activeChild) return <p className="text-center text-kid-ink/40 py-10">请先选择孩子</p>;
  if (!data) return <p className="text-center text-kid-ink/40 py-10">加载中...</p>;

  // 与复习列表共用同一份模块名映射，避免出现 chinese-reading 这种原始 key
  const moduleName = MODULE_LABELS;

  const pieData = data.byModule.map(m => ({ name: moduleName[m.module] || m.module, value: m.count }));
  const barData = [...data.byDay].reverse();

  return (
    <div className="space-y-5">
      <h2 className="page-title">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-kid-blue/15">
          <Icon name="chart" size={22} className="text-kid-blue" />
        </span>
        学习进度
      </h2>

      {/* 总览 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={data.total.count} label="总学习次数" icon="book" tone="bg-kid-orange/15 text-kid-orange" />
        <StatCard value={`${data.total.accuracy}%`} label="正确率" icon="target" tone="bg-kid-green/15 text-kid-green" />
        <StatCard value={Math.round(data.total.duration / 60)} label="总时长(分)" icon="clock" tone="bg-kid-blue/15 text-kid-blue" />
      </div>

      {/* 各模块统计 */}
      <div className="card-kid">
        <h3 className="text-lg font-extrabold text-kid-ink mb-3">各模块学习分布</h3>
        {pieData.length === 0 ? (
          <p className="text-center text-kid-ink/40 py-6">暂无学习记录</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke="none"
                >
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipProps} formatter={(v, n) => [`${v} 次`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {pieData.map((d, i) => (
                <span key={i} className="chip" style={{ background: `${COLORS[i % COLORS.length]}22`, color: COLORS[i % COLORS.length] }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {d.name} {d.value}次
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 每日学习趋势 */}
      <div className="card-kid">
        <h3 className="text-lg font-extrabold text-kid-ink mb-3">近14天学习次数</h3>
        {barData.length === 0 ? (
          <p className="text-center text-kid-ink/40 py-6">暂无记录</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="barKid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFB01F" />
                  <stop offset="100%" stopColor="#FF8C42" />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9AA3B2' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9AA3B2' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tooltipProps} cursor={{ fill: 'rgba(255,176,31,0.10)' }} />
              <Bar dataKey="count" fill="url(#barKid)" radius={[10, 10, 6, 6]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 五级记忆分布 */}
      <div className="card-kid">
        <h3 className="text-lg font-extrabold text-kid-ink mb-3 inline-flex items-center gap-2">
          <Icon name="brain" size={20} className="text-kid-purple" />艾宾浩斯记忆分布
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {data.memoryDistribution?.map((m, i) => (
            <div key={i} className={`rounded-2xl p-3 text-center ${['bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50', 'bg-blue-50'][i]}`}>
              <div className={`text-xs font-bold ${['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600', 'text-blue-600'][i]}`}>{m.label}</div>
              <div className="text-2xl font-extrabold text-kid-ink">{m.count}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-kid-ink/40 mt-2 text-center">陌生→初识→熟悉→熟练→精通，答对升级、答错重置</p>
      </div>

      {/* 数学能力雷达：按能力标签维度聚合正确率 */}
      <div className="card-kid">
        <h3 className="text-lg font-extrabold text-kid-ink mb-3 inline-flex items-center gap-2">
          <Icon name="chart" size={20} className="text-kid-purple" />数学能力雷达
        </h3>
        {ability.length === 0 || ability.every((a) => a.total === 0) ? (
          <p className="text-center text-kid-ink/40 py-6">完成数学测验后，这里会生成能力雷达图～</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={ability} outerRadius={90}>
                <PolarGrid stroke="rgba(167,139,250,0.25)" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 700 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#B4B9C4' }} axisLine={false} />
                <Radar name="正确率" dataKey="accuracy" stroke="#A78BFA" strokeWidth={2.5} fill="#A78BFA" fillOpacity={0.45} />
                <Tooltip {...tooltipProps} formatter={(v) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-kid-ink/40 mt-1">
              维度正确率：{ability.filter((a) => a.total > 0).map((a) => `${a.dimension} ${a.accuracy}%`).join(' · ') || '暂无数据'}
            </p>
          </>
        )}
      </div>

      {/* 错题统计 */}
      <div className="card-kid">
        <h3 className="text-lg font-extrabold text-kid-ink mb-3 inline-flex items-center gap-2">
          <Icon name="wrong" size={20} className="text-red-500" />错题统计
        </h3>
        {!data.wrongStats || data.wrongStats.length === 0 ? (
          <p className="text-center text-kid-ink/40 py-6">暂无错题，继续保持！</p>
        ) : (
          <div className="space-y-2">
            {data.wrongStats.map((w, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 rounded-2xl p-3">
                <span className="font-bold text-kid-ink">{moduleName[w.module] || w.module}</span>
                <span className="chip bg-red-100 text-red-500">{w.count} 道</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

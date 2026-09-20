import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Icon from '../components/Icon.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MODULE_LABELS } from '../utils/review.js';

const COLORS = ['#FF8C42', '#60A5FA', '#34D399', '#A78BFA', '#FF6B9D'];

export default function Progress() {
  const { activeChild } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (activeChild) {
      api.get(`/progress/${activeChild.id}`).then(res => setData(res.data)).catch(() => {});
    }
  }, [activeChild]);

  if (!activeChild) return <p className="text-center text-gray-400 py-10">请先选择孩子</p>;
  if (!data) return <p className="text-center text-gray-400 py-10">加载中...</p>;

  // 与复习列表共用同一份模块名映射，避免出现 chinese-reading 这种原始 key
  const moduleName = MODULE_LABELS;

  const pieData = data.byModule.map(m => ({ name: moduleName[m.module] || m.module, value: m.count }));

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
        <Icon name="chart" size={26} className="text-kid-blue" />学习进度
      </h2>

      {/* 总览 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-kid-orange">{data.total.count}</div>
          <div className="text-sm text-gray-500">总学习次数</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-kid-green">{data.total.accuracy}%</div>
          <div className="text-sm text-gray-500">正确率</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <div className="text-3xl font-bold text-kid-blue">{Math.round(data.total.duration / 60)}</div>
          <div className="text-sm text-gray-500">总时长(分)</div>
        </div>
      </div>

      {/* 各模块统计 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3">各模块学习分布</h3>
        {pieData.length === 0 ? (
          <p className="text-center text-gray-400 py-6">暂无学习记录</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-1 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></span>
              {d.name}: {d.value}次
            </div>
          ))}
        </div>
      </div>

      {/* 每日学习趋势 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3">近14天学习次数</h3>
        {data.byDay.length === 0 ? (
          <p className="text-center text-gray-400 py-6">暂无记录</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...data.byDay].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#FF8C42" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 五级记忆分布 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3 inline-flex items-center gap-2">
          <Icon name="brain" size={20} className="text-kid-purple" />艾宾浩斯记忆分布
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {data.memoryDistribution?.map((m, i) => (
            <div key={i} className={`rounded-2xl p-3 text-center ${['bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50', 'bg-blue-50'][i]}`}>
              <div className={`text-sm font-bold ${['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600', 'text-blue-600'][i]}`}>{m.label}</div>
              <div className="text-2xl font-bold text-gray-800">{m.count}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">陌生→初识→熟悉→熟练→精通，答对升级、答错重置</p>
      </div>

      {/* 错题统计 */}
      <div className="bg-white rounded-3xl shadow-lg p-5">
        <h3 className="text-lg font-bold mb-3 inline-flex items-center gap-2">
          <Icon name="wrong" size={20} className="text-red-500" />错题统计
        </h3>
        {!data.wrongStats || data.wrongStats.length === 0 ? (
          <p className="text-center text-gray-400 py-6">暂无错题，继续保持！</p>
        ) : (
          <div className="space-y-2">
            {data.wrongStats.map((w, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 rounded-2xl p-3">
                <span className="font-bold text-gray-700">{moduleName[w.module] || w.module}</span>
                <span className="text-red-500 font-bold">{w.count} 道</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

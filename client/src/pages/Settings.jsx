import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import {
  getVoices, whenVoicesReady, loadTtsSettings, saveTtsSettings,
  recommendVoiceName, applyTtsConfig,
} from '../utils/tts.js';

const LANGS = [
  { code: 'zh-CN', label: '中文（普通话）', sample: '这是哪个字？火，火焰的火。' },
  { code: 'en-US', label: 'English 英文', sample: 'This is an apple. What do you see?' },
];

// 把系统语音名精简成好读的短名，避免一长串英文把卡片撑破
function cleanVoiceName(name) {
  return name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s*-\s*(Chinese|English).*$/i, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim() || name;
}

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadTtsSettings());
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    whenVoicesReady((vs) => {
      setVoices(vs);
      // 首次进入且未手动选择时，自动把"推荐人声"设为默认
      setSettings((prev) => {
        const next = { ...prev, voices: { ...(prev.voices || {}) } };
        let changed = false;
        LANGS.forEach((l) => {
          if (next.voices[l.code] === undefined) {
            next.voices[l.code] = recommendVoiceName(l.code, vs);
            changed = true;
          }
        });
        if (changed) saveTtsSettings(next);
        return next;
      });
    });
    const onChanged = () => setVoices(getVoices());
    window.speechSynthesis?.addEventListener?.('voiceschanged', onChanged);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', onChanged);
  }, []);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveTtsSettings(next);
  };

  // 按语言筛出可用人声（zh-CN / en-US 前缀匹配，容忍 zh_CN 等写法）
  const voiceFor = (code) =>
    voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(code.toLowerCase()));

  // 试听某个具体人声（未选中也能试），语速/语调沿用当前设置
  const previewVoice = (code, voiceName) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const sample = LANGS.find((l) => l.code === code)?.sample;
    if (!sample) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(sample);
    applyTtsConfig(utter, code);
    const v = voiceName ? getVoices().find((x) => x.name === voiceName) : null;
    if (v) utter.voice = v;
    window.speechSynthesis.speak(utter);
  };

  // 一键恢复推荐人声
  const applyRecommended = () => {
    const next = { ...settings, voices: { ...(settings.voices || {}) } };
    LANGS.forEach((l) => { next.voices[l.code] = recommendVoiceName(l.code, voices); });
    setSettings(next);
    saveTtsSettings(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-kid-orange" title="返回">
          <Icon name="back" size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">朗读设置</h2>
      </div>

      {/* 人声选择 */}
      <div className="bg-white rounded-3xl shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Icon name="speaker" size={20} className="text-kid-orange" />朗读人声
          </h3>
          <button onClick={applyRecommended} className="text-xs font-bold text-kid-blue hover:text-kid-orange">
            恢复推荐
          </button>
        </div>
        <p className="text-xs text-gray-500 -mt-1">
          首选推荐：<b>知性温柔女老师音色</b>（吐字清楚、声调标准、不卖萌），
          读拼音 <b>huǒ</b> 时四声饱满准确，最适合拼音识字题。
        </p>

        {LANGS.map((l) => {
          const list = voiceFor(l.code);
          const rec = recommendVoiceName(l.code, voices);
          const cur = settings.voices?.[l.code] ?? '';
          const rows = [{ name: '', label: '系统默认' }, ...list.map((v) => ({ name: v.name, label: cleanVoiceName(v.name) }))];
          return (
            <div key={l.code}>
              <div className="text-sm text-gray-600 mb-1.5">{l.label}</div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                {rows.map((row) => {
                  const active = cur === row.name;
                  const isRec = !!row.name && row.name === rec;
                  return (
                    <div
                      key={row.name || 'default'}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition ${
                        active ? 'border-kid-orange bg-kid-orange/5' : 'border-gray-200'
                      }`}>
                      <button
                        onClick={() => update({ voices: { ...settings.voices, [l.code]: row.name } })}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left">
                        <Icon
                          name={active ? 'check' : 'circle'}
                          size={16}
                          className={active ? 'text-kid-orange shrink-0' : 'text-gray-300 shrink-0'}
                        />
                        <span className="text-sm text-gray-700 truncate" title={row.name || '系统默认'}>
                          {row.label}
                        </span>
                        {isRec && (
                          <span className="shrink-0 text-[10px] leading-none bg-kid-yellow text-white px-1.5 py-0.5 rounded-full">
                            推荐
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => previewVoice(l.code, row.name)}
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-kid-blue">
                        <Icon name="speaker" size={14} />试听
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {voices.length === 0 && (
          <p className="text-xs text-gray-400">
            正在加载可用语音…若列表一直为空，说明当前系统未安装中文/英文语音包，
            可在系统「语音/语音识别」设置中添加（Windows 可装「Microsoft 晓妍/晓晓 在线自然语音」等，Mac 有「Ting-Ting」「Samantha」）。
          </p>
        )}
      </div>

      {/* 语速 / 语调 */}
      <div className="bg-white rounded-3xl shadow p-5 space-y-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Icon name="music" size={20} className="text-kid-orange" />语速与语调
        </h3>
        <div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>语速（慢 ↔ 快）</span><span>{settings.rate.toFixed(2)}</span>
          </div>
          <input type="range" min="0.5" max="2" step="0.05" value={settings.rate}
            onChange={(e) => update({ rate: parseFloat(e.target.value) })}
            className="w-full accent-kid-orange" />
        </div>
        <div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>语调（低 ↔ 高）</span><span>{settings.pitch.toFixed(2)}</span>
          </div>
          <input type="range" min="0" max="2" step="0.05" value={settings.pitch}
            onChange={(e) => update({ pitch: parseFloat(e.target.value) })}
            className="w-full accent-kid-orange" />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        设置自动保存到本机，全站朗读（读题、听读音、听力播放）都会使用此配置。
      </p>
    </div>
  );
}

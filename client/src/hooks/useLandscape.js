import { useState, useEffect } from 'react';

/** 监听设备方向：横屏(true) / 竖屏(false) */
export function useLandscape() {
  // 以视口宽高比为准（比 orientation 媒体查询更稳），并兼容 matchMedia
  const get = () => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth && window.innerHeight) return window.innerWidth > window.innerHeight;
    return window.matchMedia ? window.matchMedia('(orientation: landscape)').matches : true;
  };
  const [landscape, setLandscape] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(orientation: landscape)') : null;
    const onChange = () => setLandscape(get());
    onChange();
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else mq.addListener(onChange);
    }
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener('change', onChange);
        else mq.removeListener(onChange);
      }
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
    };
  }, []);
  return landscape;
}

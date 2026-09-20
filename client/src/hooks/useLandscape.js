import { useState, useEffect } from 'react';

/** 监听设备方向：横屏(true) / 竖屏(false) */
export function useLandscape() {
  const get = () => (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(orientation: landscape)').matches
    : true;
  const [landscape, setLandscape] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const onChange = () => setLandscape(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return landscape;
}

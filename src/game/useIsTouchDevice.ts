import { useEffect, useState } from 'react';

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
  if (coarse) return true;
  return navigator.maxTouchPoints > 0 && !fine;
}

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(detectTouchDevice);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(pointer: coarse)');
    const onChange = () => setIsTouch(detectTouchDevice());
    const onFirstTouch = () => setIsTouch(true);

    mq?.addEventListener?.('change', onChange);
    window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true });
    return () => {
      mq?.removeEventListener?.('change', onChange);
      window.removeEventListener('touchstart', onFirstTouch);
    };
  }, []);

  return isTouch;
}

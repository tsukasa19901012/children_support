import { useEffect, useState } from "react";

/**
 * iOS Safari: キーボード表示時に visual viewport 下端までの距離（px）。
 * 固定フッターの bottom に使う。resize のみ監視（scroll しない＝震え防止）。
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };

    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  return inset;
}

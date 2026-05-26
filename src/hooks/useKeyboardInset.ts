import { useEffect, useState } from "react";

/** iOS ホーム画面追加（standalone）では visualViewport の offset が誤ることがある */
function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

/**
 * iOS Safari: キーボード表示時に visual viewport 下端までの距離（px）。
 * 固定フッターの bottom に使う。standalone では誤検知を抑える。
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      const maxKeyboard = Math.round(window.innerHeight * 0.55);
      let next = Math.max(0, Math.min(Math.round(gap), maxKeyboard));

      // キーボード未表示なのに大きな inset が出る standalone バグを無視
      if (isStandalonePwa() && vv.height > window.innerHeight * 0.92) {
        next = 0;
      }

      setInset(next);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

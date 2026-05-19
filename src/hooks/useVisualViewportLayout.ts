import { useEffect, useState } from "react";

/** iOS Safari: キーボード表示時の見えている領域（visual viewport） */
export type VisualViewportLayout = {
  height: number;
  offsetTop: number;
};

/**
 * チャット画面を visual viewport に合わせる。
 * iOS でキーボード表示時もフッター（送信欄）が画面内に収まるようにする。
 */
export function useVisualViewportLayout(): VisualViewportLayout {
  const [layout, setLayout] = useState<VisualViewportLayout>({
    height: 0,
    offsetTop: 0,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setLayout({
        height: vv.height,
        offsetTop: vv.offsetTop,
      });
    };

    const onScroll = () => {
      update();
      // レイアウトビューポートがずれたら戻す（送信欄が画面外に出るのを防ぐ）
      if (vv.offsetTop > 0) {
        requestAnimationFrame(() => window.scrollTo(0, 0));
      }
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", onScroll);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", onScroll);
    };
  }, []);

  return layout;
}

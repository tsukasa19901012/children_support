import { useEffect, useState, type RefObject } from "react";

/** 要素の高さを ResizeObserver で追跡（固定フッター分の padding 用） */
export function useElementHeight(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[] = []
): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setHeight(el.getBoundingClientRect().height);

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();

    return () => ro.disconnect();
  }, [ref, ...deps]);

  return height;
}

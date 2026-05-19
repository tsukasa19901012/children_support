import { useCallback, useLayoutEffect, useRef } from "react";

/** 複数行入力時に textarea の高さを内容に合わせる（最大 maxLines 行） */
export function useAutoResizeTextarea(value: string, maxLines = 10) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const vertical =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    const maxHeight = lineHeight * maxLines + vertical;

    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [maxLines]);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return ref;
}

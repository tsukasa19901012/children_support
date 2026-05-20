export type ChildInfo = {
  id: string;
  name: string;
  birthday: string;
};

const CHILD_CACHE_KEY = "parenting_ai_children";

type CachedChildren = {
  userId: string;
  children: ChildInfo[];
  activeChildId: string;
  cachedAt: number;
};

export function loadChildCache(userId: string): CachedChildren | null {
  try {
    const raw = sessionStorage.getItem(CHILD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChildren;
    if (parsed.userId !== userId || !parsed.children?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveChildCache(
  userId: string,
  children: ChildInfo[],
  activeChildId: string
): void {
  if (!children.length || !activeChildId) return;
  try {
    sessionStorage.setItem(
      CHILD_CACHE_KEY,
      JSON.stringify({
        userId,
        children,
        activeChildId,
        cachedAt: Date.now(),
      } satisfies CachedChildren)
    );
  } catch {
    // ignore
  }
}

export function activeChildFromCache(
  cached: CachedChildren
): ChildInfo | null {
  return (
    cached.children.find((c) => c.id === cached.activeChildId) ??
    cached.children[0] ??
    null
  );
}

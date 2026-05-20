/** マイページ遷移時の即時表示用スケルトン */
export default function AccountLoading() {
  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      <header className="shrink-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="w-16" />
      </header>
      <main className="flex-1 overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-full bg-gray-50 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-gray-50 rounded animate-pulse" />
          </div>
        ))}
      </div>
      </main>
    </div>
  );
}

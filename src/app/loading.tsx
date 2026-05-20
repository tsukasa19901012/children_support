/** チャット等への遷移時に即時表示するスケルトン */
export default function AppLoading() {
  return (
    <div className="flex flex-col h-dvh bg-gray-100">
      <header className="shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-6 w-14 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>
      <main className="flex-1 px-4 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-16 rounded-2xl bg-white animate-pulse ${i % 2 === 0 ? "ml-8" : "mr-8"}`}
          />
        ))}
      </main>
    </div>
  );
}

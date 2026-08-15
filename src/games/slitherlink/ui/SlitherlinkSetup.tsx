import { useEffect, useRef, useState } from "react";
import { LauncherFooter } from "../../../common/components/GameChrome";
import {
  listSlitherlinkProgress,
  loadGeneratedSlitherlinks,
} from "../data/sessions";
import type { SlitherlinkPuzzle } from "../domain/slitherlink";
import {
  startSlitherlinkGeneration,
  type GenerationTask,
} from "../generation/client";
const labels = { easy: "やさしい", medium: "ふつう", hard: "むずかしい" };
export function SlitherlinkSetup({
  puzzles,
  onStart,
  onLauncher,
}: {
  puzzles: SlitherlinkPuzzle[];
  onStart: (p: SlitherlinkPuzzle) => void;
  onLauncher: () => void;
}) {
  const [difficulty, setDifficulty] = useState<keyof typeof labels>("easy"),
    [size, setSize] = useState<5 | 7 | 10>(5),
    [generated, setGenerated] = useState<SlitherlinkPuzzle[]>([]),
    [progressIds, setProgressIds] = useState(new Set<string>()),
    [busy, setBusy] = useState(false),
    [generationProgress, setGenerationProgress] = useState(0),
    [error, setError] = useState(""),
    task = useRef<GenerationTask | null>(null),
    choices = puzzles.filter((p) => p.difficulty === difficulty);
  useEffect(() => {
    Promise.all([loadGeneratedSlitherlinks(), listSlitherlinkProgress()]).then(
      ([items, sessions]) => {
        setGenerated(items);
        setProgressIds(new Set(sessions.map((item) => item.puzzleId)));
      },
    );
  }, []);
  useEffect(() => () => task.current?.cancel(), []);
  function create() {
    setBusy(true);
    setError("");
    setGenerationProgress(0);
    task.current = startSlitherlinkGeneration(size, setGenerationProgress);
    task.current.promise
      .then(onStart)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "生成に失敗しました。",
        ),
      )
      .finally(() => {
        setBusy(false);
        task.current = null;
      });
  }
  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>スリザーリンク</h1>
          <span>数字を手がかりに一本のループを作ります</span>
        </div>
        <div className="setup-grid">
          <article className="setup-card">
            <h2>同梱問題</h2>
            <label>
              難易度
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as keyof typeof labels)
                }
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              {choices.map((p) => (
                <button
                  className="button"
                  key={p.id}
                  onClick={() => onStart(p)}
                >
                  {p.title}
                  {progressIds.has(p.id) ? "（途中）" : ""}
                </button>
              ))}
            </div>
            {!choices.length && <p>この難易度の同梱問題は準備中です。</p>}
          </article>
          <article className="setup-card">
            <h2>一意解の自動生成</h2>
            <label>
              サイズ
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value) as 5 | 7 | 10)}
                disabled={busy}
              >
                <option value="5">5×5（軽め）</option>
                <option value="7">7×7（標準）</option>
                <option value="10">10×10（挑戦）</option>
              </select>
            </label>
            <p>
              単一ループを作り、一意解を保ちながら数字を削減します。難易度は生成傾向の目安です。
            </p>
            <div className="actions">
              <button className="button" disabled={busy} onClick={create}>
                {busy ? `生成中 ${generationProgress}%` : "生成して開始"}
              </button>
              {busy && (
                <button
                  className="button secondary"
                  onClick={() => task.current?.cancel()}
                >
                  キャンセル
                </button>
              )}
            </div>
            {busy && <progress value={generationProgress} max="100" />}
            {error && <p role="alert">{error}</p>}
            {generated.length > 0 && (
              <>
                <h3>生成問題の続き</h3>
                {generated.map((p) => (
                  <button
                    className="button secondary"
                    key={p.id}
                    onClick={() => onStart(p)}
                  >
                    {p.title}
                  </button>
                ))}
              </>
            )}
          </article>
        </div>
        <LauncherFooter onLauncher={onLauncher} />
      </section>
    </main>
  );
}

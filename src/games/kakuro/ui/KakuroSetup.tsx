import { useEffect, useState } from "react";
import { LauncherFooter } from "../../../common/components/GameChrome";
import type { KakuroPuzzle } from "../domain/kakuro";
import { listKakuroProgress, loadGeneratedKakuros } from "../data/sessions";
import { generateKakuro } from "../generation/generate";
export function KakuroSetup({
  puzzles,
  onStart,
  onLauncher,
}: {
  puzzles: KakuroPuzzle[];
  onStart: (p: KakuroPuzzle) => void;
  onLauncher: () => void;
}) {
  const [size, setSize] = useState<5 | 7 | 9>(5),
    [generated, setGenerated] = useState<KakuroPuzzle[]>([]),
    [progress, setProgress] = useState(new Set<string>()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([loadGeneratedKakuros(), listKakuroProgress()]).then(
      ([items, sessions]) => {
        setGenerated(items);
        setProgress(new Set(sessions.map((item) => item.puzzleId)));
      },
    );
  }, []);
  const bundled = puzzles.filter((p) => p.width === size);
  function create() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        onStart(generateKakuro(Date.now() >>> 0, size));
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "生成に失敗しました。",
        );
        setBusy(false);
      }
    }, 0);
  }
  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>カックロ</h1>
          <span>交差する合計から数字を推理します</span>
        </div>
        <div className="setup-grid">
          {bundled.length > 0 && (
            <article className="setup-card">
              <h2>同梱問題</h2>
              {bundled.map((p) => (
                <button
                  className="button secondary"
                  key={p.id}
                  onClick={() => onStart(p)}
                >
                  {p.title}
                  {progress.has(p.id) ? "（途中）" : ""}
                </button>
              ))}
            </article>
          )}
          <article className="setup-card">
            <h2>一意解のランダム問題</h2>
            <label>
              サイズ
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value) as 5 | 7 | 9)}
              >
                <option value="5">5×5（やさしい目安）</option>
                <option value="7">7×7（ふつう目安）</option>
                <option value="9">9×9（むずかしい目安）</option>
              </select>
            </label>
            <p>一意解を確認して生成します。難易度は完全には保証されません。</p>
            <button className="button" disabled={busy} onClick={create}>
              {busy ? "生成中…" : "生成して開始"}
            </button>
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

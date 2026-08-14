import { useEffect, useState } from "react";
import { LauncherFooter } from "../../../common/components/GameChrome";
import type { FormulaDifficulty, FormulaPuzzle } from "../domain/formulaSigns";
import { difficultyLabel, generateFormulaSigns } from "../generation/generate";
import { listFormulaProgress, loadGeneratedFormulas } from "../data/sessions";
const descriptions: Record<FormulaDifficulty, string> = {
  easy: "＋・－／独立式中心",
  medium: "＋・－・×／独立式中心",
  hard: "共有演算子で縦横が連動",
  challenge: "共有演算子＋数字空欄",
};
export function FormulaSetup({
  puzzles,
  onStart,
  onLauncher,
}: {
  puzzles: FormulaPuzzle[];
  onStart: (p: FormulaPuzzle) => void;
  onLauncher: () => void;
}) {
  const [difficulty, setDifficulty] = useState<FormulaDifficulty>("easy"),
    [generated, setGenerated] = useState<FormulaPuzzle[]>([]),
    [progress, setProgress] = useState(new Set<string>()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([loadGeneratedFormulas(), listFormulaProgress()]).then(
      ([items, sessions]) => {
        setGenerated(items);
        setProgress(new Set(sessions.map((x) => x.puzzleId)));
      },
    );
  }, []);
  function create() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        onStart(generateFormulaSigns(Date.now() >>> 0, difficulty));
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
          <h1>数式符号パズル</h1>
          <span>数字の間へ演算記号を入れて式を成立させます</span>
        </div>
        <div className="setup-grid">
          <article className="setup-card">
            <h2>ランダム問題</h2>
            <label>
              難易度
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as FormulaDifficulty)
                }
              >
                {(["easy", "medium", "hard", "challenge"] as const).map(
                  (value) => (
                    <option key={value} value={value}>
                      {difficultyLabel(value)}：{descriptions[value]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <p>
              通常の計算優先順位を使い、各式内の数字は重複しません。一意解を確認して生成します。
            </p>
            <button className="button" disabled={busy} onClick={create}>
              {busy ? "生成中…" : "生成して開始"}
            </button>
            {error && <p role="alert">{error}</p>}
          </article>
          {(puzzles.length > 0 || generated.length > 0) && (
            <article className="setup-card">
              <h2>問題の続き</h2>
              {[...puzzles, ...generated].map((p) => (
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
        </div>
        <LauncherFooter onLauncher={onLauncher} />
      </section>
    </main>
  );
}

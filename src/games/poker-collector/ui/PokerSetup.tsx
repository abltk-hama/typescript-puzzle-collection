import { useEffect, useState } from "react";
import { LauncherFooter } from "../../../common/components/GameChrome";
import type { PokerCollectorPuzzle } from "../domain/pokerHandTypes";
import { generatePokerPuzzles } from "../generation/generate";
import {
  loadGeneratedPokerPuzzles,
} from "../data/sessions";

const labels = {
  easy: "やさしい（300点目標）",
  medium: "ふつう（800点目標）",
  hard: "むずかしい（1500点目標）",
};

export function PokerSetup({
  onStart,
  onLauncher,
}: {
  onStart: (p: PokerCollectorPuzzle) => void;
  onLauncher: () => void;
}) {
  const [generated, setGenerated] = useState<PokerCollectorPuzzle[]>([]);
  const [randomDifficulty, setRandomDifficulty] = useState<keyof typeof labels>("easy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadGeneratedPokerPuzzles().then(setGenerated);
  }, []);

  function generateAndStart() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        const puzzle = generatePokerPuzzles(
          Date.now() >>> 0,
          randomDifficulty
        );
        onStart(puzzle);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "生成に失敗しました。"
        );
        setBusy(false);
      }
    }, 0);
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>ポーカーコレクター</h1>
          <span>見えているカードから役を作り、目標得点に達しよう</span>
        </div>

        <div className="setup-grid poker-setup-grid">
          <article className="setup-card poker-setup-card">
            <h2>ランダム問題</h2>
            <p>25枚のカード配置をランダム生成します。</p>
            <label>
              難易度
              <select
                value={randomDifficulty}
                onChange={(event) =>
                  setRandomDifficulty(event.target.value as keyof typeof labels)
                }
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" disabled={busy} onClick={generateAndStart}>
              生成して開始
            </button>

            {error && <div className="error-message">{error}</div>}

            {generated.length > 0 && (
              <>
                <h3>生成問題の続き</h3>
                <div className="resume-list">
                  {generated.map((p) => (
                    <button
                      key={p.id}
                      className="button secondary"
                      onClick={() => onStart(p)}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </article>
        </div>

        <LauncherFooter onLauncher={onLauncher} />
      </section>
    </main>
  );
}

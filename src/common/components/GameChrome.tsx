import type { ReactNode } from "react";

export function MessagePanel({ message }: { message: string }) {
  return (
    <div className="message-log" aria-live="polite">
      <strong>メッセージ</strong>
      <p>{message}</p>
    </div>
  );
}

export function GameFooter({
  onBack,
  onLauncher,
  left,
}: {
  onBack: () => void;
  onLauncher: () => void;
  left?: ReactNode;
}) {
  return (
    <div className="game-footer">
      <div className="actions">{left}</div>
      <div className="actions">
        <button className="button secondary" onClick={onBack}>
          問題選択へ戻る
        </button>
        <button className="button secondary" onClick={onLauncher}>
          ランチャーへ戻る
        </button>
      </div>
    </div>
  );
}

export function LauncherFooter({ onLauncher }: { onLauncher: () => void }) {
  return (
    <div className="game-footer">
      <span />
      <button className="button secondary" onClick={onLauncher}>
        ランチャーへ戻る
      </button>
    </div>
  );
}

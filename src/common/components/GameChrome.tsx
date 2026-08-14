import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  deleteActivityLog,
  loadActivityLog,
  saveActivityLog,
  type ActivityLogEntry,
} from "../storage/database";

export function MessagePanel({
  message,
  logKey = "common",
}: {
  message: string;
  logKey?: string;
}) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]),
    [open, setOpen] = useState(false),
    [newestFirst, setNewestFirst] = useState(true),
    [loaded, setLoaded] = useState(false),
    last = useRef("");
  useEffect(() => {
    let active = true;
    setLoaded(false);
    loadActivityLog(logKey).then((items) => {
      if (!active) return;
      setEntries(items);
      last.current = items.at(-1)?.message ?? "";
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [logKey]);
  useEffect(() => {
    if (!loaded || !message || last.current === message) return;
    last.current = message;
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      at: new Date().toISOString(),
      message,
    };
    setEntries((current) => {
      const next = [...current, entry].slice(-200);
      saveActivityLog(logKey, next);
      return next;
    });
  }, [message, logKey, loaded]);
  const visible = newestFirst ? [...entries].reverse() : entries;
  return (
    <div className="message-log" aria-live="polite">
      <strong>メッセージ</strong>
      <p>{message}</p>
      <button className="message-log-toggle" onClick={() => setOpen(!open)}>
        ログを{open ? "閉じる" : "開く"}（{entries.length}件）
      </button>
      {open && (
        <div className="activity-log">
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => setNewestFirst(!newestFirst)}
            >
              {newestFirst ? "古い順にする" : "新しい順にする"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setEntries([]);
                last.current = "";
                deleteActivityLog(logKey);
              }}
            >
              ログを消去
            </button>
          </div>
          <ol>
            {visible.map((entry) => (
              <li key={entry.id}>
                <time>
                  {new Date(entry.at).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </time>
                <span>{entry.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
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

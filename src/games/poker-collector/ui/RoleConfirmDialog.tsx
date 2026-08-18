import { useEffect, useMemo, useState } from "react";
import { cardToString } from "../../../common/cards";
import type { PokerHand } from "../domain/pokerHandTypes";

export function RoleConfirmDialog({
  detectedRoles,
  holdCountRemaining,
  canHold,
  onConfirm,
  onHold,
  onDiscard,
}: {
  detectedRoles: PokerHand[];
  holdCountRemaining: number;
  canHold: boolean;
  onConfirm: (roleKey: string) => void;
  onHold: () => void;
  onDiscard: (roleKey: string) => void;
}) {
  const firstKey = detectedRoles[0]?.key ?? "";
  const [selectedKey, setSelectedKey] = useState(firstKey);

  useEffect(() => {
    setSelectedKey(firstKey);
  }, [firstKey]);

  const selected = useMemo(
    () => detectedRoles.find((role) => role.key === selectedKey) ?? detectedRoles[0],
    [detectedRoles, selectedKey]
  );

  if (!selected) return null;

  return (
    <div className="dialog-overlay">
      <div className="role-dialog poker-role-dialog">
        <h2>役を選択してください</h2>
        <p className="dialog-hint">
          確定すると表示されたカードだけを消費します。破棄した役はこのゲーム中、再び得点できません。
        </p>

        <div className="role-candidate-list">
          {detectedRoles.map((role) => (
            <button
              key={role.key}
              type="button"
              className={`role-candidate ${role.key === selected.key ? "selected" : ""}`}
              onClick={() => setSelectedKey(role.key)}
            >
              <span>
                <strong>{role.name}</strong>
                <small>{role.cards.map(cardToString).join(" / ")}</small>
              </span>
              <strong>+{role.baseScore}点</strong>
            </button>
          ))}
        </div>

        <div className="role-preview">
          <span className="role-name">{selected.name}</span>
          <span className="role-score">+{selected.baseScore}点</span>
        </div>

        <div className="role-cards">
          {selected.cards.map((card, idx) => (
            <div key={`${cardToString(card)}-${idx}`} className="preview-card">
              {cardToString(card)}
            </div>
          ))}
        </div>

        <div className="dialog-buttons poker-role-actions">
          <button className="button" onClick={() => onConfirm(selected.key)}>
            この役に確定
          </button>
          <button
            className="button secondary"
            onClick={onHold}
            disabled={!canHold || holdCountRemaining <= 0}
          >
            保留
          </button>
          <button className="button danger" onClick={() => onDiscard(selected.key)}>
            この役を破棄
          </button>
        </div>

        <p className="dialog-hint">
          保留は残り{holdCountRemaining}回
          {!canHold && "（盤面が空のため保留できません）"}
        </p>
      </div>
    </div>
  );
}

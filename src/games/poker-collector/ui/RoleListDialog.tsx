import { ROLE_DEFINITIONS } from "../domain/roleDefinitions";
import type { DetectedRole, PokerRoleType } from "../domain/pokerHandTypes";

const ORDERED_TYPES = (Object.keys(ROLE_DEFINITIONS) as PokerRoleType[])
  .sort((a, b) => ROLE_DEFINITIONS[a].rank - ROLE_DEFINITIONS[b].rank);

export function RoleListDialog({
  discardedRoleKeys,
  fixedRoles,
  onClose,
}: {
  discardedRoleKeys: ReadonlySet<string>;
  fixedRoles: DetectedRole[];
  onClose: () => void;
}) {
  const confirmedTypes = new Set(fixedRoles.map((role) => role.type));
  const discardedWholeRoles = new Set(
    Array.from(discardedRoleKeys).filter((key) => !key.includes(":"))
  );
  const discardedPairRanks = Array.from(discardedRoleKeys)
    .filter((key) => key.startsWith("onePair:"))
    .map((key) => key.split(":")[1])
    .filter(Boolean);

  const standard = ORDERED_TYPES.filter(
    (type) => ROLE_DEFINITIONS[type].category === "standard"
  );
  const collector = ORDERED_TYPES.filter(
    (type) => ROLE_DEFINITIONS[type].category === "collector"
  );

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="role-dialog poker-role-dialog poker-role-list-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="役一覧"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="poker-role-list-header">
          <div>
            <h2>役一覧</h2>
            <p className="dialog-hint">このゲームで使用できる役と配点です。</p>
          </div>
          <button className="button secondary" onClick={onClose}>閉じる</button>
        </div>

        <RoleSection
          title="標準役"
          types={standard}
          confirmedTypes={confirmedTypes}
          discardedWholeRoles={discardedWholeRoles}
          discardedPairRanks={discardedPairRanks}
        />
        <RoleSection
          title="Poker Collector役"
          types={collector}
          confirmedTypes={confirmedTypes}
          discardedWholeRoles={discardedWholeRoles}
          discardedPairRanks={discardedPairRanks}
        />
      </div>
    </div>
  );
}

function RoleSection({
  title,
  types,
  confirmedTypes,
  discardedWholeRoles,
  discardedPairRanks,
}: {
  title: string;
  types: PokerRoleType[];
  confirmedTypes: ReadonlySet<PokerRoleType>;
  discardedWholeRoles: ReadonlySet<string>;
  discardedPairRanks: string[];
}) {
  return (
    <section className="poker-role-list-section">
      <h3>{title}</h3>
      <div className="poker-role-list">
        {types.map((type) => {
          const definition = ROLE_DEFINITIONS[type];
          const discarded = discardedWholeRoles.has(type);
          const confirmed = confirmedTypes.has(type);
          return (
            <article
              key={type}
              className={`poker-role-list-item ${discarded ? "discarded" : ""}`}
            >
              <div className="poker-role-list-title">
                <strong>{definition.name}</strong>
                <strong>{definition.score}点</strong>
              </div>
              <span>{definition.description}</span>
              <div className="poker-role-list-status">
                {confirmed && <span className="role-status confirmed">✓ 確定済み</span>}
                {discarded && <span className="role-status discarded">× 破棄済み</span>}
                {type === "onePair" && discardedPairRanks.length > 0 && (
                  <span className="role-status discarded">
                    破棄済みランク：{discardedPairRanks.join(" / ")}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
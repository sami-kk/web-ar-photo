// 仕様書 8.3 フレーム選択モーダル / 26.6 表示中インスタンス管理
import { useARContext } from "../../state/arContext";
import { useARObjects } from "../../hooks/useARObjects";
import { MAX_DISPLAY_OBJECTS } from "../../types/arState";
import { getEnabledObjects } from "../../utils/catalog";
import { resolveAssetPath } from "../../utils/assetPath";

export function ARObjectSelectionModal() {
  const { state, dispatch } = useARContext();
  const {
    catalog,
    displayObjects,
    selectedInstanceId,
    addObject,
    removeObject,
    selectObject,
    resetObject,
    countInstances,
  } = useARObjects();

  if (!state.isSelectionModalOpen) return null;

  const items = getEnabledObjects(catalog);
  const isFull = displayObjects.length >= MAX_DISPLAY_OBJECTS;

  const close = () => dispatch({ type: "CLOSE_SELECTION_MODAL" });

  return (
    <div
      className="ar-modal"
      role="dialog"
      aria-modal="true"
      aria-label="フレーム・装飾の選択"
    >
      <div className="ar-modal__panel">
        <header className="ar-modal__header">
          <h2 className="ar-modal__title">フレーム・装飾を選ぶ</h2>
          <span className="ar-modal__count">
            表示中 {displayObjects.length} / {MAX_DISPLAY_OBJECTS}
          </span>
          <button
            type="button"
            className="ar-icon-button"
            aria-label="閉じる"
            onClick={close}
          >
            ×
          </button>
        </header>

        {isFull && (
          <p className="ar-modal__notice">
            最大3つまで表示できます。追加するには不要なオブジェクトを削除してください。
          </p>
        )}

        <ul className="ar-modal__list">
          {items.map((meta) => {
            const count = countInstances(meta.id);
            return (
              <li key={meta.id} className="ar-card">
                <img
                  className="ar-card__thumb"
                  src={resolveAssetPath(meta.thumbnailPath)}
                  alt={meta.name}
                  onError={(e) => {
                    // サムネイル読み込み失敗時はプレースホルダー扱い（仕様書 10.5）。
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
                <div className="ar-card__body">
                  <div className="ar-card__head">
                    <span className="ar-card__name">{meta.name}</span>
                    <span className={`ar-badge ar-badge--${meta.type}`}>
                      {meta.type === "frame" ? "フレーム" : "装飾"}
                    </span>
                  </div>
                  <p className="ar-card__author">@{meta.authorName}</p>
                  <p className="ar-card__desc">{meta.description}</p>

                  <div className="ar-card__actions">
                    <button
                      type="button"
                      className="ar-button ar-button--primary"
                      disabled={isFull}
                      title={isFull ? "最大3つまで" : undefined}
                      onClick={() => addObject(meta)}
                    >
                      追加する
                    </button>
                    {count > 0 && (
                      <span className="ar-card__instances-count">
                        表示中 {count} 個
                      </span>
                    )}
                  </div>

                  {/* 表示中インスタンス一覧: 選択/削除/中央に戻す（仕様書 26.6） */}
                  {count > 0 && (
                    <ul className="ar-instances">
                      {displayObjects
                        .filter((o) => o.objectId === meta.id)
                        .map((o, i) => (
                          <li
                            key={o.instanceId}
                            className={
                              "ar-instances__row" +
                              (o.instanceId === selectedInstanceId
                                ? " is-selected"
                                : "")
                            }
                          >
                            <button
                              type="button"
                              className="ar-instances__label"
                              onClick={() => selectObject(o.instanceId)}
                            >
                              #{i + 1} を選択
                            </button>
                            <button
                              type="button"
                              className="ar-button ar-button--small"
                              onClick={() => resetObject(o.instanceId)}
                            >
                              中央に戻す
                            </button>
                            <button
                              type="button"
                              className="ar-button ar-button--small ar-button--danger"
                              onClick={() => removeObject(o.instanceId)}
                            >
                              削除
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

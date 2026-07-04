# ARフォトフレーム (Web AR Photo Frame)

スマートフォンWebブラウザ上で動作する「カメラ合成型AR」フォトフレーム機能の初期リリース実装。
仕様書 `ARフォトフレーム_AI開発設計書_v0.5.md` に基づく。

- React + TypeScript + Vite
- Three.js / React Three Fiber / @react-three/drei
- 対象: iOS Safari / Android Chrome（スマートフォン縦向き）

## セットアップ

```bash
npm install
npm run gen:placeholders   # 検証用のプレースホルダーGLB/サムネイルを生成
npm run dev                # 開発サーバ（HTTPSでの実機確認は下記参照）
npm run build              # 本番ビルド
npm run preview            # ビルド結果のプレビュー
```

> カメラは HTTPS 環境でのみ動作する（仕様書 5.3 / 26.5）。
> 実機確認では GitHub Pages 等のHTTPS配信、またはローカルHTTPSトンネルを利用する。

### サブディレクトリ配信 / GitHub Pages

`base` は環境変数で切り替える（仕様書 26.3）。アセットは `import.meta.env.BASE_URL` に
追従して解決するため、パス切れが起きにくい。

```bash
AR_BASE_PATH=/ar-photo-frame/ npm run build
```

## ディレクトリ構成（仕様書 15）

```
src/
  main.tsx / App.tsx
  pages/ARPhotoFramePage.tsx        画面切り替えの親
  components/ar/                    カメラ/3D/モーダル/プレビュー/UI
  hooks/                            camera / gesture / capture / catalog
  state/                            arReducer / arContext / sceneBridge
  data/arObjects.json               作品一覧（メタデータ）
  types/                            arObject / arState
  utils/                            normalize / capture / browserSupport / assetPath ...
  styles/arPhotoFrame.css
public/assets/
  tutorial.png                      チュートリアル画像
  ar-objects/<id>/model.glb, thumbnail.png
scripts/generate-placeholders.mjs   プレースホルダー生成
```

## 作品の追加方法（運用）

1. `public/assets/ar-objects/<作品ID>/` に `model.glb` と `thumbnail.jpg|png` を置く
   （フォルダ名と作品IDを一致させる / 仕様書 26.13）。
2. `src/data/arObjects.json` にメタデータを追記する。
3. 再ビルドする。DB・管理画面・アップロードは初期リリース対象外（仕様書 21）。

## 実装済み機能（受け入れ条件 / 仕様書 20・26.16）

- カメラ起動（背面優先）、権限拒否・非対応ブラウザのエラー案内
- 初回デフォルトフレーム表示（`isDefault` → enabledな最初のframe）
- フレーム選択モーダル（サムネイル・作品名・作者名・説明文・種別）
- 合計最大3つ制限、4つ目でエラー通知
- 同一作品の複数追加、`instanceId` による個別管理
- タップ選択 / ドラッグ移動 / ピンチ拡大縮小（scale 0.2〜3.0 clamp）
- 中心点は画面外に出さない（一部はみ出しは許可）
- 装飾のみ回転、フレームは回転不可
- 前面／背面移動（端ではdisabled）、後から追加ほど前面
- 表示中インスタンス一覧から 選択／削除／中央に戻す
- 初回チュートリアル自動表示 + 右下「？」で再表示（localStorage）
- 撮影合成（UIを含めず、カメラ映像＋3Dのみ / 見たまま保存）
- JPEG Quality 0.92、ファイル名 `ar-photo-frame-YYYYMMDD-HHmmss.jpg`
- 再撮影で配置・拡大率を維持、選択は解除

## 未確定事項（仕様書 27 / 実装中に判断を保留した点）

独自に大きく拡張せず、暫定方針で実装している。実機評価後の調整前提。

| 項目 | 暫定実装 | 備考 |
|---|---|---|
| フレーム初期サイズ・四隅一致 | Bounding Boxを画面短辺にフィット（`normalizeModelScale`） | 実物GLB形状で要調整（仕様書 12.3 / 27） |
| 装飾初期サイズ | 画面幅の約25% | 実機評価後に調整（仕様書 12.4） |
| 3D配置座標系 | オルソグラフィック（1単位=1CSSpx、原点=画面中央） | 疑似ARのため空間固定なし（仕様書 7.2） |
| 重なり順 | zIndexをZ距離に写像（オルソのため表示サイズ不変） | 前面/背面のみ（仕様書 26.4） |
| 回転UI | 左右ボタンで15°ずつ（`ROTATION_STEP_DEG`） | 二本指回転は競合のため不採用（仕様書 26.9） |
| 終了遷移先 | `VITE_EXIT_URL`（既定 `/`） | 呼び出し元/トップに合わせ定数化（仕様書 8.4） |
| 保存方法 | `<a download>` によるダウンロード | iOS Safariで要検証。失敗時は別タブ導線（仕様書 18.5 / 27） |
| プレースホルダーGLB/サムネイル | `scripts/generate-placeholders.mjs` で生成 | 実物アセットで差し替える |

## スコープ外（実装しない / 仕様書 21）

管理画面・アップロード・DB・API・サーバー保存・アカウント・お気に入り・
フレーム回転・空間固定・平面検出・マーカー/顔認識・SNS連携・課金 等。

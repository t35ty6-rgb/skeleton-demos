# Firestore スキーマ — 荒島ホテル LINE 予約システム

## コレクション一覧

| コレクション | 用途 | 書き込み主体 |
|-------------|-----|------------|
| `reservations/{resNo}` | 予約データ本体 | LIFF (お客様) / admin (オーナー) |
| `guests/{lineUserId}` | ゲスト情報 (リピーター判定用) | webhook + LIFF |
| `rooms/{roomId}` | 客室マスタ (稼働状況含む) | admin |
| `availability/{YYYY-MM-DD}/rooms/{roomId}` | 空室カレンダー | trigger function |
| `ops_logs/{autoId}` | 運用ログ (障害・通知履歴) | server |
| `ops_state/owner` | オーナー情報 (LINE userId 等) | admin (1回だけ) |

## reservations/{resNo}

予約番号 `A-XXXX` を doc id にする。

```typescript
{
  resNo: string;              // "A-5928"
  lineUserId: string;         // "U1234567890abcdef..." (LIFF から取得)
  buildingId: 'ryosha' | 'gakusha';
  roomId: string;             // "r-203" / "g-101"
  checkin: Timestamp;         // チェックイン日 00:00 JST
  nights: number;
  guests: number;
  name: string;
  tel: string;
  note: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  source: 'liff' | 'phone' | 'admin';
  remindedPre: boolean;       // 前日リマインダー送信済み
  remindedArrival: boolean;   // 当日案内送信済み
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## guests/{lineUserId}

LIFF で予約完了した瞬間に upsert。

```typescript
{
  displayName: string;        // LINE プロフィール名
  realName: string;           // 予約フォームで入力された本名
  tel: string;
  email?: string;
  totalReservations: number;
  totalNights: number;
  lastResNo: string;
  preferences?: string;       // オーナーが手動で書き込むメモ
  isRepeater: boolean;        // totalReservations >= 2 で true
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
}
```

## rooms/{roomId}

客室マスタ。`data.js` の内容を移管。

```typescript
{
  buildingId: 'ryosha' | 'gakusha';
  no: string;                 // "二〇三"
  name: string;
  capacity: number;
  beds: string;
  size: string;
  price: number;              // 一泊一室の料金
  features: string[];
  active: boolean;            // false で予約受付停止
}
```

## availability/{YYYY-MM-DD}/rooms/{roomId}

trigger function (reservation の write trigger) で集計。LIFF 側は読み取りのみ。

```typescript
{
  status: 'open' | 'reserved' | 'blocked';
  resNo?: string;
  updatedAt: Timestamp;
}
```

## ops_logs/{autoId}

```typescript
{
  ts: Timestamp;
  level: 'info' | 'warn' | 'error';
  source: 'webhook' | 'liff' | 'cron' | 'admin';
  event: string;              // 'follow', 'reservation_created', 'reminder_sent', etc
  payload: object;            // 任意の構造
  lineUserId?: string;
  resNo?: string;
}
```

## ops_state/owner

オーナー情報を1ドキュメントで保持。

```typescript
{
  lineUserId: string;         // 新規予約通知の宛先
  displayName: string;
  enabledChannels: {
    line: boolean;            // 通常 true
    email: boolean;
  };
  notifyOnNew: boolean;
  notifyOnCancel: boolean;
}
```

## 集計クエリ例

- **今日のチェックイン**: `reservations` where `checkin == today` and `status == 'confirmed'`
- **明日のチェックイン (前日リマインダー対象)**: `reservations` where `checkin == tomorrow` and `status == 'confirmed'` and `remindedPre == false`
- **特定ゲストの履歴**: `reservations` where `lineUserId == 'U...'` order by `createdAt desc`
- **空室確認**: `availability/{date}/rooms/{roomId}` を直接 get

## インデックス

`indexes.json` を参照。複合インデックスは:
- `reservations`: (status, checkin)
- `reservations`: (lineUserId, createdAt desc)
- `reservations`: (status, checkin, remindedPre)
- `ops_logs`: (source, ts desc)

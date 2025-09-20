# エラートラッキングとモニタリング

このドキュメントでは、美容室予約システムにおけるエラートラッキング（Sentry）とメトリクス収集（Prometheus）の実装について説明します。すべての実装はCLAUDE.mdのガイドラインに準拠し、Sum型とts-patternを活用した型安全な設計となっています。

## 📋 目次

1. [概要](#概要)
2. [エラートラッキング（Sentry）](#エラートラッキングsentry)
3. [メトリクス収集（Prometheus）](#メトリクス収集prometheus)
4. [構造化ログとの統合](#構造化ログとの統合)
5. [セットアップ手順](#セットアップ手順)
6. [使用方法](#使用方法)
7. [ベストプラクティス](#ベストプラクティス)

## 概要

### アーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Express   │ --> │ Error Handler│ --> │    Sentry    │
│    App      │     │  Middleware  │     │   Service    │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │
       v                    v
┌─────────────┐     ┌──────────────┐
│  Metrics    │     │ Structured   │
│ Middleware  │     │   Logger     │
└─────────────┘     └──────────────┘
       │
       v
┌─────────────┐     ┌──────────────┐
│ Prometheus  │ <-- │   Grafana    │
└─────────────┘     └──────────────┘
```

### 主な機能

- **エラートラッキング**: Sentryによる自動エラー収集と分類
- **メトリクス収集**: Prometheusによるシステム・ビジネスメトリクス
- **構造化ログ**: 相関IDによるトレーサビリティ
- **ヘルスチェック**: Kubernetes対応のヘルスチェックエンドポイント

## エラートラッキング（Sentry）

> **アーキテクチャノート**: Clean Architectureに従い、すべての外部サービス（Sentry、Prometheus、ロギング等）は`infrastructure`層に配置されます。`api`層にはHTTPに関連するミドルウェアのみが配置されます。

### Sentryサービスの実装

`backend/packages/infrastructure/src/services/sentry.service.ts`

#### エラーイベントの型定義（Sum型）

```typescript
export type SentryErrorEvent =
  | { type: 'unhandledRejection'; error: Error; promise: Promise<unknown> }
  | { type: 'uncaughtException'; error: Error }
  | { type: 'apiError'; error: Error; endpoint: string; method: string; statusCode: number }
  | { type: 'validationError'; error: Error; fields: Record<string, unknown> }
  | { type: 'authenticationError'; error: Error; userId?: string }
  | { type: 'authorizationError'; error: Error; userId: string; resource: string }
  | { type: 'databaseError'; error: Error; query?: string }
  | { type: 'externalServiceError'; error: Error; service: string }
  | { type: 'businessLogicError'; error: Error; context: Record<string, unknown> }
  | { type: 'rateLimitError'; error: Error; endpoint: string; userId?: string }
```

#### 自動エラーレベル判定

```typescript
const determineSeverityLevel = (event: SentryErrorEvent): Sentry.SeverityLevel => {
  return match(event)
    .with({ type: 'unhandledRejection' }, () => 'fatal' as const)
    .with({ type: 'uncaughtException' }, () => 'fatal' as const)
    .with({ type: 'apiError' }, ({ statusCode }) => 
      statusCode >= 500 ? 'error' as const : 'warning' as const
    )
    .with({ type: 'validationError' }, () => 'warning' as const)
    .with({ type: 'authenticationError' }, () => 'warning' as const)
    .with({ type: 'authorizationError' }, () => 'warning' as const)
    .with({ type: 'databaseError' }, () => 'error' as const)
    .with({ type: 'externalServiceError' }, () => 'error' as const)
    .with({ type: 'businessLogicError' }, () => 'warning' as const)
    .with({ type: 'rateLimitError' }, () => 'info' as const)
    .exhaustive()
}
```

### エラーコンテキスト収集サービス

`backend/packages/infrastructure/src/services/error-context.service.ts`

#### セキュリティに配慮した情報収集

```typescript
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'apiKey', 'authorization',
  'cookie', 'session', 'creditCard', 'cvv', 'ssn'
]

const sanitizeData = (data: Record<string, unknown>): Record<string, unknown> => {
  // 機密情報を自動的にマスク
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[Redacted]'
    }
  }
  return sanitized
}
```

### エラーハンドラーミドルウェアの拡張

`backend/packages/api/src/middleware/error-handler.ts`

```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void => {
  // エラーの分類とSentryイベントの作成
  const sentryEvent = classifyError(err, req)
  
  // エラーコンテキストの収集
  const context = errorContextService.extractContext({
    type: 'request',
    request: req,
    user: req.user
  })
  
  // Sentryへのエラー送信
  if (sentryEvent) {
    sentryService.captureError(sentryEvent, context)
  }
  
  // 構造化ログへの記録
  logger.logUnhandledError(err, requestInfo, user)
  
  // レスポンスの生成
  generateErrorResponse(err, res)
}
```

## メトリクス収集（Prometheus）

### メトリクスサービスの実装

`backend/packages/infrastructure/src/services/metrics.service.ts`

#### メトリクス定義（Sum型）

```typescript
export type MetricDefinition =
  | { type: 'counter'; name: string; help: string; labelNames?: string[] }
  | { type: 'gauge'; name: string; help: string; labelNames?: string[] }
  | { type: 'histogram'; name: string; help: string; buckets?: number[]; labelNames?: string[] }
  | { type: 'summary'; name: string; help: string; percentiles?: number[]; labelNames?: string[] }
```

#### システムメトリクス

```typescript
export type SystemMetrics = {
  httpRequestsTotal: Counter          // HTTPリクエスト総数
  httpRequestDurationSeconds: Histogram // リクエスト処理時間
  httpRequestsInFlight: Gauge         // 処理中のリクエスト数
  httpResponseSizeBytes: Histogram    // レスポンスサイズ
  dbConnectionPoolActive: Gauge       // アクティブなDB接続数
  dbConnectionPoolIdle: Gauge         // アイドルなDB接続数
  dbQueryDurationSeconds: Histogram   // クエリ実行時間
  errorTotal: Counter                 // エラー総数
}
```

#### ビジネスメトリクス

```typescript
export type BusinessMetrics = {
  reservationsTotal: Counter          // 予約総数
  reservationsCancelled: Counter      // キャンセル数
  activeUsers: Gauge                  // アクティブユーザー数
  revenueTotal: Counter               // 売上総額（セント単位）
  averageServiceDuration: Histogram   // サービス平均時間
  customerSatisfactionScore: Gauge    // 顧客満足度スコア
  staffUtilizationRate: Gauge         // スタッフ稼働率
}
```

### APIメトリクスミドルウェア

`backend/packages/api/src/middleware/metrics.ts`

```typescript
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now()
  const route = req.route?.path || req.path || 'unknown'
  
  // リクエスト開始時のメトリクス
  metricsService.system.httpRequestsInFlight.inc({ method: req.method, route })
  
  // レスポンス送信時のメトリクス収集
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000
    const statusCode = res.statusCode.toString()
    
    // メトリクスの記録
    metricsService.system.httpRequestsTotal.inc({ method, route, status_code: statusCode })
    metricsService.system.httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, duration)
    
    // エラーメトリクス
    if (res.statusCode >= 400) {
      metricsService.system.errorTotal.inc({ type: errorType, code: statusCode })
    }
  })
  
  next()
}
```

### ビジネスメトリクスサービス

`backend/packages/infrastructure/src/services/business-metrics.service.ts`

```typescript
export type BusinessEvent =
  | { type: 'reservationCreated'; salonId: string; serviceType: string; amount: number }
  | { type: 'reservationCancelled'; salonId: string; reason: string }
  | { type: 'userActivity'; userType: string; action: 'login' | 'logout' }
  | { type: 'paymentReceived'; salonId: string; serviceType: string; amountCents: number }
  | { type: 'serviceCompleted'; salonId: string; serviceType: string; durationMinutes: number }
  | { type: 'reviewSubmitted'; salonId: string; rating: number }
  | { type: 'staffScheduleUpdate'; salonId: string; staffId: string; utilizationRate: number }

// ビジネスイベントの記録
const recordBusinessEvent = (event: BusinessEvent): void => {
  match(event)
    .with({ type: 'reservationCreated' }, ({ salonId, serviceType, amount }) => {
      metricsService.business.reservationsTotal.inc({ salon_id: salonId, service_type: serviceType })
      metricsService.business.revenueTotal.inc({ salon_id: salonId, service_type: serviceType }, amount * 100)
    })
    .with({ type: 'reservationCancelled' }, ({ salonId, reason }) => {
      metricsService.business.reservationsCancelled.inc({ salon_id: salonId, reason })
    })
    // ... 他のパターンマッチング
    .exhaustive()
}
```

## 構造化ログとの統合

### 相関IDによるトレーサビリティ

`backend/packages/infrastructure/src/services/structured-logger.ts`

```typescript
export class StructuredLogger {
  private correlationId: string | undefined
  
  // 相関IDの設定（リクエスト単位でトレース）
  setCorrelationId(id: string): void {
    this.correlationId = id
  }
  
  // Sentryへのエラー送信時に相関IDを含める
  private sendErrorToSentry(event: LogEvent): void {
    const sentryContext = {
      tags: {
        module: this.module,
        correlationId: this.correlationId
      },
      // ... その他のコンテキスト
    }
    
    sentryService.captureError(sentryEvent, sentryContext)
  }
}
```

### ログイベントとSentryの連携

エラーイベントが発生した際、以下の流れで処理されます：

1. **構造化ログへの記録**: エラー情報を構造化ログに記録
2. **Sentryへの送信**: 同じエラーをSentryに送信（相関ID付き）
3. **メトリクスの更新**: エラーカウンターを増加

```typescript
// エラーハンドラー内での処理
logger.logUnhandledError(err, requestInfo, user)  // 構造化ログ
sentryService.captureError(sentryEvent, context)  // Sentry
metricsService.system.errorTotal.inc({ type, code })  // メトリクス
```

## セットアップ手順

### 1. 環境変数の設定

`.env`ファイルに以下を追加：

```env
# Sentry設定
SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1

# Prometheus/Grafana設定
PROMETHEUS_PORT=9090
GRAFANA_PORT=3100
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin

# PostgreSQL Exporter設定
POSTGRES_EXPORTER_PORT=9187
```

### 2. Dockerコンテナの起動

```bash
# すべてのサービスを起動（Prometheus、Grafana、PostgreSQL Exporterを含む）
make docker-up

# または個別に起動
docker-compose up -d prometheus grafana postgres-exporter
```

### 3. Sentryプロジェクトの設定

1. [Sentry](https://sentry.io)でアカウントを作成
2. 新しいプロジェクトを作成（Node.js）
3. DSNをコピーして`.env`に設定
4. プロジェクト設定でアラートルールを設定

### 4. Grafanaダッシュボードの設定

1. http://localhost:3100 にアクセス（admin/admin）
2. データソースとしてPrometheusを追加
   - URL: http://prometheus:9090
3. ダッシュボードをインポートまたは作成
4. PostgreSQLメトリクスの確認
   - PostgreSQL Exporterが自動的にデータベースメトリクスを収集
   - `pg_` プレフィックスのメトリクスで検索

## 使用方法

### エラートラッキング

#### カスタムエラーの送信

```typescript
// ビジネスロジックエラー
sentryService.captureError({
  type: 'businessLogicError',
  error: new Error('予約枠が満杯です'),
  context: { salonId, date, serviceType }
})

// 外部サービスエラー
sentryService.captureError({
  type: 'externalServiceError',
  error: new Error('メール送信に失敗しました'),
  service: 'mailgun'
})
```

#### エラーコンテキストの追加

```typescript
sentryService.captureError(event, {
  user: { id: userId, email: userEmail },
  tags: { feature: 'reservation', severity: 'high' },
  extra: { reservationId, attemptCount }
})
```

### メトリクスの記録

#### ビジネスイベントの記録

```typescript
// 予約作成時
businessMetricsService.recordBusinessEvent({
  type: 'reservationCreated',
  salonId: reservation.salonId,
  serviceType: reservation.serviceType,
  amount: reservation.amount
})

// サービス完了時
businessMetricsService.recordBusinessEvent({
  type: 'serviceCompleted',
  salonId,
  serviceType,
  durationMinutes: 45
})
```

#### カスタムメトリクスの定義

```typescript
// 新しいメトリクスを定義
metricsService.registerMetric({
  type: 'histogram',
  name: 'payment_processing_duration_seconds',
  help: '決済処理にかかった時間',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  labelNames: ['payment_method']
})

// メトリクスを記録
metricsService.recordMetric({
  type: 'observe',
  metric: 'payment_processing_duration_seconds',
  value: processingTime,
  labels: { payment_method: 'credit_card' }
})
```

### ヘルスチェック

#### 基本的なヘルスチェック

```bash
curl http://localhost:3000/health
# => {"status":"ok","timestamp":"2024-01-20T10:00:00.000Z"}
```

#### 詳細なヘルスチェック

```bash
curl http://localhost:3000/health/ready
# => {
#   "status": "healthy",
#   "timestamp": "2024-01-20T10:00:00.000Z",
#   "version": "1.0.0",
#   "uptime": 3600,
#   "checks": {
#     "database": {"status": "healthy", "latency": 5},
#     "storage": {"status": "healthy"},
#     "email": {"status": "healthy"}
#   }
# }
```

## ベストプラクティス

### エラートラッキング

1. **エラー分類の徹底**
   - すべてのエラーを適切なSentryErrorEventタイプに分類
   - ビジネスロジックエラーと技術的エラーを区別

2. **コンテキストの充実**
   - ユーザー情報、リクエスト情報を必ず含める
   - デバッグに必要な追加情報をextraフィールドに記録

3. **機密情報の保護**
   - パスワード、トークン、クレジットカード情報は自動的にマスク
   - カスタムフィールドも必要に応じてサニタイズ

4. **エラーレートの監視**
   - Sentryのアラート機能を活用
   - 異常なエラー急増時の自動通知を設定

### メトリクス収集

1. **適切なメトリクスタイプの選択**
   - カウンター: 累積値（リクエスト数、エラー数）
   - ゲージ: 現在値（アクティブユーザー数、CPU使用率）
   - ヒストグラム: 分布（レスポンスタイム、処理時間）

2. **ラベルの適切な使用**
   - カーディナリティが高くならないよう注意
   - 動的な値（ユーザーIDなど）は避ける

3. **ビジネスメトリクスの定期更新**
   - cronジョブで定期的に集計値を更新
   - リアルタイムでなくても良いメトリクスはバッチ処理

### データベースモニタリング

PostgreSQL Exporterによって以下のメトリクスが自動収集されます：

1. **接続関連メトリクス**
   - `pg_stat_database_numbackends`: アクティブな接続数
   - `pg_stat_database_xact_commit`: コミットされたトランザクション数
   - `pg_stat_database_xact_rollback`: ロールバックされたトランザクション数

2. **パフォーマンスメトリクス**
   - `pg_stat_database_blks_read`: ディスクから読み込まれたブロック数
   - `pg_stat_database_blks_hit`: バッファキャッシュのヒット数
   - `pg_stat_database_temp_files`: 一時ファイルの数
   - `pg_stat_database_temp_bytes`: 一時ファイルのサイズ

3. **テーブル統計**
   - `pg_stat_user_tables_seq_scan`: シーケンシャルスキャン数
   - `pg_stat_user_tables_idx_scan`: インデックススキャン数
   - `pg_stat_user_tables_n_tup_ins`: 挿入された行数
   - `pg_stat_user_tables_n_tup_upd`: 更新された行数
   - `pg_stat_user_tables_n_tup_del`: 削除された行数

4. **レプリケーション統計**（該当する場合）
   - `pg_stat_replication_lag`: レプリケーション遅延

これらのメトリクスはGrafanaでダッシュボードを作成して可視化できます。

4. **ダッシュボードの整理**
   - 技術メトリクスとビジネスメトリクスを分離
   - 重要なメトリクスを上部に配置
   - アラート閾値を適切に設定

### パフォーマンスへの配慮

1. **非同期処理の活用**
   - Sentry送信は非ブロッキングで実行
   - メトリクス収集もレスポンスに影響しない

2. **サンプリングの活用**
   - 高トラフィック時はtracesSampleRateを調整
   - 全てのエラーを送信する必要はない

3. **バッファリングの活用**
   - Sentryはキューに蓄積して送信
   - メトリクスも集約してから送信

## トラブルシューティング

### Sentryにエラーが送信されない

1. DSNが正しく設定されているか確認
2. 環境変数がアプリケーションに読み込まれているか確認
3. ネットワーク接続を確認（プロキシ設定など）
4. Sentryのプロジェクト設定でフィルターを確認

### メトリクスが表示されない

1. Prometheusがアプリケーションをスクレイプできているか確認
   - http://localhost:9090/targets でターゲットのステータスを確認
2. メトリクスエンドポイントが正しく動作しているか確認
   - curl http://localhost:3000/metrics
3. Grafanaのデータソース設定を確認

### パフォーマンスの問題

1. Sentryのサンプリングレートを下げる
2. メトリクスのカーディナリティを減らす
3. 不要なログレベルを無効化

## まとめ

このエラートラッキングとモニタリングシステムにより、以下が実現されます：

- **問題の早期発見**: エラーの自動検知とアラート
- **迅速なデバッグ**: 豊富なコンテキスト情報
- **サービス品質の向上**: メトリクスによる継続的な改善
- **型安全性の保証**: Sum型による網羅的なエラーハンドリング

すべての実装はCLAUDE.mdのガイドラインに準拠し、保守性と拡張性を考慮した設計となっています。
# メールプロバイダー仕様

## 概要

本システムでは、環境に応じて複数のメールプロバイダーをサポートしています。各プロバイダーは共通のインターフェースを実装し、透過的に切り替え可能です。

## サポートプロバイダー

### 1. Development Provider

開発時のデバッグ用プロバイダー。実際にはメールを送信せず、コンソールに出力します。

**特徴:**
- メール送信をシミュレート
- 送信内容をコンソールに出力
- 外部依存なし
- 常にヘルスチェック成功

**使用場面:**
- ローカル開発
- CI/CD環境
- メール送信が不要なテスト

### 2. MailHog Provider

ローカル開発用のSMTPサーバー。Docker経由で簡単に起動でき、Web UIでメールを確認できます。

**特徴:**
- SMTP経由でメール送信
- Web UI (http://localhost:8025) でメール確認
- メールの永続化なし（再起動で消去）
- API経由でのメール取得可能

**必要な設定:**
```env
EMAIL_PROVIDER=mailhog
MAILHOG_HOST=localhost
MAILHOG_PORT=1025
```

**起動方法:**
```bash
# Docker Composeで起動
docker-compose up -d mailhog

# または単独で起動
docker run -d \
  -p 1025:1025 \
  -p 8025:8025 \
  --name mailhog \
  mailhog/mailhog
```

### 3. Mailgun Provider

本番環境用のメール配信サービス。高い到達率と詳細な配信レポートを提供します。

**特徴:**
- REST API経由でメール送信
- 配信追跡・分析機能
- テンプレート機能
- Webhook対応
- 添付ファイルサポート

**必要な設定:**
```env
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_REGION=US  # US または EU
MAILGUN_TEST_MODE=false  # テストモード（課金なし）
```

## プロバイダー比較

| 機能 | Development | MailHog | Mailgun |
|------|------------|---------|---------|
| 実際の送信 | ❌ | ✅（ローカル） | ✅ |
| 外部依存 | なし | Docker | API |
| 添付ファイル | ✅（ログ） | ✅ | ✅ |
| 配信追跡 | ❌ | ❌ | ✅ |
| テンプレート | ❌ | ❌ | ✅ |
| 料金 | 無料 | 無料 | 従量課金 |
| Web UI | ❌ | ✅ | ✅ |

## 実装詳細

### 共通インターフェース

すべてのプロバイダーは以下のインターフェースを実装：

```typescript
export interface EmailService {
  send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>>
  getProvider(): string
  isHealthy(): Promise<boolean>
}
```

### DevelopmentEmailProvider

```typescript
export class DevelopmentEmailProvider implements EmailService {
  async send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>> {
    console.log('📧 Email Send Request (Development Mode)')
    console.log('To:', JSON.stringify(input.to, null, 2))
    console.log('Subject:', input.subject)
    
    if (input.content.text) {
      console.log('Text Content:', input.content.text)
    }
    
    // 常に成功を返す
    return ok({
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      provider: 'development',
      timestamp: new Date(),
    })
  }
}
```

### MailhogEmailProvider

```typescript
export class MailhogEmailProvider implements EmailService {
  private transporter: Transporter

  constructor(config: MailhogConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      ignoreTLS: true,
    })
  }

  async send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>> {
    try {
      const info = await this.transporter.sendMail({
        from: input.from ? `${input.from.name} <${input.from.email}>` : undefined,
        to: this.formatAddresses(input.to),
        subject: input.subject,
        text: input.content.text,
        html: input.content.html,
        // その他のオプション
      })

      return ok({
        messageId: info.messageId,
        provider: 'mailhog',
        timestamp: new Date(),
      })
    } catch (error) {
      return err({
        type: 'providerError',
        provider: 'mailhog',
        message: error.message,
      })
    }
  }
}
```

### MailgunEmailProvider

```typescript
export class MailgunEmailProvider implements EmailService {
  private client: IMailgunClient

  constructor(config: MailgunConfig) {
    const mailgun = new Mailgun(FormData)
    this.client = mailgun.client({
      username: 'api',
      key: config.apiKey,
      url: config.region === 'EU' 
        ? 'https://api.eu.mailgun.net' 
        : 'https://api.mailgun.net',
    })
  }

  async send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>> {
    try {
      const messageData = {
        from: this.formatAddress(input.from),
        to: this.formatAddresses(input.to),
        subject: input.subject,
        text: input.content.text,
        html: input.content.html,
        // カスタムヘッダー、タグ、メタデータ
      }

      const response = await this.client.messages.create(
        this.config.domain,
        messageData
      )

      return ok({
        messageId: response.id,
        provider: 'mailgun',
        timestamp: new Date(),
      })
    } catch (error) {
      // エラーハンドリング
    }
  }
}
```

## エラーハンドリング

各プロバイダーは適切なエラー型を返します：

```typescript
// 認証エラー（Mailgun）
if (error.message.includes('401')) {
  return err({
    type: 'configurationError',
    message: 'Invalid Mailgun API key',
  })
}

// ネットワークエラー（MailHog）
if (error.code === 'ECONNREFUSED') {
  return err({
    type: 'networkError',
    message: 'Cannot connect to MailHog',
  })
}

// レート制限（Mailgun）
if (error.message.includes('429')) {
  return err({
    type: 'rateLimitError',
    retryAfter: 60,
  })
}
```

## プロバイダー選択ロジック

```typescript
export function selectEmailProvider(): EmailProvider {
  const envProvider = process.env.EMAIL_PROVIDER

  // 明示的な指定がある場合
  if (envProvider && isValidProvider(envProvider)) {
    return envProvider as EmailProvider
  }

  // 環境に基づいて自動選択
  if (process.env.NODE_ENV === 'production') {
    return 'mailgun'
  }

  if (process.env.NODE_ENV === 'test') {
    return 'development'
  }

  // 開発環境でMailHogが利用可能か確認
  return isMailHogAvailable() ? 'mailhog' : 'development'
}
```

## セキュリティベストプラクティス

### 1. 認証情報の管理

```typescript
// ❌ 悪い例
const apiKey = "key-xxxxxxxxxxxxxxxxxx"

// ✅ 良い例
const apiKey = process.env.MAILGUN_API_KEY
if (!apiKey) {
  throw new Error('MAILGUN_API_KEY is required')
}
```

### 2. 送信元アドレスの検証

```typescript
// Mailgunドメインと送信元の一致を確認
const domain = this.config.domain  // mg.example.com
const fromDomain = input.from.email.split('@')[1]  // example.com

if (!fromDomain.includes(domain.replace('mg.', ''))) {
  return err({
    type: 'configurationError',
    message: 'From address must match Mailgun domain',
  })
}
```

### 3. テストモードの活用

```typescript
// 本番環境でも安全にテスト
if (this.config.testMode) {
  messageData['o:testmode'] = true  // Mailgunのテストモード
}
```

## 監視とロギング

### メトリクス収集

```typescript
// 送信成功率
let successCount = 0
let failureCount = 0

// プロバイダー別の遅延
const latencies: Record<string, number[]> = {
  mailgun: [],
  mailhog: [],
}

// 送信時の計測
const start = Date.now()
const result = await emailService.send(input)
const duration = Date.now() - start

if (result.type === 'ok') {
  successCount++
  latencies[provider].push(duration)
} else {
  failureCount++
  logger.error('Email send failed', {
    provider,
    error: result.error,
    duration,
  })
}
```

### ヘルスチェック

```typescript
// 定期的なヘルスチェック
setInterval(async () => {
  const health = await emailService.isHealthy()
  
  if (!health) {
    logger.warn('Email service unhealthy', {
      provider: emailService.getProvider(),
    })
    
    // アラート送信やフェイルオーバー
  }
}, 60000)  // 1分ごと
```

## マイグレーションガイド

### MailHogからMailgunへの移行

1. **環境変数の更新**
   ```env
   # 変更前
   EMAIL_PROVIDER=mailhog
   MAILHOG_HOST=localhost
   MAILHOG_PORT=1025
   
   # 変更後
   EMAIL_PROVIDER=mailgun
   MAILGUN_API_KEY=your-key
   MAILGUN_DOMAIN=mg.yourdomain.com
   ```

2. **DNSレコードの設定**
   - SPF、DKIM、DMARCレコードの追加
   - Mailgunコンソールで確認

3. **段階的な移行**
   ```typescript
   // A/Bテストでの段階的移行
   const provider = Math.random() > 0.9 ? 'mailgun' : 'mailhog'
   const emailService = createEmailService(provider)
   ```

### プロバイダー固有機能の抽象化

```typescript
// Mailgun固有の機能を抽象化
interface EmailTags {
  campaign?: string
  userId?: string
}

// プロバイダーに依存しない実装
async function sendMarketingEmail(
  to: string,
  template: string,
  data: any,
  tags: EmailTags
) {
  return emailService.send({
    to: { email: to },
    subject: getSubject(template),
    content: renderTemplate(template, data),
    tags,  // Mailgunでは使用、他では無視
  })
}
```
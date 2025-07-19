# メール送信機能

## 概要

本システムでは、環境に応じて異なるメールプロバイダーを使用したメール送信機能を提供します。開発環境ではMailHog、本番環境ではMailgunを使用し、シームレスな切り替えが可能です。

## アーキテクチャ

### レイヤー構成

```
Domain Layer (Interface)
    ↓
Infrastructure Layer (Providers)
    ├── DevelopmentEmailProvider (コンソール出力)
    ├── MailhogEmailProvider (ローカルSMTP)
    └── MailgunEmailProvider (本番API)
```

### 主要インターフェース

```typescript
// Domain Layer
export interface EmailService {
  send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>>
  getProvider(): string
  isHealthy(): Promise<boolean>
}

export type SendEmailInput = {
  to: EmailAddress | EmailAddress[]
  from?: EmailAddress
  subject: string
  content: EmailContent
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  replyTo?: EmailAddress
  attachments?: EmailAttachment[]
  tags?: Record<string, string>
  metadata?: Record<string, unknown>
}
```

## 実装詳細

### 1. メールプロバイダーの自動選択

環境変数 `EMAIL_PROVIDER` に基づいて適切なプロバイダーが自動選択されます：

```typescript
// infrastructure/src/services/email/email.factory.ts
export function createEmailService(provider?: EmailProvider): EmailService {
  const selectedProvider = provider || emailConfig.provider
  
  switch (selectedProvider) {
    case 'development':
      return new DevelopmentEmailProvider()
    case 'mailhog':
      return new MailhogEmailProvider(mailhogConfig)
    case 'mailgun':
      return new MailgunEmailProvider(mailgunConfig)
    default:
      exhaustive(selectedProvider)
  }
}
```

### 2. 非ブロッキングメール送信

メール送信の失敗がアプリケーションの動作をブロックしないよう、NonBlockingEmailWrapper を提供：

```typescript
export class NonBlockingEmailWrapper implements EmailService {
  async send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>> {
    try {
      const result = await this.emailService.send(input)
      if (result.type === 'err') {
        console.error('Email send failed:', result.error)
        // エラーでも成功として返す（ダミーのメッセージID付き）
        return ok({
          messageId: `non-blocking-${Date.now()}`,
          provider: this.emailService.getProvider(),
          timestamp: new Date(),
        })
      }
      return result
    } catch (error) {
      console.error('Unexpected email error:', error)
      return ok({
        messageId: `non-blocking-error-${Date.now()}`,
        provider: this.emailService.getProvider(),
        timestamp: new Date(),
      })
    }
  }
}
```

### 3. エラーハンドリング

Sum型を使用した網羅的なエラーハンドリング：

```typescript
export type EmailServiceError =
  | { type: 'invalidRecipient'; email: string }
  | { type: 'invalidContent'; reason: string }
  | { type: 'providerError'; provider: string; message: string; code?: string }
  | { type: 'rateLimitError'; retryAfter?: number }
  | { type: 'networkError'; message: string }
  | { type: 'configurationError'; message: string }
```

## 使用方法

### 基本的な使用例

```typescript
import { getEmailService } from '@beauty-salon-backend/infrastructure'

const emailService = getEmailService()

const result = await emailService.send({
  to: { email: 'user@example.com', name: 'User Name' },
  subject: 'Welcome to Beauty Salon',
  content: {
    text: 'Welcome to our service!',
    html: '<h1>Welcome to our service!</h1>',
  },
})

if (result.type === 'ok') {
  console.log('Email sent:', result.value.messageId)
} else {
  console.error('Email failed:', result.error)
}
```

### テンプレートを使用した送信

```typescript
const templateService = new EmailTemplateService()

// ユーザー登録確認メール
const emailContent = templateService.render('userRegistration', {
  userName: 'John Doe',
  confirmationUrl: 'https://example.com/confirm?token=xxx',
})

await emailService.send({
  to: { email: 'user@example.com' },
  subject: 'メールアドレスの確認',
  content: emailContent,
})
```

## 環境変数

### 共通設定

```env
EMAIL_PROVIDER=mailgun  # development | mailhog | mailgun
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=Beauty Salon
```

### MailHog設定（開発環境）

```env
MAILHOG_HOST=localhost
MAILHOG_PORT=1025
```

### Mailgun設定（本番環境）

```env
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=mg.example.com
MAILGUN_REGION=US  # US | EU
MAILGUN_TEST_MODE=false
```

## セキュリティ考慮事項

1. **APIキーの管理**
   - Mailgun APIキーは環境変数で管理
   - 絶対にソースコードにハードコードしない

2. **レート制限**
   - Mailgunのレート制限を考慮した実装
   - rateLimitErrorでリトライ間隔を通知

3. **メールアドレスの検証**
   - 送信前にメールアドレスの形式を検証
   - 不正なアドレスは事前にエラーとして処理

## トラブルシューティング

### MailHogに接続できない

```bash
# MailHogが起動しているか確認
docker ps | grep mailhog

# MailHogを起動
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### Mailgunでメールが送信されない

1. APIキーが正しいか確認
2. ドメインが検証済みか確認
3. 送信元アドレスがドメインと一致しているか確認

```typescript
// ヘルスチェックで接続を確認
const isHealthy = await emailService.isHealthy()
console.log('Email service health:', isHealthy)
```

## 開発ガイドライン

### 新しいプロバイダーの追加

1. `EmailService`インターフェースを実装
2. `EmailProvider`型に新しいプロバイダーを追加
3. `createEmailService`関数に分岐を追加
4. 環境変数の設定を追加

```typescript
// 1. 新しいプロバイダーの実装
export class SendGridEmailProvider implements EmailService {
  async send(input: SendEmailInput): Promise<Result<EmailSendResult, EmailServiceError>> {
    // SendGrid APIを使用した実装
  }
  
  getProvider(): string {
    return 'sendgrid'
  }
  
  async isHealthy(): Promise<boolean> {
    // ヘルスチェックの実装
  }
}

// 2. 型の追加
export type EmailProvider = 'development' | 'mailhog' | 'mailgun' | 'sendgrid'

// 3. ファクトリー関数の更新
case 'sendgrid':
  return new SendGridEmailProvider(sendgridConfig)
```

### テスト戦略

1. **単体テスト**: 各プロバイダーの個別テスト
2. **統合テスト**: MailHogを使用した実際の送信テスト
3. **E2Eテスト**: 認証フローなどの実際のユースケース

```typescript
describe('EmailService', () => {
  it('should send email via MailHog', async () => {
    const service = new MailhogEmailProvider({ host: 'localhost', port: 1025 })
    const result = await service.send({
      to: { email: 'test@example.com' },
      subject: 'Test',
      content: { text: 'Test message' },
    })
    
    expect(result.type).toBe('ok')
  })
})
```
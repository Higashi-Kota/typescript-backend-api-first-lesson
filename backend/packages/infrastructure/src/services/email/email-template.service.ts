import type {
  AccountLockedEmailData,
  EmailContent,
  EmailTemplateService,
  PasswordResetEmailData,
  ReservationCancellationEmailData,
  ReservationConfirmationEmailData,
  SecurityNotificationEmailData,
  TwoFactorEnabledEmailData,
  WelcomeEmailData,
} from '@beauty-salon-backend/domain'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export class DefaultEmailTemplateService implements EmailTemplateService {
  private formatDate(date: Date): string {
    return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  private createBaseTemplate(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6c757d; }
    .code { font-family: monospace; background-color: #f8f9fa; padding: 10px; border-radius: 4px; display: inline-block; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #333;">Beauty Salon</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>このメールは自動送信されています。返信はできません。</p>
      <p>&copy; ${new Date().getFullYear()} Beauty Salon. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  renderWelcomeEmail(data: WelcomeEmailData): EmailContent {
    const subject = 'Beauty Salonへようこそ'
    const content = `
      <h2>ようこそ、${data.userName}様</h2>
      <p>Beauty Salonへのご登録ありがとうございます。</p>
      ${
        data.verificationUrl
          ? `
      <p>アカウントを有効化するには、以下のボタンをクリックしてください：</p>
      <div style="text-align: center;">
        <a href="${data.verificationUrl}" class="button">メールアドレスを確認</a>
      </div>
      <p style="font-size: 14px; color: #6c757d;">このリンクは24時間有効です。</p>
      `
          : ''
      }
      <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
    `

    return {
      subject,
      text: `${subject}\n\nようこそ、${data.userName}様\n\nBeauty Salonへのご登録ありがとうございます。${
        data.verificationUrl
          ? `\n\nアカウントを有効化するには、以下のURLにアクセスしてください：\n${data.verificationUrl}\n\nこのリンクは24時間有効です。`
          : ''
      }\n\nご不明な点がございましたら、お気軽にお問い合わせください。`,
      html: this.createBaseTemplate(subject, content),
    }
  }

  renderPasswordResetEmail(data: PasswordResetEmailData): EmailContent {
    const subject = 'パスワードリセットのご案内'
    const content = `
      <h2>パスワードリセット</h2>
      <p>${data.userName}様</p>
      <p>パスワードリセットのリクエストを受け付けました。</p>
      <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
      <div style="text-align: center;">
        <a href="${data.resetUrl}" class="button">パスワードをリセット</a>
      </div>
      <p style="font-size: 14px; color: #6c757d;">このリンクは${data.expiresIn}有効です。</p>
      <div class="warning">
        <p><strong>ご注意：</strong>このリクエストに心当たりがない場合は、このメールを無視してください。パスワードは変更されません。</p>
      </div>
    `

    return {
      subject,
      text: `${subject}\n\n${data.userName}様\n\nパスワードリセットのリクエストを受け付けました。\n\n以下のURLにアクセスして、新しいパスワードを設定してください：\n${data.resetUrl}\n\nこのリンクは${data.expiresIn}有効です。\n\nご注意：このリクエストに心当たりがない場合は、このメールを無視してください。パスワードは変更されません。`,
      html: this.createBaseTemplate(subject, content),
    }
  }

  renderSecurityNotificationEmail(
    data: SecurityNotificationEmailData
  ): EmailContent {
    const subject = 'セキュリティ通知'
    const content = `
      <h2>セキュリティ通知</h2>
      <p>${data.userName}様</p>
      <p>あなたのアカウントで以下のアクティビティが検出されました：</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <p><strong>アクション：</strong> ${data.action}</p>
        <p><strong>日時：</strong> ${this.formatDate(data.timestamp)}</p>
        <p><strong>IPアドレス：</strong> ${data.ipAddress}</p>
        <p><strong>デバイス：</strong> ${data.userAgent}</p>
      </div>
      <p>このアクティビティに心当たりがない場合は、すぐにパスワードを変更し、サポートまでご連絡ください。</p>
    `

    return {
      subject,
      text: `${subject}\n\n${data.userName}様\n\nあなたのアカウントで以下のアクティビティが検出されました：\n\nアクション： ${data.action}\n日時： ${this.formatDate(
        data.timestamp
      )}\nIPアドレス： ${data.ipAddress}\nデバイス： ${data.userAgent}\n\nこのアクティビティに心当たりがない場合は、すぐにパスワードを変更し、サポートまでご連絡ください。`,
      html: this.createBaseTemplate(subject, content),
    }
  }

  renderReservationConfirmationEmail(
    data: ReservationConfirmationEmailData
  ): EmailContent {
    const subject = '予約確認'
    const content = `
      <h2>ご予約ありがとうございます</h2>
      <p>${data.customerName}様</p>
      <p>以下の内容でご予約を承りました：</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <p><strong>サロン：</strong> ${data.salonName}</p>
        <p><strong>サービス：</strong> ${data.serviceName}</p>
        <p><strong>担当スタッフ：</strong> ${data.staffName}</p>
        <p><strong>日時：</strong> ${this.formatDate(data.startTime)} - ${format(data.endTime, 'HH:mm', { locale: ja })}</p>
        <p><strong>料金：</strong> ¥${data.price.toLocaleString()}</p>
      </div>
      <div style="text-align: center;">
        <a href="${data.reservationUrl}" class="button">予約を確認</a>
      </div>
      <p>ご来店を心よりお待ちしております。</p>
    `

    return {
      subject,
      text: `${subject}\n\n${data.customerName}様\n\n以下の内容でご予約を承りました：\n\nサロン： ${data.salonName}\nサービス： ${
        data.serviceName
      }\n担当スタッフ： ${data.staffName}\n日時： ${this.formatDate(data.startTime)} - ${format(
        data.endTime,
        'HH:mm',
        {
          locale: ja,
        }
      )}\n料金： ¥${data.price.toLocaleString()}\n\n予約詳細： ${data.reservationUrl}\n\nご来店を心よりお待ちしております。`,
      html: this.createBaseTemplate(subject, content),
    }
  }

  renderReservationCancellationEmail(
    data: ReservationCancellationEmailData
  ): EmailContent {
    const subject = '予約キャンセルのお知らせ'
    const content = `
      <h2>予約キャンセルのお知らせ</h2>
      <p>${data.customerName}様</p>
      <p>以下のご予約がキャンセルされました：</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <p><strong>サロン：</strong> ${data.salonName}</p>
        <p><strong>サービス：</strong> ${data.serviceName}</p>
        <p><strong>担当スタッフ：</strong> ${data.staffName}</p>
        <p><strong>予約日時：</strong> ${this.formatDate(data.originalStartTime)}</p>
        ${data.cancellationReason ? `<p><strong>キャンセル理由：</strong> ${data.cancellationReason}</p>` : ''}
      </div>
      <p>またのご予約をお待ちしております。</p>
    `

    return {
      subject,
      text: `${subject}\n\n${data.customerName}様\n\n以下のご予約がキャンセルされました：\n\nサロン： ${data.salonName}\nサービス： ${
        data.serviceName
      }\n担当スタッフ： ${data.staffName}\n予約日時： ${this.formatDate(data.originalStartTime)}${
        data.cancellationReason
          ? `\nキャンセル理由： ${data.cancellationReason}`
          : ''
      }\n\nまたのご予約をお待ちしております。`,
      html: this.createBaseTemplate(subject, content),
    }
  }

  renderAccountLockedEmail(data: AccountLockedEmailData): EmailContent {
    const subject = 'アカウントロックのお知らせ'
    const content = `
      <h2>アカウントがロックされました</h2>
      <p>${data.userName}様</p>
      <p>セキュリティ上の理由により、あなたのアカウントが一時的にロックされました。</p>
      <div class="warning">
        <p><strong>ロック理由：</strong> ${data.reason}</p>
      </div>
      ${
        data.unlockUrl
          ? `
      <p>アカウントのロックを解除するには、以下のボタンをクリックしてください：</p>
      <div style="text-align: center;">
        <a href="${data.unlockUrl}" class="button">アカウントロックを解除</a>
      </div>
      `
          : '<p>アカウントのロック解除については、サポートまでお問い合わせください。</p>'
      }
    `

    return {
      subject,
      text: `${subject}\n\n${data.userName}様\n\nセキュリティ上の理由により、あなたのアカウントが一時的にロックされました。\n\nロック理由： ${
        data.reason
      }${
        data.unlockUrl
          ? `\n\nアカウントのロックを解除するには、以下のURLにアクセスしてください：\n${data.unlockUrl}`
          : '\n\nアカウントのロック解除については、サポートまでお問い合わせください。'
      }`,
      html: this.createBaseTemplate(subject, content),
    }
  }

  renderTwoFactorEnabledEmail(data: TwoFactorEnabledEmailData): EmailContent {
    const subject = '2要素認証が有効になりました'
    const content = `
      <h2>2要素認証の設定完了</h2>
      <p>${data.userName}様</p>
      <p>あなたのアカウントで2要素認証が有効になりました。</p>
      <p>以下はバックアップコードです。これらのコードは、認証アプリにアクセスできない場合にログインするために使用できます：</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
        ${data.backupCodes.map((code) => `<p class="code">${code}</p>`).join('')}
      </div>
      <div class="warning">
        <p><strong>重要：</strong>これらのバックアップコードを安全な場所に保管してください。各コードは一度だけ使用できます。</p>
      </div>
    `

    return {
      subject,
      text: `${subject}\n\n${data.userName}様\n\nあなたのアカウントで2要素認証が有効になりました。\n\n以下はバックアップコードです。これらのコードは、認証アプリにアクセスできない場合にログインするために使用できます：\n\n${data.backupCodes.join(
        '\n'
      )}\n\n重要：これらのバックアップコードを安全な場所に保管してください。各コードは一度だけ使用できます。`,
      html: this.createBaseTemplate(subject, content),
    }
  }
}

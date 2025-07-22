/**
 * Email Templates
 * 認証関連のメールテンプレート
 * CLAUDEガイドラインに準拠
 */

export interface EmailTemplate {
  subject: string
  text: string
  html: string
}

export interface TemplateData {
  name: string
  [key: string]: string | number | boolean | undefined | string[] | Date
}

/**
 * Base template with common styles
 */
const baseTemplate = (content: string, data: TemplateData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject || 'Beauty Salon'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: #4a5568;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4a5568;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #2d3748;
    }
    .footer {
      background-color: #f7fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #718096;
    }
    .code {
      background-color: #f7fafc;
      border: 1px solid #e2e8f0;
      padding: 15px;
      font-family: monospace;
      font-size: 18px;
      text-align: center;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Beauty Salon</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Beauty Salon. All rights reserved.</p>
      <p>このメールに心当たりがない場合は、無視していただいて構いません。</p>
    </div>
  </div>
</body>
</html>
`

/**
 * Password Reset Email Template
 */
export const passwordResetTemplate = (data: {
  name: string
  resetUrl: string
  expiresIn: string
}): EmailTemplate => {
  const subject = 'パスワードリセットのご案内'

  const text = `
${data.name} 様

パスワードリセットのリクエストを受け付けました。

以下のリンクをクリックして、新しいパスワードを設定してください：
${data.resetUrl}

このリンクは${data.expiresIn}後に無効になります。

このメールに心当たりがない場合は、無視していただいて構いません。
パスワードは変更されません。

Beauty Salon
`

  const htmlContent = `
    <p>${data.name} 様</p>
    <p>パスワードリセットのリクエストを受け付けました。</p>
    <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
    <div style="text-align: center;">
      <a href="${data.resetUrl}" class="button">パスワードをリセット</a>
    </div>
    <p style="font-size: 14px; color: #718096;">
      または、以下のリンクをコピーしてブラウザに貼り付けてください：<br>
      <a href="${data.resetUrl}" style="color: #4a5568;">${data.resetUrl}</a>
    </p>
    <p style="color: #e53e3e;">このリンクは${data.expiresIn}後に無効になります。</p>
  `

  return {
    subject,
    text,
    html: baseTemplate(htmlContent, { ...data, subject }),
  }
}

/**
 * Email Verification Template
 */
export const emailVerificationTemplate = (data: {
  name: string
  verifyUrl: string
  expiresIn: string
}): EmailTemplate => {
  const subject = 'メールアドレスの確認'

  const text = `
${data.name} 様

Beauty Salonへのご登録ありがとうございます。

以下のリンクをクリックして、メールアドレスを確認してください：
${data.verifyUrl}

このリンクは${data.expiresIn}後に無効になります。

Beauty Salon
`

  const htmlContent = `
    <p>${data.name} 様</p>
    <p>Beauty Salonへのご登録ありがとうございます。</p>
    <p>以下のボタンをクリックして、メールアドレスを確認してください：</p>
    <div style="text-align: center;">
      <a href="${data.verifyUrl}" class="button">メールアドレスを確認</a>
    </div>
    <p style="font-size: 14px; color: #718096;">
      または、以下のリンクをコピーしてブラウザに貼り付けてください：<br>
      <a href="${data.verifyUrl}" style="color: #4a5568;">${data.verifyUrl}</a>
    </p>
    <p style="color: #e53e3e;">このリンクは${data.expiresIn}後に無効になります。</p>
  `

  return {
    subject,
    text,
    html: baseTemplate(htmlContent, { ...data, subject }),
  }
}

/**
 * Two-Factor Authentication Setup Template
 */
export const twoFactorSetupTemplate = (data: {
  name: string
  backupCodes: string[]
}): EmailTemplate => {
  const subject = '2要素認証が有効になりました'

  const text = `
${data.name} 様

アカウントの2要素認証が正常に有効になりました。

バックアップコード：
${data.backupCodes.join('\n')}

これらのコードは安全な場所に保管してください。
各コードは一度のみ使用できます。

Beauty Salon
`

  const htmlContent = `
    <p>${data.name} 様</p>
    <p>アカウントの2要素認証が正常に有効になりました。</p>
    <p>以下のバックアップコードを安全な場所に保管してください：</p>
    <div class="code">
      ${data.backupCodes.map((code) => `<div>${code}</div>`).join('')}
    </div>
    <p style="color: #e53e3e;">
      重要：各コードは一度のみ使用できます。認証アプリにアクセスできない場合の緊急用です。
    </p>
  `

  return {
    subject,
    text,
    html: baseTemplate(htmlContent, { ...data, subject }),
  }
}

/**
 * Password Changed Notification Template
 */
export const passwordChangedTemplate = (data: {
  name: string
  changedAt: Date
  ipAddress?: string
}): EmailTemplate => {
  const subject = 'パスワードが変更されました'

  const text = `
${data.name} 様

アカウントのパスワードが変更されました。

変更日時：${data.changedAt.toLocaleString('ja-JP')}
${data.ipAddress ? `IPアドレス：${data.ipAddress}` : ''}

この変更に心当たりがない場合は、直ちにサポートまでご連絡ください。

Beauty Salon
`

  const htmlContent = `
    <p>${data.name} 様</p>
    <p>アカウントのパスワードが変更されました。</p>
    <div style="background-color: #f7fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>変更日時：</strong>${data.changedAt.toLocaleString('ja-JP')}</p>
      ${data.ipAddress ? `<p style="margin: 5px 0;"><strong>IPアドレス：</strong>${data.ipAddress}</p>` : ''}
    </div>
    <p style="color: #e53e3e;">
      この変更に心当たりがない場合は、直ちにサポートまでご連絡ください。
    </p>
  `

  return {
    subject,
    text,
    html: baseTemplate(htmlContent, { ...data, subject }),
  }
}

/**
 * Account Locked Notification Template
 */
export const accountLockedTemplate = (data: {
  name: string
  reason: string
  unlockTime?: Date
}): EmailTemplate => {
  const subject = 'アカウントがロックされました'

  const text = `
${data.name} 様

セキュリティ上の理由により、アカウントが一時的にロックされました。

理由：${data.reason}
${data.unlockTime ? `ロック解除予定時刻：${data.unlockTime.toLocaleString('ja-JP')}` : ''}

ロックを解除するには、パスワードリセットを行うか、サポートまでご連絡ください。

Beauty Salon
`

  const htmlContent = `
    <p>${data.name} 様</p>
    <p>セキュリティ上の理由により、アカウントが一時的にロックされました。</p>
    <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 5px 0; color: #c53030;"><strong>理由：</strong>${data.reason}</p>
      ${data.unlockTime ? `<p style="margin: 5px 0;"><strong>ロック解除予定時刻：</strong>${data.unlockTime.toLocaleString('ja-JP')}</p>` : ''}
    </div>
    <p>ロックを解除するには、パスワードリセットを行うか、サポートまでご連絡ください。</p>
  `

  return {
    subject,
    text,
    html: baseTemplate(htmlContent, { ...data, subject }),
  }
}

/**
 * Suspicious Activity Alert Template
 */
export const suspiciousActivityTemplate = (data: {
  name: string
  activity: string
  ipAddress?: string
  location?: string
  timestamp: Date
}): EmailTemplate => {
  const subject = '不審なアクティビティが検出されました'

  const text = `
${data.name} 様

アカウントで不審なアクティビティが検出されました。

アクティビティ：${data.activity}
日時：${data.timestamp.toLocaleString('ja-JP')}
${data.ipAddress ? `IPアドレス：${data.ipAddress}` : ''}
${data.location ? `場所：${data.location}` : ''}

このアクティビティに心当たりがない場合は、直ちにパスワードを変更し、
2要素認証を有効にすることをお勧めします。

Beauty Salon
`

  const htmlContent = `
    <p>${data.name} 様</p>
    <p style="color: #e53e3e;">アカウントで不審なアクティビティが検出されました。</p>
    <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>アクティビティ：</strong>${data.activity}</p>
      <p style="margin: 5px 0;"><strong>日時：</strong>${data.timestamp.toLocaleString('ja-JP')}</p>
      ${data.ipAddress ? `<p style="margin: 5px 0;"><strong>IPアドレス：</strong>${data.ipAddress}</p>` : ''}
      ${data.location ? `<p style="margin: 5px 0;"><strong>場所：</strong>${data.location}</p>` : ''}
    </div>
    <p>このアクティビティに心当たりがない場合は：</p>
    <ul>
      <li>直ちにパスワードを変更してください</li>
      <li>2要素認証を有効にしてください</li>
      <li>アカウントの他のセキュリティ設定を確認してください</li>
    </ul>
  `

  return {
    subject,
    text,
    html: baseTemplate(htmlContent, { ...data, subject }),
  }
}

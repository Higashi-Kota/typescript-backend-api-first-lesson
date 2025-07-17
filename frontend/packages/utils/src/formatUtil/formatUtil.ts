export const formatNumber = (value: number | string) => {
  // 文字列を数値に変換
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value

  // 入力から小数点以下の桁数を取得
  const decimalPlaces = getDecimalPlaces(value)

  const formatDefinition = new Intl.NumberFormat('ja-JP', {
    style: 'decimal',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })

  return formatDefinition.format(numValue)
}

export const formatCurrency = (value: number | string) => {
  // 文字列を数値に変換
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value

  // 入力から小数点以下の桁数を取得
  const decimalPlaces = getDecimalPlaces(value)

  const formatDefinition = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })

  return `${formatDefinition.format(numValue).slice(1)}円`
}

// 小数点以下の桁数を取得するヘルパー関数
const getDecimalPlaces = (value: number | string): number => {
  const strValue = typeof value === 'string' ? value : value.toString()
  const parts = strValue.split('.')
  return parts.length > 1 && parts[1] ? parts[1].length : 0
}

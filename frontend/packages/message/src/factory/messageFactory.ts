export const messageFactory = {
  createRepository: () => {
    return {
      validation: () => {
        return {
          requiredMark: () => {
            return '必須'
          },
          requiredInput: () => {
            return '必須入力です' as const
          },
          requiredAgree: () => {
            return '同意が必要です'
          },
          requiredMinValue: (minValue: number, unit = '個') => {
            return `${minValue}${unit}以上です`
          },
          requiredMaxValue: (maxValue: number, unit = '個') => {
            return `${maxValue}${unit}以下です`
          },
          requiredMinBetweenValue: (maxValue: number) => {
            return `${maxValue}以上です`
          },
          requiredMaxBetweenValue: (maxValue: number) => {
            return `${maxValue}以内です`
          },
          invalidId: (featureName = 'ユーザー') => {
            return `不正な${featureName}IDです`
          },
          invalidParams: (...props: unknown[]) => {
            if (props.length === 0) {
              return '不正な引数です'
            }

            return `不正な引数です[${props.join(',')}]`
          },
          unmetPrivilege: () => {
            return 'この操作を実行する権限がありません'
          },
        } as const
      },
      feedback: () => {
        return {
          success: (processName = '処理') => {
            return `${processName}に成功しました`
          },
          error: (processName = '処理') => {
            return `${processName}に失敗しました`
          },
          internalServerError: () => {
            return 'システムエラーです'
          },
          notMatchedData: () => {
            return '検索条件に該当するデータはありません'
          },
        }
      },
      chrono: () => {
        return {
          invalidYYYYMMDD: () => {
            return 'YYYY-MM-DD形式です'
          },
          invalidRFC3339: () => {
            return 'YYYY-MM-DDTHH:MM:SSZ形式です'
          },
        }
      },
      URL: () => {
        return {
          invalidURL: () => {
            return '無効なURLです'
          },
        }
      },
      currency: () => {
        return {
          invalidCurrency: () => {
            return '0円以上です'
          },
        }
      },
      email: () => {
        return {
          invalidEmail: () => {
            return '無効なメールアドレスです'
          },
        }
      },
      katakana: () => {
        return {
          invalidHalfWidthKatakana: () => {
            return '半角カタカナのみです'
          },
          invalidFullWidthKatakana: () => {
            return '全角カタカナのみです'
          },
        }
      },
      startDate: () => {
        return {
          invalidFormat: () => {
            return '開始日はyyyy-mm-dd形式で入力してください'
          },
        }
      },
      endDate: () => {
        return {
          invalidFormat: () => {
            return '終了日はyyyy-mm-dd形式で入力してください'
          },
        }
      },
      birthday: () => {
        return {
          invalidFormat: () => {
            return '生年月日はyyyy-mm-dd形式で入力してください'
          },
        }
      },
    }
  },
}

import type { ValueUnion } from '../typeUtil'

const AllowFormatPattern = {
  YYYY_MM: {
    value: 'yyyy-MM',
    label: '',
    description: '',
  },
  YYYY_MM_DD: {
    value: 'yyyy-MM-dd',
    label: '',
    description: '',
  },
  YYYY_MM_JP: {
    value: 'yyyy年MM月',
    label: '',
    description: '',
  },
  M_D_JP: {
    value: 'M月d日',
    label: '',
    description: '',
  },
  YYYY_MM_DD_JP: {
    value: 'yyyy年MM月dd日',
    label: '',
    description: '',
  },
  YYYY_M_D_JP: {
    value: 'yyyy年M月d日',
    label: '',
    description: '',
  },
  YYYY_M_D_DDD_JP: {
    value: 'yyyy年M月d日(EEE)',
    label: '',
    description: '',
  },
  YYYY_MM_DD_SLASH: {
    value: 'yyyy/MM/dd',
    label: '',
    description: '',
  },
  YYYY_MM_DD_HH_MM: {
    value: 'yyyy-MM-dd HH:mm',
    label: '',
    description: '',
  },
  YYYY_M_D_HH_MM_JP: {
    value: 'yyyy年M月d日 HH:mm',
    label: '',
    description: '',
  },
  RFC3339: {
    value: "yyyy-MM-dd'T'HH:mm:ssXXX",
    label: '',
    description: '',
  },
} as const

const AllowFormatPatterns = Object.entries(AllowFormatPattern).map(
  (entry) => entry[1]
)
export type AllowFormat = (typeof AllowFormatPatterns)[number]
export type AllowFormatValue = ValueUnion<Pick<AllowFormat, 'value'>>

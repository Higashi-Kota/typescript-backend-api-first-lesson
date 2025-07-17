import qs from 'query-string'

type StringifyParamsTuple = Parameters<typeof qs.stringify>

export const qsStringify = (
  data: StringifyParamsTuple[0],
  options?: StringifyParamsTuple[1]
) => {
  const defaultOptions: StringifyParamsTuple[1] = {
    skipEmptyString: true,
    skipNull: true,
    arrayFormat: 'bracket-separator',
    sort: false,
  }

  return qs.stringify(data, { ...defaultOptions, ...options })
}

type ParseParamsTuple = Parameters<typeof qs.parse>

export const qsParse = (
  data: ParseParamsTuple[0],
  options?: ParseParamsTuple[1]
) => {
  const defaultOptions: ParseParamsTuple[1] = {
    parseBooleans: true,
    parseNumbers: true,
    arrayFormat: 'bracket-separator',
    decode: true,
    sort: false,
  }

  return qs.parse(data, { ...defaultOptions, ...options })
}

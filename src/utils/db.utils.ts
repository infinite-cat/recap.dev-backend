export const escapeLiteral = (str: string) => {
  let hasBackslash = false
  let escaped = "'"

  for (const c of str.split('')) {
    if (c === "'") {
      escaped += c + c
    } else if (c === '\\') {
      escaped += c + c
      hasBackslash = true
    } else {
      escaped += c
    }
  }

  escaped += "'"

  if (hasBackslash) {
    escaped = ' E' + escaped
  }

  return escaped
}

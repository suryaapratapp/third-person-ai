export function maskSensitiveContent(text) {
  if (!text) return ''

  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => {
      const [name, domain] = email.split('@')
      const safeName = `${name.slice(0, 1)}***`
      const safeDomain = `${domain.slice(0, 1)}***`
      return `${safeName}@${safeDomain}`
    })
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, (phone) => {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 8) return phone
      const tail = digits.slice(-2)
      return `***-***-${tail}`
    })
}

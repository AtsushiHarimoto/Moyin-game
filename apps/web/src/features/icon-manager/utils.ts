export function validateSvgContent(text: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!text.includes('<svg')) {
    errors.push('File does not contain valid SVG markup.')
  }
  return { valid: errors.length === 0, errors }
}

export class TextCorrector {
  private commonCorrections: { [key: string]: string } = {
    // Correcciones para alemán (ingredientes comunes)
    'Zwiebel': 'Zwiebel',
    'Zwiebeln': 'Zwiebeln',
    'Knoblauch': 'Knoblauch',
    'Karotte': 'Karotte',
    'Karotten': 'Karotten',
    'Möhre': 'Möhre',
    'Möhren': 'Möhren',
    'Tomate': 'Tomate',
    'Tomaten': 'Tomaten',
    'Paprika': 'Paprika',
    'Kartoffel': 'Kartoffel',
    'Kartoffeln': 'Kartoffeln',
    'Fleisch': 'Fleisch',
    'Hähnchen': 'Hähnchen',
    'Rindfleisch': 'Rindfleisch',
    'Schweinefleisch': 'Schweinefleisch',
    'Salz': 'Salz',
    'Pfeffer': 'Pfeffer',
    'Öl': 'Öl',
    'Olivenöl': 'Olivenöl',
    'Butter': 'Butter',
    'Mehl': 'Mehl',
    'Zucker': 'Zucker',
    'Milch': 'Milch',
    'Ei': 'Ei',
    'Eier': 'Eier',
    'Wasser': 'Wasser',
    'Brühe': 'Brühe',

    // Correcciones OCR comunes alemán
    'EI': 'Ei',
    'Oel': 'Öl',
    'OI': 'Öl',
    'Buher': 'Butter',
    'Mehi': 'Mehl',

    // Correcciones numéricas comunes
    'I ': '1 ',
    'l ': '1 ',
    '| ': '1 ',
    'O ': '0 ',

    // Medidas comunes
    'taza': 'taza',
    'tazas': 'tazas',
    'cucharada': 'cucharada',
    'cucharadita': 'cucharadita',
    'gramo': 'gramo',
    'gramos': 'gramos',
    'kilo': 'kilo',
    'litro': 'litro',

    // Palabras comunes mal reconocidas
    'de ': 'de ',
    'en ': 'en ',
    'con ': 'con ',
    'para ': 'para ',
    'hasta ': 'hasta ',
    'desde ': 'desde ',

    // Caracteres especiales problemáticos
    '•': '• ',
    '-': '• ',
    '*': '• ',
    '·': '• ',
  }

  private ingredientKeywords = [
    // Solo alemán
    'Zwiebel', 'Zwiebeln', 'Knoblauch', 'Tomate', 'Tomaten', 'Karotte', 'Karotten',
    'Möhre', 'Möhren', 'Paprika', 'Kartoffel', 'Kartoffeln', 'Sellerie',
    'Kürbis', 'Bohnen', 'Erbsen', 'Kichererbsen', 'Linsen',
    'Reis', 'Nudeln', 'Spaghetti', 'Pasta', 'Makkaroni',
    'Hähnchen', 'Hühnchen', 'Fleisch', 'Rindfleisch', 'Schweinefleisch',
    'Lamm', 'Schinken', 'Wurst', 'Speck',
    'Öl', 'Olivenöl', 'Salz', 'Pfeffer', 'Paprikapulver', 'Petersilie',
    'Lorbeer', 'Thymian', 'Rosmarin', 'Basilikum',
    'Zucker', 'Mehl', 'Ei', 'Eier', 'Milch', 'Butter', 'Sahne', 'Käse',
    'Wasser', 'Brühe', 'Gemüsebrühe', 'Fleischbrühe', 'Wein', 'Essig', 'Zitrone'
  ]

  correctText(text: string): string {
    if (!text || text.trim().length === 0) return text

    let corrected = text

    // Aplicar correcciones básicas
    for (const [wrong, right] of Object.entries(this.commonCorrections)) {
      const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      corrected = corrected.replace(regex, right)
    }

    // Limpiar espacios múltiples
    corrected = corrected.replace(/\s+/g, ' ')

    // Corregir números al inicio de líneas
    corrected = corrected.replace(/^[Il|]\s/gm, '1 ')
    corrected = corrected.replace(/^O\s/gm, '0 ')

    // Limpiar caracteres raros
    corrected = corrected.replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ.,;:()\[\]{}+\-*/=°%•]/g, '')

    return corrected.trim()
  }

  correctIngredient(ingredient: string): string {
    let corrected = this.correctText(ingredient)

    // Intentar detectar cantidades al inicio
    corrected = corrected.replace(/^[Il|]\s*([a-záéíóúñü])/i, '1 $1')

    // Corregir medidas comunes
    corrected = corrected.replace(/\b([0-9]+)\s*gr\b/gi, '$1 gramos')
    corrected = corrected.replace(/\b([0-9]+)\s*kg\b/gi, '$1 kilos')
    corrected = corrected.replace(/\b([0-9]+)\s*ml\b/gi, '$1 ml')
    corrected = corrected.replace(/\b([0-9]+)\s*l\b/gi, '$1 litros')

    // Si parece un ingrediente pero está muy mal, intentar corregir con palabras clave
    const words = corrected.toLowerCase().split(' ')
    for (const keyword of this.ingredientKeywords) {
      for (const word of words) {
        if (this.similarity(word, keyword) > 0.6) {
          corrected = corrected.replace(new RegExp(word, 'gi'), keyword)
          break
        }
      }
    }

    return corrected.trim()
  }

  correctStep(step: string): string {
    let corrected = this.correctText(step)

    // Remover numeración al inicio si existe
    corrected = corrected.replace(/^[0-9]+[\.\)]\s*/, '')

    // Capitalizar primera letra
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1).toLowerCase()

    // Corregir verbos de cocina comunes
    const cookingVerbs = {
      'mezclar': /mezcl[a-z]*/gi,
      'añadir': /añad[a-z]*/gi,
      'cocinar': /cocin[a-z]*/gi,
      'freír': /fr[eí][a-z]*/gi,
      'hervir': /herv[a-z]*/gi,
      'hornear': /horne[a-z]*/gi,
      'batir': /bat[a-z]*/gi,
      'cortar': /cort[a-z]*/gi,
      'pelar': /pel[a-z]*/gi,
      'picar': /pic[a-z]*/gi
    }

    for (const [correct, pattern] of Object.entries(cookingVerbs)) {
      corrected = corrected.replace(pattern, correct)
    }

    return corrected.trim()
  }

  // Función de similitud simple para comparar palabras
  private similarity(a: string, b: string): number {
    if (a.length === 0 || b.length === 0) return 0
    if (a === b) return 1

    const longer = a.length > b.length ? a : b
    const shorter = a.length > b.length ? b : a

    if (longer.length === 0) return 1

    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }
}
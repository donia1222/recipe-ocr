import { TextCorrector } from './text-corrector'
import { parseWithNLP } from './nlp-recipe-parser'

export class TextParser {
  private corrector = new TextCorrector()
  private useNLP = true // Flag para activar/desactivar NLP

  parseRecipeText(text: string): {
    title?: string
    ingredients: string[]
    steps: string[]
    servings?: string
    totalTime?: string
  } {
    // Detectar si es alemán por palabras clave
    const isGerman = text.match(/\b(zutaten|schritt|löffel|tasse|mascarpone|zucker|eigelb|kakaopulver)\b/i)

    // Si es alemán y NLP está activado, usar el parser NLP
    if (isGerman && this.useNLP) {
      try {
        const nlpResult = parseWithNLP(text, 'de')

        // Convertir formato NLP a formato esperado
        return {
          title: nlpResult.title || undefined,
          ingredients: nlpResult.ingredients.map(ing =>
            ing.ingredient || ing.raw || ''
          ).filter(Boolean),
          steps: nlpResult.steps,
          servings: nlpResult.servings?.toString(),
          totalTime: nlpResult.totalTime
        }
      } catch (error) {
        console.warn('NLP parser failed, falling back to basic parser:', error)
        // Continuar con parser básico si NLP falla
      }
    }

    // Parser básico original
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length === 0) {
      return { ingredients: [], steps: [] }
    }

    let title: string | undefined
    const ingredients: string[] = []
    const steps: string[] = []
    let servings: string | undefined
    let totalTime: string | undefined

    let currentSection: 'title' | 'ingredients' | 'steps' | 'meta' = 'title'
    let stepCounter = 1

    for (const line of lines) {
      const lowerLine = line.toLowerCase()

      if (this.isServingsLine(line)) {
        servings = this.extractServings(line)
        continue
      }

      if (this.isTimeLine(line)) {
        totalTime = this.extractTime(line)
        continue
      }

      if (this.isIngredientsSectionStart(lowerLine)) {
        currentSection = 'ingredients'
        continue
      }

      if (this.isStepsSectionStart(lowerLine)) {
        currentSection = 'steps'
        stepCounter = 1
        continue
      }

      if (this.isStepLine(line) && currentSection !== 'ingredients') {
        currentSection = 'steps'
      }

      switch (currentSection) {
        case 'title':
          if (!title && line.length > 3) {
            title = this.cleanTitle(line)
            currentSection = 'meta'
          }
          break

        case 'ingredients':
          if (this.isIngredientLine(line)) {
            const cleanedIngredient = this.cleanIngredient(line)
            const correctedIngredient = this.corrector.correctIngredient(cleanedIngredient)
            ingredients.push(correctedIngredient)
          } else if (this.isStepLine(line)) {
            currentSection = 'steps'
            const cleanedStep = this.cleanStep(line, stepCounter++)
            const correctedStep = this.corrector.correctStep(cleanedStep)
            steps.push(correctedStep)
          }
          break

        case 'steps':
          if (this.isIngredientLine(line) && ingredients.length === 0) {
            currentSection = 'ingredients'
            const cleanedIngredient = this.cleanIngredient(line)
            const correctedIngredient = this.corrector.correctIngredient(cleanedIngredient)
            ingredients.push(correctedIngredient)
          } else {
            const cleanedStep = this.cleanStep(line, stepCounter++)
            const correctedStep = this.corrector.correctStep(cleanedStep)
            steps.push(correctedStep)
          }
          break

        case 'meta':
          if (this.isIngredientLine(line)) {
            currentSection = 'ingredients'
            const cleanedIngredient = this.cleanIngredient(line)
            const correctedIngredient = this.corrector.correctIngredient(cleanedIngredient)
            ingredients.push(correctedIngredient)
          } else if (this.isStepLine(line)) {
            currentSection = 'steps'
            const cleanedStep = this.cleanStep(line, stepCounter++)
            const correctedStep = this.corrector.correctStep(cleanedStep)
            steps.push(correctedStep)
          }
          break
      }
    }

    if (!title && ingredients.length > 0) {
      title = ingredients[0].length > 50 ? undefined : ingredients.shift()
    }

    return {
      title: title || undefined,
      ingredients: ingredients.filter(ing => ing.length > 2),
      steps: steps.filter(step => step.length > 5),
      servings,
      totalTime
    }
  }

  private isIngredientsSectionStart(line: string): boolean {
    const keywords = [
      'ingredientes', 'ingredients', 'zutaten',
      'necesitas', 'necesario', 'materiales'
    ]
    return keywords.some(keyword => line.includes(keyword))
  }

  private isStepsSectionStart(line: string): boolean {
    const keywords = [
      'preparación', 'preparation', 'instrucciones', 'instructions',
      'pasos', 'steps', 'método', 'method', 'procedimiento',
      'zubereitung', 'anweisungen'
    ]
    return keywords.some(keyword => line.includes(keyword))
  }

  private isIngredientLine(line: string): boolean {
    const ingredientPatterns = [
      /^\d+\s*(taza|cup|cups|tazas|ml|gr|g|kg|lb|oz|cucharada|tbsp|tablespoon|cucharadita|tsp|teaspoon|pizca|pinch)/i,
      /^\d+\/\d+/,
      /^\d+\.\d+/,
      /^(una|un|dos|tres|cuatro|cinco|media|half|one|two|three|four|five|ein|eine|zwei|drei)\s/i,
      /\b(sal|salt|salz|pimienta|pepper|pfeffer|aceite|oil|öl|agua|water|wasser)\b/i
    ]

    return ingredientPatterns.some(pattern => pattern.test(line)) ||
           (line.length < 80 && line.includes(' ') && !this.isStepLine(line))
  }

  private isStepLine(line: string): boolean {
    const stepPatterns = [
      /^\d+[\.\)]/,
      /^(paso|step|schritt)\s*\d+/i,
      /^(primero|segundo|tercero|luego|después|finalmente|first|second|third|then|finally|zuerst|dann|schließlich)/i
    ]

    return stepPatterns.some(pattern => pattern.test(line)) ||
           (line.length > 50 && (
             line.includes('mezcla') || line.includes('mix') || line.includes('mischen') ||
             line.includes('cocina') || line.includes('cook') || line.includes('kochen') ||
             line.includes('hornea') || line.includes('bake') || line.includes('backen')
           ))
  }

  private isServingsLine(line: string): boolean {
    return /\b(porciones|servings|serves|für\s+\d+\s+personen)/i.test(line)
  }

  private isTimeLine(line: string): boolean {
    return /\b(minutos|minutes|minuten|horas|hours|stunden|tiempo|time|zeit)/i.test(line)
  }

  private extractServings(line: string): string {
    const match = line.match(/\b(\d+)\s*(porciones|servings|serves|personen)/i)
    return match ? match[1] : line
  }

  private extractTime(line: string): string {
    const patterns = [
      /(\d+)\s*(minutos|minutes|minuten|min)/i,
      /(\d+)\s*(horas|hours|stunden|hr|h)/i,
      /(\d+:\d+)/
    ]

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) return match[0]
    }

    return line
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/^(receta|recipe|rezept)[\s:]/i, '')
      .trim()
  }

  private cleanIngredient(ingredient: string): string {
    return ingredient
      .replace(/^[\d\.\)\-\*\+]\s*/, '')
      .trim()
  }

  private cleanStep(step: string, _counter: number): string {
    let cleaned = step
      .replace(/^[\d\.\)\-\*\+]\s*/, '')
      .replace(/^(paso|step|schritt)\s*\d+[\.\:\-\s]*/i, '')
      .trim()

    if (cleaned.length < 10) {
      cleaned = step.trim()
    }

    return cleaned
  }
}
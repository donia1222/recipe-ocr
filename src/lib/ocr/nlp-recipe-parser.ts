import nlp from 'compromise';
import { parse as parseIngredient } from 'recipe-ingredient-parser';

export type EnhancedParsedRecipe = {
  title: string;
  ingredients: Array<{
    raw: string;
    quantity?: number;
    unit?: string;
    ingredient?: string;
    preparation?: string;
  }>;
  steps: string[];
  servings?: number;
  totalTime?: string;
  confidence: number;
};

export class NLPRecipeParser {
  private germanCookingVerbs = [
    'aufbrühen', 'erkalten', 'legen', 'beträufeln', 'verrühren',
    'verteilen', 'streuen', 'durchziehen', 'servieren', 'mischen',
    'rühren', 'schlagen', 'backen', 'kochen', 'schneiden',
    'hinzufügen', 'gießen', 'formen', 'kneten', 'braten',
    'dünsten', 'würzen', 'abschmecken', 'anrichten'
  ];

  private germanUnits = {
    'tasse': 'cup',
    'tassen': 'cups',
    'esslöffel': 'tablespoon',
    'el': 'tablespoon',
    'teelöffel': 'teaspoon',
    'tl': 'teaspoon',
    'packung': 'package',
    'paket': 'package',
    'pakete': 'packages',
    'prise': 'pinch',
    'stück': 'piece',
    'scheibe': 'slice',
    'scheiben': 'slices'
  };

  public parseRecipe(text: string, language: 'de' | 'en' | 'es' = 'de'): EnhancedParsedRecipe {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let confidence = 0;
    const result: EnhancedParsedRecipe = {
      title: '',
      ingredients: [],
      steps: [],
      servings: undefined,
      totalTime: undefined,
      confidence: 0
    };

    // Detectar título usando NLP
    result.title = this.detectTitle(lines);
    if (result.title) confidence += 20;

    // Detectar secciones
    const sections = this.detectSections(lines);

    // Procesar ingredientes con parser especializado
    if (sections.ingredientsStart !== -1) {
      const ingredientLines = this.extractIngredientLines(lines, sections);
      result.ingredients = this.parseIngredients(ingredientLines, language);
      confidence += result.ingredients.length > 0 ? 30 : 0;
    }

    // Procesar pasos usando NLP
    if (sections.stepsStart !== -1) {
      const stepLines = this.extractStepLines(lines, sections);
      result.steps = this.parseSteps(stepLines, language);
      confidence += result.steps.length > 0 ? 30 : 0;
    }

    // Detectar metadatos
    const metadata = this.extractMetadata(text);
    result.servings = metadata.servings;
    result.totalTime = metadata.totalTime;
    if (result.servings || result.totalTime) confidence += 20;

    result.confidence = Math.min(confidence, 100);
    return result;
  }

  private detectTitle(lines: string[]): string {
    // Buscar líneas que parezcan títulos
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];

      // Skip UI elements
      if (line.match(/^(kochbücher|wochenplaner|bewertungen|zutaten|schritt)/i)) {
        continue;
      }

      // Detectar títulos de recetas
      const doc = nlp(line);

      // Si contiene nombres de platos conocidos
      if (line.match(/tiramisu|kuchen|torte|salat|suppe|brot|pizza|pasta|lasagne/i)) {
        return line.replace(/^rezept\s*/i, '').trim();
      }

      // Si es una frase corta sin verbos (probable título)
      if (line.length < 60 && !doc.has('#Verb') && doc.has('#Noun')) {
        return line;
      }
    }

    return 'Rezept';
  }

  private detectSections(lines: string[]): { ingredientsStart: number; stepsStart: number } {
    let ingredientsStart = -1;
    let stepsStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      if (line.match(/^(zutaten|ingredients|ingredientes)/)) {
        ingredientsStart = i;
      }

      if (line.match(/^(zubereitung|schritt|anleitung|preparation|steps)/)) {
        stepsStart = i;
        break;
      }
    }

    // Si no hay secciones claras, usar heurística
    if (ingredientsStart === -1 && stepsStart === -1) {
      // Buscar donde empiezan los ingredientes (líneas con cantidades/unidades)
      for (let i = 0; i < lines.length; i++) {
        if (this.looksLikeIngredient(lines[i])) {
          ingredientsStart = i;
          break;
        }
      }

      // Buscar donde empiezan los pasos (oraciones con verbos)
      for (let i = ingredientsStart + 1; i < lines.length; i++) {
        if (this.looksLikeStep(lines[i])) {
          stepsStart = i;
          break;
        }
      }
    }

    return { ingredientsStart, stepsStart };
  }

  private looksLikeIngredient(line: string): boolean {
    // Patrones típicos de ingredientes
    return !!(
      line.match(/^[•\-\*O\(\)]/) ||
      line.match(/^\d+\s*(g|kg|ml|l|tasse|esslöffel|teelöffel|packung|paket)/i) ||
      line.match(/\b(eier|zucker|mehl|butter|milch|sahne|käse|salz|pfeffer)\b/i)
    );
  }

  private looksLikeStep(line: string): boolean {
    // Debe ser una oración con verbos de cocina
    const hasVerb = this.germanCookingVerbs.some(verb =>
      line.toLowerCase().includes(verb)
    );

    return hasVerb && line.length > 20;
  }

  private extractIngredientLines(lines: string[], sections: any): string[] {
    const { ingredientsStart, stepsStart } = sections;

    if (ingredientsStart === -1) return [];

    const endIndex = stepsStart !== -1 ? stepsStart : lines.length;
    const ingredientLines: string[] = [];

    for (let i = ingredientsStart + 1; i < endIndex; i++) {
      const line = lines[i];

      // Skip UI elements
      if (line.match(/^(zur einkaufsliste|schritt \d+)/i)) continue;

      // Clean and add
      const cleaned = line.replace(/^[•\-\*O\(\)]\s*/, '').trim();
      if (cleaned.length > 2) {
        ingredientLines.push(cleaned);
      }
    }

    return ingredientLines;
  }

  private parseIngredients(lines: string[], language: string): any[] {
    return lines.map(line => {
      try {
        // Intentar parser especializado primero
        const parsed = parseIngredient(line);

        // Si falla, hacer parsing manual para alemán
        if (!parsed.ingredient && language === 'de') {
          return this.parseGermanIngredient(line);
        }

        return {
          raw: line,
          quantity: parsed.quantity,
          unit: parsed.unit,
          ingredient: parsed.ingredient,
          preparation: parsed.preparation
        };
      } catch {
        // Fallback para líneas problemáticas
        return {
          raw: line,
          ingredient: line
        };
      }
    });
  }

  private parseGermanIngredient(line: string): any {
    const result = {
      raw: line,
      quantity: undefined as number | undefined,
      unit: undefined as string | undefined,
      ingredient: line
    };

    // Extraer cantidad
    const qtyMatch = line.match(/^(\d+(?:[,\.]\d+)?)\s*/);
    if (qtyMatch) {
      result.quantity = parseFloat(qtyMatch[1].replace(',', '.'));
      line = line.substring(qtyMatch[0].length);
    }

    // Extraer unidad
    for (const [germanUnit, englishUnit] of Object.entries(this.germanUnits)) {
      const unitRegex = new RegExp(`^${germanUnit}\\s+`, 'i');
      if (line.match(unitRegex)) {
        result.unit = englishUnit;
        line = line.replace(unitRegex, '');
        break;
      }
    }

    result.ingredient = line.trim();
    return result;
  }

  private extractStepLines(lines: string[], sections: any): string[] {
    const { stepsStart } = sections;

    if (stepsStart === -1) return [];

    const stepLines: string[] = [];
    let currentStep = '';

    for (let i = stepsStart; i < lines.length; i++) {
      const line = lines[i];

      // Nueva sección de paso
      if (line.match(/^schritt\s+\d+/i)) {
        if (currentStep) {
          stepLines.push(currentStep);
        }
        currentStep = '';
        continue;
      }

      // Skip UI elements
      if (line.match(/^(zur einkaufsliste|kochbücher|bewertungen)/i)) continue;

      // Acumular texto del paso
      if (line.length > 3) {
        currentStep = currentStep ? `${currentStep} ${line}` : line;
      }
    }

    // Agregar último paso
    if (currentStep) {
      stepLines.push(currentStep);
    }

    return stepLines;
  }

  private parseSteps(lines: string[], language: string): string[] {
    return lines.map(line => {
      // Limpiar números de paso y formatear
      return line
        .replace(/^schritt\s+\d+[\.:]\s*/i, '')
        .replace(/^\d+[\.)]\s*/, '')
        .trim();
    }).filter(step => step.length > 10);
  }

  private extractMetadata(text: string): { servings?: number; totalTime?: string } {
    const metadata: { servings?: number; totalTime?: string } = {};

    // Detectar porciones
    const servingsMatch = text.match(/(\d+)\s*(?:portionen?|personen?|serviert|servings?)/i);
    if (servingsMatch) {
      metadata.servings = parseInt(servingsMatch[1], 10);
    }

    // Detectar tiempo
    const timeMatch = text.match(/(\d+)\s*(?:min|minuten|stunden?|hours?)/i);
    if (timeMatch) {
      metadata.totalTime = timeMatch[0];
    }

    return metadata;
  }
}

// Función helper para integrar con el sistema actual
export function parseWithNLP(text: string, language: 'de' | 'en' | 'es' = 'de'): EnhancedParsedRecipe {
  const parser = new NLPRecipeParser();
  return parser.parseRecipe(text, language);
}
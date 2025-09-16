// ChatGPT's German recipe parser - Enhanced version
export type ParsedRecipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  servings?: number | null;
};

export function parseGermanRecipe(raw: string): ParsedRecipe {
  const lines = raw.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);

  let title = '';
  const ingredients: string[] = [];
  const steps: string[] = [];
  let servings: number | null = null;

  let inZutaten = false;
  let inSteps = false;
  let currentStepText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip UI elements and metadata
    if (line.match(/^(kochbücher|wochenplaner|anpassen|teilen|bewertungen|hinzugefügt|zur einkaufsliste)/i)) {
      continue;
    }

    // Detectar título (Tiramisu à la Herzchen u otros)
    if (!title && i < 5) {
      if (line.match(/tiramisu|kuchen|torte|salat|suppe|brot/i) &&
          !line.match(/^[•\-\*]/) &&
          line.length < 60) {
        title = line;
        continue;
      }
    }

    // Detectar porciones
    const servingsMatch = line.match(/^(\d+)\s*(?:portionen?|personen?|serviert)/i);
    if (servingsMatch) {
      servings = parseInt(servingsMatch[1], 10);
      continue;
    }

    // Detectar inicio de sección Zutaten
    if (line.match(/^zutaten\s*$/i)) {
      inZutaten = true;
      inSteps = false;
      continue;
    }

    // Detectar inicio de un paso numerado (Schritt X)
    if (line.match(/^schritt\s+\d+/i)) {
      inZutaten = false;
      inSteps = true;

      // Si tenemos un paso acumulado anterior, guardarlo
      if (currentStepText) {
        steps.push(currentStepText);
      }

      // Comenzar nuevo paso (sin el "Schritt X")
      currentStepText = '';
      continue;
    }

    // Procesar líneas en sección Zutaten
    if (inZutaten && !inSteps) {
      // Los ingredientes empiezan con • o contienen cantidades/productos
      if (line.match(/^[•\-\*]/) ||
          line.match(/\d+\s*(pakete?|tassen?|esslöffel|teelöffel|eier|g|ml)/i) ||
          line.match(/\b(mascarpone|löffelbisquits|kaffee|zucker|eigelb|eiwei[ßs]|kakaopulver|amaretto|cognac)\b/i)) {

        const cleaned = line
          .replace(/^[•\-\*]\s*/, '')
          .trim();

        if (cleaned.length > 2 &&
            !cleaned.match(/^schritt/i) &&
            !cleaned.match(/^zur einkaufsliste/i)) {
          ingredients.push(cleaned);
        }
      }
    }

    // Procesar líneas en sección de pasos
    if (inSteps) {
      // Acumular texto del paso actual (puede ser multilínea)
      if (!line.match(/^schritt\s+\d+/i) &&
          !line.match(/^zur einkaufsliste/i) &&
          line.length > 3) {

        if (currentStepText) {
          currentStepText += ' ' + line;
        } else {
          currentStepText = line;
        }
      }
    }

    // Si no estamos en ninguna sección clara, intentar detectar por contenido
    if (!inZutaten && !inSteps && !title) {
      // Detectar ingredientes sueltos al principio
      if (line.match(/^[•\-\*O\(\)]/) &&
          line.match(/\b(pakete?|tassen?|esslöffel|löffel|eier|zucker|kaffee|mascarpone)\b/i)) {

        const cleaned = line
          .replace(/^[•\-\*O\(\)]\s*/, '')
          .trim();

        if (cleaned.length > 2) {
          ingredients.push(cleaned);
        }
      }
      // Detectar pasos por verbos de cocina
      else if (line.length > 20 &&
               line.match(/\b(aufbrühen|lassen|legen|beträufeln|verrühren|verteilen|streuen|durchziehen|servieren)\b/i)) {

        const cleaned = line
          .replace(/^[\d\.\)\-,]\s*/, '')
          .trim();

        if (cleaned.length > 10) {
          steps.push(cleaned);
        }
      }
    }
  }

  // Guardar el último paso acumulado si existe
  if (currentStepText) {
    steps.push(currentStepText);
  }

  // Si no encontramos título, buscar primera línea válida
  if (!title) {
    title = lines.find(l =>
      !l.match(/^[•\-\*]/) &&
      !l.match(/^(zutaten|schritt|zur einkaufsliste)/i) &&
      l.length > 3 &&
      l.length < 60
    ) || 'Tiramisu Rezept';
  }

  return {
    title: title.trim(),
    ingredients: ingredients.filter(ing => ing.length > 2),
    steps: steps.filter(step => step.length > 5),
    servings
  };
}
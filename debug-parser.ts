// Debug del parser paso a paso

import { aiRecipeParser } from './src/lib/ocr/ai-recipe-parser';

const cleanText = `
Zutaten
• 2 Pakete Mascarpone à 250g
• Eine ausreichende Packung Löffelbisquits
• 4 Eier
• Kaffee
• Amaretto oder Cognac
• 3 Esslöffel Zucker
• Kakaopulver (herb, nicht süß)

Schritt 1
Ein paar Tassen starken Kaffee aufbrühen und erkalten lassen.

Schritt 2
Die Löffelbisquits nebeneinander in die Form legen.
`;

// Debug manual del parser
function debugParser() {
  console.log('=== DEBUG MANUAL PARSER ===');

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  console.log('Total lines:', lines.length);

  let title = 'Rezept';
  const ingredients: any[] = [];
  const steps: string[] = [];

  let inIngredientsSection = false;
  let inStepsSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    console.log(`\nProcessing: "${line}"`);
    console.log(`  Lower: "${lower}"`);

    // Detectar secciones
    if (lower.includes('zutaten') || lower.includes('ingredient')) {
      console.log('  -> INGREDIENTS SECTION START');
      inIngredientsSection = true;
      inStepsSection = false;
      continue;
    }

    if (lower.includes('schritt') || lower.includes('zubereitung') ||
        lower.includes('anleitung') || lower.match(/^schritt\s*\d+/)) {
      console.log('  -> STEPS SECTION START');
      inStepsSection = true;
      inIngredientsSection = false;
      continue;
    }

    console.log(`  State: ingredients=${inIngredientsSection}, steps=${inStepsSection}`);

    // Procesar contenido
    const looksIngredient = looksLikeIngredient(line);
    const looksStep = looksLikeStep(line);

    console.log(`  Looks ingredient: ${looksIngredient}, looks step: ${looksStep}`);

    if (inIngredientsSection && looksIngredient && !looksStep) {
      console.log('  -> ADDED AS INGREDIENT');
      const ingredient = parseIngredientLine(line.replace(/^[•\-\*]\s*/, ''));
      if (ingredient.item && ingredient.item.length > 2) {
        ingredients.push(ingredient);
        console.log(`     Item: "${ingredient.item}"`);
      }
    }

    if (inStepsSection || looksStep) {
      console.log('  -> ADDED AS STEP');
      const cleanStep = line
        .replace(/^schritt\s*\d+[\.\:\s]*/i, '')
        .replace(/^\d+[\.\)\s]+/, '')
        .trim();

      if (cleanStep.length > 10) {
        steps.push(cleanStep);
        console.log(`     Step: "${cleanStep.substring(0, 50)}..."`);
        inStepsSection = true;
        inIngredientsSection = false;
      }
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Title: ${title}`);
  console.log(`Ingredients: ${ingredients.length}`);
  ingredients.forEach((ing, i) => console.log(`  ${i+1}. ${ing.item}`));
  console.log(`Steps: ${steps.length}`);
  steps.forEach((step, i) => console.log(`  ${i+1}. ${step.substring(0, 50)}...`));
}

function looksLikeIngredient(line: string): boolean {
  const result = !!(
    line.match(/^\s*[•\-\*]/) || // Bullets explícitos
    line.match(/^\d+\s*(paket|pakete|packung)/i) || // "2 Pakete Mascarpone"
    line.match(/à\s*\d+g/i) || // "à 250g"
    line.match(/^\d+\s*(g|kg|ml|l|tasse|löffel|stück|ei|eier)/i) || // Cantidades
    line.match(/\b(mascarpone|zucker|eigelb|butter|mehl|sahne|löffelbisquits|kaffee|amaretto|cognac|kakaopulver)\b/i) // Ingredientes específicos
  );
  console.log(`    looksLikeIngredient("${line}") = ${result}`);
  return result;
}

function looksLikeStep(line: string): boolean {
  const result = !!(
    line.match(/^schritt\s*\d+/i) ||
    line.match(/^\d+[\.\)]\s/) ||
    (line.length > 30 && line.match(/\b(mischen|rühren|geben|lassen|backen|kochen|aufbrühen|legen|beträufeln|verrühren)\b/i))
  );
  console.log(`    looksLikeStep("${line}") = ${result}`);
  return result;
}

function parseIngredientLine(line: string): { item: string, quantity?: string, unit?: string } {
  // Pattern: "cantidad unidad ingrediente"
  const match = line.match(/^(\d+(?:[,\.]\d+)?)\s*([a-zA-ZäöüÄÖÜß]+)?\s+(.+)$/);

  if (match) {
    return {
      quantity: match[1].replace(',', '.'),
      unit: match[2] || undefined,
      item: match[3].trim()
    };
  }

  // Si no hay cantidad, todo es el ingrediente
  return { item: line };
}

debugParser();
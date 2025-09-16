// Test simple del preprocessing y regex parser

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

Schritt 3
Wenn die Form voll ist, die Löffelbisquits mit dem Kaffee beträufeln bis sie gut feucht sind, aber nicht aufquellen.

Schritt 4
Den Mascarpone in einer Schüssel mit dem Zucker, den 4 Eigelb, Eiweiss steifgeschlagen und dem Amaretto (oder Cognac) verrühren.
`;

function testSimpleRegex() {
  console.log('=== TEST REGEX SIMPLE ===');

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  console.log('Lines found:', lines.length);
  lines.forEach((line, i) => {
    console.log(`${i+1}. ${line}`);
  });

  // Test ingredient detection
  console.log('\n=== INGREDIENT DETECTION ===');
  lines.forEach((line, i) => {
    const isIngredient = looksLikeIngredient(line);
    if (isIngredient) {
      console.log(`✓ Ingredient: ${line}`);
    }
  });

  // Test step detection
  console.log('\n=== STEP DETECTION ===');
  lines.forEach((line, i) => {
    const isStep = looksLikeStep(line);
    if (isStep) {
      console.log(`✓ Step: ${line}`);
    }
  });
}

function looksLikeIngredient(line: string): boolean {
  return !!(
    line.match(/^\s*[•\-\*]/) || // Bullets explícitos
    line.match(/^\d+\s*(paket|pakete|packung)/i) || // "2 Pakete Mascarpone"
    line.match(/à\s*\d+g/i) || // "à 250g"
    line.match(/^\d+\s*(g|kg|ml|l|tasse|löffel|stück|ei|eier)/i) || // Cantidades
    line.match(/\b(mascarpone|zucker|eigelb|butter|mehl|sahne|löffelbisquits|kaffee|amaretto|cognac|kakaopulver)\b/i) // Ingredientes específicos
  );
}

function looksLikeStep(line: string): boolean {
  return !!(
    line.match(/^schritt\s*\d+/i) ||
    line.match(/^\d+[\.\)]\s/) ||
    (line.length > 30 && line.match(/\b(mischen|rühren|geben|lassen|backen|kochen|aufbrühen|legen|beträufeln|verrühren)\b/i))
  );
}

testSimpleRegex();
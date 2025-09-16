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

function testCorruption() {
  console.log('=== CORRUPTION TEST ===');

  // Muy corto
  const isShort = cleanText.length < 30;
  console.log(`Text length: ${cleanText.length}, too short: ${isShort}`);

  // Demasiados caracteres extraños
  const strangeChars = (cleanText.match(/[^\w\s\näöüß\-\.,()•]/g) || []);
  const strangeCharRatio = strangeChars.length / cleanText.length;
  const tooStrange = strangeCharRatio > 0.6;
  console.log(`Strange chars: ${strangeChars.length}, ratio: ${strangeCharRatio.toFixed(3)}, too strange: ${tooStrange}`);
  console.log('Strange chars found:', strangeChars);

  // Sin estructura reconocible
  const hasIngredients = cleanText.toLowerCase().includes('zutaten') ||
                        cleanText.match(/\d+\s*(g|ml|tasse|löffel|paket)/gi) ||
                        cleanText.match(/[•\-\*]/g);
  const hasSteps = cleanText.toLowerCase().includes('schritt') ||
                  cleanText.match(/\d+[\.\)]/g) ||
                  cleanText.match(/\b(aufbrühen|legen|mischen|rühren)\b/gi);

  console.log(`Has ingredients: ${hasIngredients}`);
  console.log(`Has steps: ${hasSteps}`);

  // Si tiene ingredientes O pasos, no está corrupto
  const hasStructure = hasIngredients || hasSteps;
  console.log(`Has structure: ${hasStructure}`);

  const isCorrupted = isShort || tooStrange || !hasStructure;
  console.log(`IS CORRUPTED: ${isCorrupted}`);
}

testCorruption();
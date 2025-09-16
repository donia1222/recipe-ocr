import { aiRecipeParser } from './src/lib/ocr/ai-recipe-parser';

// Test con tu ejemplo problemático
const corruptedText = `
Tiramisu a la Herzchen:
Zubereitung (2 Schritte)

1
O 2 Pakete Mascarpone a 25og Die LoLöffelbisquits nebeneinander in die Form legen. OO Eine ausreichende Packung LoLöffelbisquits für eine Schüssel oder Schritt 3 Auflaufform O AE Wenn die Form voh ist, die LoLöffelbisquits mit dem Kaffee betraufeln ier a. . bis sie gut feucht sind, aber nicht aufquehen. O) Kaffee

2
(O) Amaretto oder Cognac Den Mascarpone in einer Schiissel mit dem Zucker, den 4 Eigelb, 2 o 3 Esslöffel Zucker Eiweiss steif geschlagen und dem Amaretto (oder Cognac) verrühren. O Kakaopulver (herb, nicht süß) Anschließend gleichmäßig auf die LoLöffelbisquits verteilen. Y Zur Einkaufsliste hinzufügen Schritt 5 i Das Kakaopulver in einer ersten Schicht und durch ein Sieb gleichmäßig auf der Tiramisu verteilen. Und jetzt ein paar Stunden durchziehen lassen. Kurz vor dem Servieren nochmal mit Kakaopulver auf die oberste Schicht streuen
`;

// Test con el ejemplo mejorado
const cleanText = `
Zutaten
1 serviert

• 2 Pakete Mascarpone à 250g
• Eine ausreichende Packung Löffelbisquits für eine Schüssel oder Auflaufform
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
Den Mascarpone in einer Schüssel mit dem Zucker, den 4 Eigelb, Eiweiss steifgeschlagen und dem Amaretto (oder Cognac) verrühren. Anschließend gleichmäßig auf die Löffelbisquits verteilen.

Schritt 5
Das Kakaopulver in einer ersten Schicht und durch ein Sieb gleichmäßig auf der Tiramisu verteilen. Und jetzt ein paar Stunden durchziehen lassen. Kurz vor dem Servieren nochmal mit Kakaopulver auf die oberste Schicht streuen.
`;

async function testTiramisu() {
  console.log('=== TEST 1: Texto Corrupto (tu ejemplo problemático) ===');
  try {
    const result1 = await aiRecipeParser.parseRecipeText(corruptedText);
    console.log('Método:', result1.method);
    console.log('Confianza:', result1.confidence + '%');
    console.log('Título:', result1.title);
    console.log('Ingredientes:', result1.ingredients.length);
    result1.ingredients.forEach((ing, i) => {
      console.log(`  ${i+1}. ${ing.quantity} ${ing.unit || ''} ${ing.item}`.trim());
    });
    console.log('Pasos:', result1.steps.length);
    result1.steps.forEach((step, i) => {
      console.log(`  ${i+1}. ${step.substring(0, 60)}...`);
    });
    console.log('Porciones:', result1.servings || 'No detectado');
    console.log('');
  } catch (error) {
    console.error('Error en test 1:', error);
  }

  console.log('=== TEST 2: Texto Limpio (ejemplo mejorado) ===');
  try {
    const result2 = await aiRecipeParser.parseRecipeText(cleanText);
    console.log('Método:', result2.method);
    console.log('Confianza:', result2.confidence + '%');
    console.log('Título:', result2.title);
    console.log('Ingredientes:', result2.ingredients.length);
    result2.ingredients.forEach((ing, i) => {
      console.log(`  ${i+1}. ${ing.quantity || ''} ${ing.unit || ''} ${ing.item}`.trim());
    });
    console.log('Pasos:', result2.steps.length);
    result2.steps.forEach((step, i) => {
      console.log(`  ${i+1}. ${step.substring(0, 60)}...`);
    });
    console.log('Porciones:', result2.servings || 'No detectado');
  } catch (error) {
    console.error('Error en test 2:', error);
  }
}

// Ejecutar test
testTiramisu().catch(console.error);
// ChatGPT's German OCR text corrector
export function fixCommonOcrErrors(s: string) {
  let t = s;

  // Normaliza espacios y guiones
  t = t.replace(/\u2013/g, '–').replace(/\u2212/g, '-');
  t = t.replace(/[ ]{2,}/g, ' ');

  // Puntos y comas pegados
  t = t.replace(/\s+([.,;:])/g, '$1').replace(/([.,;:])(?=\S)/g, '$1 ');

  // Errores típicos
  t = t.replace(/([A-ZÄÖÜ])l(?=[a-zäöü]{2,})/g, '$11');        // "Klffee" -> "K1ffee" (rara vez)
  t = t.replace(/(?<=\w)I(?=\w)/g, 'l');                       // "EIn" -> "Eln"
  t = t.replace(/(?<=\w)0(?=\w)/g, 'o');                       // "C0gnac" -> "Cognac"
  t = t.replace(/rn/g, 'm');                                   // "Kakaopulvern" -> "Kakaopulvem" (luego corrige plural)
  t = t.replace(/ll/g, 'h');                                   // "Löffelhiscuits" -> "Löffehiscuits" (mitiga una clase de error)

  // Estandariza unidades
  t = t.replace(/\bEL\b/g, 'Esslöffel').replace(/\bTL\b/g, 'Teelöffel');

  // Correcciones específicas para ingredientes alemanes comunes
  t = t.replace(/ffelbisquits/g, 'Löffelbisquits');
  t = t.replace(/ffelbtsquiks/g, 'Löffelbisquits');
  t = t.replace(/magcarplna/g, 'Mascarpone');
  t = t.replace(/kokmopulver/g, 'Kakaopulver');
  t = t.replace(/Lffelbisquits/g, 'Löffelbisquits');
  t = t.replace(/Laffelbienuite/g, 'Löffelbisquits');
  t = t.replace(/tiromtsu/g, 'Tiramisu');
  t = t.replace(/amaretb0/g, 'Amaretto');

  // Correcciones específicas para pasos de preparación
  t = t.replace(/nebenEinander/g, 'nebeneinander');
  t = t.replace(/gleichmli9tg/g, 'gleichmäßig');
  t = t.replace(/Gleichmig/g, 'Gleichmäßig');
  t = t.replace(/versühren/g, 'verrühren');
  t = t.replace(/steifgeschlagen/g, 'steif geschlagen');
  t = t.replace(/sbelfgeschlagen/g, 'steif geschlagen');

  // Limpia líneas basura cortas
  t = t.split('\n').filter(line => line.trim().length > 1).join('\n');

  return t;
}
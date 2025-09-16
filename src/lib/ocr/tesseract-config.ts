import { createWorker, PSM } from 'tesseract.js'

// ChatGPT's optimized Tesseract configuration
export const TESS_LANG = 'deu+eng+spa'; // prioriza "deu", añade eng/es por si hay palabras sueltas
export const TESS_OPTIONS = {
  // PSM 6: asume un bloque de texto uniforme (suele ir mejor para recetas)
  tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  // OEM 1: LSTM-only (más nuevo y preciso)
  tessedit_ocr_engine_mode: '1',
  // Whitelist razonable para alemán de cocina
  tessedit_char_whitelist:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß0123456789-–.,;:()/%+°"\' ',
};

export async function createOCRWorker(languages: string = 'deu') {
  // Usar configuración optimizada de ChatGPT
  languages = TESS_LANG
  console.log(`Initializing Tesseract worker with languages: ${languages}`)

  try {
    const worker = await createWorker(languages, 1, {
      logger: (m) => {
        console.log(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`)
      },
      // Simplemente dejar que use CDN por defecto
      // Solo especificar langPath si queremos usar archivos locales
    })

    console.log('Setting OCR parameters...')
    await worker.setParameters(TESS_OPTIONS)

    console.log('OCR worker initialized successfully')
    return worker
  } catch (error) {
    console.error('Error creating OCR worker:', error)
    throw new Error(`Failed to initialize OCR worker: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
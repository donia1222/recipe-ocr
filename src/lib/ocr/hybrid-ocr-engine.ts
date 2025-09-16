import { pipeline } from '@xenova/transformers';
import { createOCRWorker, TESS_LANG } from './tesseract-config';

export interface HybridOCRResult {
  text: string;
  confidence: number;
  method: 'tesseract' | 'trocr-printed' | 'trocr-handwritten';
  processingTime: number;
}

export class HybridOCREngine {
  private trocrPrintedPipeline: any = null;
  private trocrHandwrittenPipeline: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Inicializando TrOCR pipelines...');

      // Inicializar pipeline para texto impreso
      this.trocrPrintedPipeline = await pipeline(
        'image-to-text',
        'Xenova/trocr-base-printed',
        { revision: 'main' }
      );

      // Inicializar pipeline para texto manuscrito
      this.trocrHandwrittenPipeline = await pipeline(
        'image-to-text',
        'Xenova/trocr-base-handwritten',
        { revision: 'main' }
      );

      this.isInitialized = true;
      console.log('TrOCR pipelines inicializados correctamente');
    } catch (error) {
      console.error('Error inicializando TrOCR:', error);
      throw new Error('Failed to initialize TrOCR pipelines');
    }
  }

  async processImage(imageBuffer: Buffer): Promise<HybridOCRResult> {
    const startTime = Date.now();

    // 1. Probar primero con Tesseract (rápido y bueno para texto limpio)
    const tesseractResult = await this.runTesseract(imageBuffer);

    // 2. Si Tesseract tiene baja confianza, probar TrOCR
    if (tesseractResult.confidence < 70) {
      console.log(`Tesseract confianza baja (${tesseractResult.confidence}%), probando TrOCR...`);

      // 3. Probar TrOCR impreso primero
      const trocrPrintedResult = await this.runTrOCR(imageBuffer, 'printed');

      // 4. Si TrOCR impreso también falla, probar manuscrito
      if (this.isLowQualityResult(trocrPrintedResult.text)) {
        console.log('TrOCR impreso no funcionó, probando manuscrito...');
        const trocrHandResult = await this.runTrOCR(imageBuffer, 'handwritten');

        // Retornar el mejor resultado
        return this.selectBestResult([tesseractResult, trocrPrintedResult, trocrHandResult]);
      }

      return this.selectBestResult([tesseractResult, trocrPrintedResult]);
    }

    // Tesseract funcionó bien
    return {
      ...tesseractResult,
      processingTime: Date.now() - startTime
    };
  }

  private async runTesseract(imageBuffer: Buffer): Promise<Omit<HybridOCRResult, 'processingTime'>> {
    try {
      const worker = await createOCRWorker(TESS_LANG);
      const { data: { text, confidence } } = await worker.recognize(imageBuffer);
      await worker.terminate();

      return {
        text: text || '',
        confidence: confidence || 0,
        method: 'tesseract'
      };
    } catch (error) {
      console.error('Error en Tesseract:', error);
      return {
        text: '',
        confidence: 0,
        method: 'tesseract'
      };
    }
  }

  private async runTrOCR(imageBuffer: Buffer, type: 'printed' | 'handwritten'): Promise<Omit<HybridOCRResult, 'processingTime'>> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const pipeline = type === 'printed' ? this.trocrPrintedPipeline : this.trocrHandwrittenPipeline;

      if (!pipeline) {
        throw new Error(`TrOCR ${type} pipeline not initialized`);
      }

      // Convertir buffer a base64 para TrOCR
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      const result = await pipeline(base64Image);

      // TrOCR no proporciona confidence score, lo estimamos por longitud y coherencia
      const estimatedConfidence = this.estimateConfidence(result[0]?.generated_text || '');

      return {
        text: result[0]?.generated_text || '',
        confidence: estimatedConfidence,
        method: type === 'printed' ? 'trocr-printed' : 'trocr-handwritten'
      };
    } catch (error) {
      console.error(`Error en TrOCR ${type}:`, error);
      return {
        text: '',
        confidence: 0,
        method: type === 'printed' ? 'trocr-printed' : 'trocr-handwritten'
      };
    }
  }

  private estimateConfidence(text: string): number {
    if (!text || text.length < 10) return 10;

    let score = 50; // Base score

    // Bonus por longitud razonable
    if (text.length > 50) score += 20;

    // Bonus por palabras alemanas comunes en recetas
    const germanWords = ['zutaten', 'schritt', 'mascarpone', 'löffel', 'tasse', 'zucker', 'ei', 'butter'];
    const foundWords = germanWords.filter(word => text.toLowerCase().includes(word)).length;
    score += foundWords * 10;

    // Penalización por caracteres extraños
    const strangeChars = (text.match(/[^\w\s\-\.,äöüß]/g) || []).length;
    score -= strangeChars * 2;

    // Bonus por estructura (numeros, pasos)
    if (text.match(/\d+\s*(g|ml|tasse|löffel)/gi)) score += 15;
    if (text.match(/schritt\s*\d+/gi)) score += 15;

    return Math.max(10, Math.min(100, score));
  }

  private isLowQualityResult(text: string): boolean {
    if (!text || text.length < 20) return true;

    // Demasiados caracteres extraños
    const strangeCharRatio = (text.match(/[^\w\s\-\.,äöüß]/g) || []).length / text.length;
    if (strangeCharRatio > 0.3) return true;

    // Sin palabras reconocibles
    const words = text.split(/\s+/).filter(w => w.length > 3);
    if (words.length < 5) return true;

    return false;
  }

  private selectBestResult(results: Omit<HybridOCRResult, 'processingTime'>[]): HybridOCRResult {
    // Filtrar resultados vacíos
    const validResults = results.filter(r => r.text && r.text.length > 10);

    if (validResults.length === 0) {
      return {
        text: results[0]?.text || '',
        confidence: 0,
        method: results[0]?.method || 'tesseract',
        processingTime: 0
      };
    }

    // Seleccionar el de mayor confianza
    const bestResult = validResults.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    console.log(`Mejor resultado: ${bestResult.method} (${bestResult.confidence}% confianza)`);

    return {
      ...bestResult,
      processingTime: Date.now() - Date.now() // Se calculará en processImage
    };
  }

  async cleanup(): Promise<void> {
    this.trocrPrintedPipeline = null;
    this.trocrHandwrittenPipeline = null;
    this.isInitialized = false;
  }
}

// Instancia singleton para reutilización
export const hybridOCREngine = new HybridOCREngine();
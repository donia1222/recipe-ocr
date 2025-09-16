import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { preprocessForOCR } from '@/lib/ocr/image-processor'
import { fixCommonOcrErrors } from '@/lib/ocr/german-text-corrector'
import { parseGermanRecipe } from '@/lib/ocr/german-recipe-parser'
import { TESS_LANG, TESS_OPTIONS, createOCRWorker } from '@/lib/ocr/tesseract-config'
import { hybridOCREngine } from '@/lib/ocr/hybrid-ocr-engine'
import { aiRecipeParser } from '@/lib/ocr/ai-recipe-parser'
import { parseRecipeSimple } from '@/lib/ocr/simple-recipe-parser'

// Force dynamic to avoid static generation issues with tesseract
export const dynamic = 'force-dynamic'

const uploadSchema = z.object({
  languages: z.string().optional().default('deu')
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    // Forzar solo alemán
    const languages = 'deu'

    const { languages: validatedLanguages } = uploadSchema.parse({ languages: 'deu' })

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const imageBuffer = Buffer.from(buffer)

    // 1) Validar imagen básicamente
    const maxSize = 10 * 1024 * 1024
    if (imageBuffer.length > maxSize) {
      return NextResponse.json(
        { error: 'Image too large (max 10MB)' },
        { status: 400 }
      )
    }

    // 2) Preprocesar con método optimizado
    console.log('Preprocessing image...')
    const processedBuffer = await preprocessForOCR(imageBuffer)

    // 3) OCR híbrido (Tesseract + TrOCR)
    console.log('Starting hybrid OCR (Tesseract + TrOCR)...')
    const ocrResult = await hybridOCREngine.processImage(processedBuffer)
    console.log(`OCR completed: ${ocrResult.method} with ${ocrResult.confidence}% confidence`)

    // 4) Parsing inteligente con IA local mejorado
    console.log('Parsing recipe with improved AI...')
    const aiResult = await aiRecipeParser.parseRecipeText(ocrResult.text)
    console.log(`AI parsing: ${aiResult.method} with ${aiResult.confidence}% confidence`)

    // 5) Mapear correctamente el formato del AI parser al formato esperado
    let finalParsed = {
      title: aiResult.title,
      ingredients: aiResult.ingredients.map(ing => {
        // Construir string del ingrediente con cantidad y unidad
        if (ing.quantity && ing.unit) {
          return `${ing.quantity} ${ing.unit} ${ing.item}`;
        } else if (ing.quantity) {
          return `${ing.quantity} ${ing.item}`;
        } else {
          return ing.item;
        }
      }),
      steps: aiResult.steps,
      servings: aiResult.servings?.toString(),
      totalTime: aiResult.totalTime
    }

    // Si no encuentra ingredientes/pasos, usar parser tradicional como backup
    if (finalParsed.ingredients.length === 0 && finalParsed.steps.length === 0) {
      console.log('AI found no results, using traditional parser as backup')
      const cleaned = fixCommonOcrErrors(ocrResult.text || '')
      const traditionalParsed = parseGermanRecipe(cleaned)

      finalParsed = {
        title: aiResult.title || traditionalParsed.title || 'Tiramisu-Rezept',
        ingredients: traditionalParsed.ingredients.length > 0 ? traditionalParsed.ingredients : finalParsed.ingredients,
        steps: traditionalParsed.steps.length > 0 ? traditionalParsed.steps : finalParsed.steps,
        servings: aiResult.servings?.toString() || (traditionalParsed.servings ? traditionalParsed.servings.toString() : undefined),
        totalTime: aiResult.totalTime
      }
      console.log('Used traditional parser as backup');
    }

    console.log(`Final parsed result - Title: "${finalParsed.title}", Ingredients: ${finalParsed.ingredients.length}, Steps: ${finalParsed.steps.length}`);
    console.log('Ingredients:', finalParsed.ingredients);
    console.log('Steps:', finalParsed.steps);

    // El parser simple siempre tiene buena confianza, no necesitamos backup
    console.log('Simple parser completed successfully!');

    const result = {
      text: ocrResult.text.trim(),
      parsed: finalParsed,
      metadata: {
        filename: file.name,
        size: file.size,
        processedAt: new Date().toISOString(),
        languages: validatedLanguages,
        ocrMethod: ocrResult.method,
        ocrConfidence: ocrResult.confidence,
        parsingMethod: aiResult.method,
        parsingConfidence: aiResult.confidence,
        processingTime: ocrResult.processingTime
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('OCR processing error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process image', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
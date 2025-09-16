'use client'

import { useState } from 'react'
import { UploadForm } from '@/components/upload-form'
import { RecipeResult } from '@/components/recipe-result'
import { OCRResult } from '@/lib/types'

export default function Home() {
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOCRResult = (result: OCRResult) => {
    setOcrResult(result)
    setIsProcessing(false)
  }

  const handleProcessingStart = () => {
    setIsProcessing(true)
    setOcrResult(null)
  }

  const handleReset = () => {
    setOcrResult(null)
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Rezept-Digitalisierer
          </h1>
          <p className="text-lg text-gray-600">
            Laden Sie ein Foto Ihres Rezepts hoch und wandeln Sie es automatisch in bearbeitbaren Text um
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {!ocrResult && !isProcessing && (
            <UploadForm
              onResult={handleOCRResult}
              onProcessingStart={handleProcessingStart}
            />
          )}

          {isProcessing && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">
                Bild wird mit OCR verarbeitet...
              </p>
            </div>
          )}

          {ocrResult && (
            <RecipeResult
              result={ocrResult}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  )
}

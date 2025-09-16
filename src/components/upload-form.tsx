'use client'

import { useState, useRef } from 'react'
import { OCRResult } from '@/lib/types'

interface UploadFormProps {
  onResult: (result: OCRResult) => void
  onProcessingStart: () => void
}

export function UploadForm({ onResult, onProcessingStart }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [languages, setLanguages] = useState('deu')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    onProcessingStart()

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('languages', languages)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutos timeout

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result: OCRResult = await response.json()
      onResult(result)
    } catch (error) {
      console.error('Upload error:', error)
      let message = 'Error desconocido'

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'El procesamiento tardó demasiado tiempo (timeout)'
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          message = 'Error de conexión. Verifica que el servidor esté funcionando.'
        } else {
          message = error.message
        }
      }

      alert(`Error procesando la imagen: ${message}`)
      // Reset processing state on error
      onResult({
        text: '',
        parsed: { ingredients: [], steps: [] },
        metadata: {
          filename: selectedFile.name,
          size: selectedFile.size,
          processedAt: new Date().toISOString(),
          languages
        }
      })
    }
  }

  const resetFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sprachen für OCR
        </label>
        <select
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled
        >
          <option value="deu">Nur Deutsch</option>
        </select>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <>
            <div className="text-6xl text-gray-400 mb-4">📷</div>
            <p className="text-lg text-gray-600 mb-2">
              Ziehen Sie ein Bild hierher oder klicken Sie zum Auswählen
            </p>
            <p className="text-sm text-gray-500">
              Unterstützte Formate: JPG, PNG, WebP, GIF (max. 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl text-green-600 mb-2">✓</div>
            <p className="text-lg font-medium text-gray-900">
              Datei ausgewählt:
            </p>
            <p className="text-sm text-gray-600">
              {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
            </p>
            <button
              type="button"
              onClick={resetFile}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Datei ändern
            </button>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Rezept mit OCR verarbeiten
          </button>
          <button
            type="button"
            onClick={resetFile}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">💡 Tipps für bessere Ergebnisse:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Verwenden Sie gute Beleuchtung, vermeiden Sie Schatten</li>
          <li>• Halten Sie das Bild gerade und scharf</li>
          <li>• Stellen Sie sicher, dass der Text lesbar ist</li>
          <li>• Vermeiden Sie Reflexionen oder Glanz auf dem Papier</li>
        </ul>
      </div>
    </form>
  )
}
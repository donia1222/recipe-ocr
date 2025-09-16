'use client'

import { useState } from 'react'
import { OCRResult, CreateRecipeData } from '@/lib/types'

interface RecipeResultProps {
  result: OCRResult
  onReset: () => void
}

export function RecipeResult({ result, onReset }: RecipeResultProps) {
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw'>('parsed')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSaveRecipe = async () => {
    if (!result.parsed.title || result.parsed.ingredients.length === 0) {
      alert('Das Rezept benötigt mindestens einen Titel und Zutaten zum Speichern')
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const recipeData: CreateRecipeData = {
        title: result.parsed.title,
        servings: result.parsed.servings ? parseInt(result.parsed.servings) : undefined,
        totalTime: result.parsed.totalTime,
        notes: 'Mit OCR digitalisiertes Rezept',
        ingredients: result.parsed.ingredients.map((item, index) => ({
          sortOrder: index,
          quantityRaw: item,
          item: item,
        })),
        steps: result.parsed.steps.map((step, index) => ({
          sortOrder: index,
          text: step,
        })),
        categories: ['OCR']
      }

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save recipe')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Save error:', error)
      alert('Fehler beim Speichern des Rezepts: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
    } finally {
      setIsSaving(false)
    }
  }

  const downloadText = () => {
    const content = activeTab === 'parsed' ? formatParsedRecipe() : result.text
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rezept-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatParsedRecipe = () => {
    let formatted = ''
    if (result.parsed.title) formatted += `# ${result.parsed.title}\n\n`
    if (result.parsed.servings) formatted += `**Portionen:** ${result.parsed.servings}\n`
    if (result.parsed.totalTime) formatted += `**Zeit:** ${result.parsed.totalTime}\n\n`

    if (result.parsed.ingredients.length > 0) {
      formatted += '## Zutaten\n'
      result.parsed.ingredients.forEach(ingredient => {
        formatted += `- ${ingredient}\n`
      })
      formatted += '\n'
    }

    if (result.parsed.steps.length > 0) {
      formatted += '## Zubereitung\n'
      result.parsed.steps.forEach((step, index) => {
        formatted += `${index + 1}. ${step}\n`
      })
    }

    return formatted
  }

  return (
    <div className="space-y-8 bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            📄 OCR-Ergebnis
          </h2>
          <p className="text-gray-600">Ihre digitalisierte Rezept</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          ← Weiteres Bild verarbeiten
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('parsed')}
          className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
            activeTab === 'parsed'
              ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-700'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          🍽️ Strukturiertes Rezept
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
            activeTab === 'raw'
              ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-700'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          📝 Originaltext
        </button>
      </div>

      {activeTab === 'parsed' && (
        <div className="space-y-8">
          {result.parsed.title && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                👨‍🍳 {result.parsed.title}
              </h3>
              <div className="flex gap-6 text-base">
                {result.parsed.servings && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg">
                    <span className="text-orange-600">🍽️</span>
                    <span className="font-medium text-gray-700">{result.parsed.servings} Portionen</span>
                  </div>
                )}
                {result.parsed.totalTime && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg">
                    <span className="text-blue-600">⏱️</span>
                    <span className="font-medium text-gray-700">{result.parsed.totalTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.parsed.ingredients.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                🥗 Zutaten
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                  {result.parsed.ingredients.length}
                </span>
              </h4>
              <div className="grid gap-3">
                {result.parsed.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-green-100">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span className="text-gray-800 font-medium flex-1">{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.parsed.steps.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                👨‍🍳 Zubereitung
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  {result.parsed.steps.length} Schritte
                </span>
              </h4>
              <div className="space-y-4">
                {result.parsed.steps.map((step, index) => (
                  <div key={index} className="flex gap-4 bg-white p-4 rounded-lg border border-blue-100">
                    <div className="bg-blue-600 text-white text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.parsed.ingredients.length === 0 && result.parsed.steps.length === 0 && (
            <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="text-6xl mb-4">🤔</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Keine Struktur erkannt</h3>
              <p className="text-gray-600 mb-4">Zutaten oder Schritte konnten nicht automatisch extrahiert werden.</p>
              <p className="text-sm text-gray-500">💡 Tipp: Überprüfen Sie den Originaltext-Tab, um zu sehen, was erkannt wurde.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">
            Vollständig extrahierter Text
          </h4>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {result.text || 'Kein Text im Bild erkannt.'}
            </pre>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
        <button
          onClick={handleSaveRecipe}
          disabled={isSaving || !result.parsed.title}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-xl hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Speichern...
            </>
          ) : (
            <>💾 Rezept speichern</>
          )}
        </button>

        <button
          onClick={downloadText}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          📥 Als Text herunterladen
        </button>

        {saveSuccess && (
          <div className="flex items-center text-green-600 font-semibold bg-green-50 px-4 py-3 rounded-xl border border-green-200">
            <span className="text-xl mr-2">✅</span>
            Rezept erfolgreich gespeichert!
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <p>
          <strong>Verarbeitet:</strong> {new Date(result.metadata?.processedAt || '').toLocaleString('de-DE')} |
          <strong> Sprachen:</strong> {result.metadata?.languages || 'N/A'}
        </p>
      </div>
    </div>
  )
}
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FileRecipeRepository } from '@/lib/repository/file-recipe-repository'

const createRecipeSchema = z.object({
  title: z.string().min(1),
  servings: z.number().positive().optional(),
  totalTime: z.string().optional(),
  notes: z.string().optional(),
  ingredients: z.array(z.object({
    sortOrder: z.number(),
    quantityRaw: z.string(),
    unit: z.string().optional(),
    item: z.string().min(1),
    notes: z.string().optional(),
    qtyNumber: z.number().optional(),
    baseUnit: z.string().optional()
  })),
  steps: z.array(z.object({
    sortOrder: z.number(),
    text: z.string().min(1)
  })),
  categories: z.array(z.string()).optional()
})

const repository = new FileRecipeRepository()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createRecipeSchema.parse(body)

    const recipe = await repository.create(validatedData)

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('Create recipe error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid recipe data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined

    const recipes = await repository.list({ search, category })

    return NextResponse.json(recipes)
  } catch (error) {
    console.error('List recipes error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve recipes' },
      { status: 500 }
    )
  }
}
export interface Recipe {
  id: string
  title: string
  servings?: number
  totalTime?: string
  notes?: string
  status: 'draft' | 'pending' | 'approved'
  createdAt: Date
  updatedAt: Date
  images: RecipeImage[]
  ingredients: Ingredient[]
  steps: Step[]
  categories: string[]
}

export interface RecipeImage {
  id: string
  recipeId: string
  url: string
  kind: 'cover' | 'step' | 'extra'
  sortOrder: number
}

export interface Ingredient {
  id: string
  recipeId: string
  sortOrder: number
  quantityRaw: string
  unit?: string
  item: string
  notes?: string
  qtyNumber?: number
  baseUnit?: string
}

export interface Step {
  id: string
  recipeId: string
  sortOrder: number
  text: string
}

export interface OCRResult {
  text: string
  parsed: {
    title?: string
    ingredients: string[]
    steps: string[]
    servings?: string
    totalTime?: string
  }
}

export interface CreateRecipeData {
  title: string
  servings?: number
  totalTime?: string
  notes?: string
  ingredients: Omit<Ingredient, 'id' | 'recipeId'>[]
  steps: Omit<Step, 'id' | 'recipeId'>[]
  categories?: string[]
}
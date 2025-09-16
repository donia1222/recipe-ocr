import { Recipe, CreateRecipeData } from '../types'

export interface RecipeRepository {
  create(data: CreateRecipeData): Promise<Recipe>
  findById(id: string): Promise<Recipe | null>
  list(filters?: { search?: string; category?: string }): Promise<Recipe[]>
  update(id: string, data: Partial<CreateRecipeData>): Promise<Recipe | null>
  delete(id: string): Promise<boolean>
}
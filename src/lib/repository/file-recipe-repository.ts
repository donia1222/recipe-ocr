import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Recipe, CreateRecipeData, Ingredient, Step } from '../types'
import { RecipeRepository } from './recipe-repository'

export class FileRecipeRepository implements RecipeRepository {
  private dataDir = path.join(process.cwd(), 'data', 'recipes')

  constructor() {
    this.ensureDataDir()
  }

  private async ensureDataDir() {
    try {
      await fs.access(this.dataDir)
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true })
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.dataDir, `${id}.json`)
  }

  async create(data: CreateRecipeData): Promise<Recipe> {
    const id = uuidv4()
    const now = new Date()

    const ingredients: Ingredient[] = data.ingredients.map((ing, index) => ({
      id: uuidv4(),
      recipeId: id,
      sortOrder: index,
      ...ing
    }))

    const steps: Step[] = data.steps.map((step, index) => ({
      id: uuidv4(),
      recipeId: id,
      sortOrder: index,
      ...step
    }))

    const recipe: Recipe = {
      id,
      title: data.title,
      servings: data.servings,
      totalTime: data.totalTime,
      notes: data.notes,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      images: [],
      ingredients,
      steps,
      categories: data.categories || []
    }

    const filePath = this.getFilePath(id)
    await fs.writeFile(filePath, JSON.stringify(recipe, null, 2))

    return recipe
  }

  async findById(id: string): Promise<Recipe | null> {
    try {
      const filePath = this.getFilePath(id)
      const content = await fs.readFile(filePath, 'utf-8')
      const recipe = JSON.parse(content) as Recipe

      recipe.createdAt = new Date(recipe.createdAt)
      recipe.updatedAt = new Date(recipe.updatedAt)

      return recipe
    } catch {
      return null
    }
  }

  async list(filters?: { search?: string; category?: string }): Promise<Recipe[]> {
    try {
      const files = await fs.readdir(this.dataDir)
      const jsonFiles = files.filter(file => file.endsWith('.json'))

      const recipes = await Promise.all(
        jsonFiles.map(async (file) => {
          const content = await fs.readFile(path.join(this.dataDir, file), 'utf-8')
          const recipe = JSON.parse(content) as Recipe
          recipe.createdAt = new Date(recipe.createdAt)
          recipe.updatedAt = new Date(recipe.updatedAt)
          return recipe
        })
      )

      let filteredRecipes = recipes

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredRecipes = filteredRecipes.filter(recipe =>
          recipe.title.toLowerCase().includes(searchTerm) ||
          recipe.ingredients.some(ing =>
            ing.item.toLowerCase().includes(searchTerm)
          )
        )
      }

      if (filters?.category) {
        filteredRecipes = filteredRecipes.filter(recipe =>
          recipe.categories.includes(filters.category!)
        )
      }

      return filteredRecipes.sort((a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime()
      )
    } catch {
      return []
    }
  }

  async update(id: string, data: Partial<CreateRecipeData>): Promise<Recipe | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const now = new Date()
    let ingredients = existing.ingredients
    let steps = existing.steps

    if (data.ingredients) {
      ingredients = data.ingredients.map((ing, index) => ({
        id: uuidv4(),
        recipeId: id,
        sortOrder: index,
        ...ing
      }))
    }

    if (data.steps) {
      steps = data.steps.map((step, index) => ({
        id: uuidv4(),
        recipeId: id,
        sortOrder: index,
        ...step
      }))
    }

    const updated: Recipe = {
      ...existing,
      ...data,
      ingredients,
      steps,
      updatedAt: now
    }

    const filePath = this.getFilePath(id)
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2))

    return updated
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id)
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  }
}
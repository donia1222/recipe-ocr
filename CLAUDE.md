# Recipe OCR - Digitalizador de Recetas

## 📋 Descripción del Proyecto

Aplicación web desarrollada en **Next.js con TypeScript** que permite digitalizar recetas desde imágenes utilizando **OCR gratuito (Tesseract.js)**. El proyecto está diseñado para trabajar completamente en local y preparado para migrar posteriormente a una arquitectura PHP + MySQL.

## 🎯 Objetivo

**Fase 1 (Actual):** Digitalización de recetas usando OCR gratuito
- Solo funcionalidad OCR local con Next.js
- Persistencia temporal en archivos JSON
- Arquitectura preparada para migración futura

**Fases Futuras:**
- **Fase 2:** Migración a PHP + MySQL backend
- **Fase 3:** Funcionalidades avanzadas (roles, escalado, publicación)

## 🛠️ Stack Tecnológico

### Frontend & Backend (Actual)
- **Next.js 15** con App Router
- **TypeScript** para tipado estático
- **Tailwind CSS** para estilos
- **Tesseract.js** para OCR multiidioma
- **Sharp** para preprocesado de imágenes
- **Zod** para validación de datos

### Persistencia (Actual)
- **Sistema de archivos** (JSON + uploads)
- **FileRecipeRepository** como abstracción

### Futuro (Fase 2)
- **PHP** (Slim/Laravel/Lumen)
- **MySQL** con esquema predefinido
- **API REST** para comunicación

## 🏗️ Arquitectura del Proyecto

```
/recipe-ocr
├── /src
│   ├── /app                    # Pages y API routes (App Router)
│   │   ├── page.tsx           # Página principal
│   │   └── /api
│   │       ├── /ocr           # Endpoint OCR
│   │       └── /recipes       # CRUD recetas
│   ├── /components            # Componentes React
│   │   ├── upload-form.tsx    # Formulario de subida
│   │   └── recipe-result.tsx  # Resultados OCR
│   └── /lib                   # Lógica de negocio
│       ├── types.ts           # Tipos TypeScript
│       ├── /ocr               # Procesamiento OCR
│       │   ├── image-processor.ts
│       │   └── text-parser.ts
│       └── /repository        # Abstracción de datos
│           ├── recipe-repository.ts
│           └── file-recipe-repository.ts
├── /data
│   └── /recipes               # JSONs temporales
├── /uploads                   # Imágenes procesadas
└── CLAUDE.md                  # Esta documentación
```

## 🚀 Instalación y Uso

### Prerequisitos
```bash
Node.js 18+
npm 10+
```

### Instalación
```bash
# Clonar e instalar dependencias
cd recipe-ocr
npm install

# Crear directorios necesarios (si no existen)
mkdir -p data/recipes uploads
```

### Desarrollo
```bash
# Servidor de desarrollo
npm run dev

# Build para producción
npm run build
npm start

# Linting y verificación de tipos
npm run lint
npm run type-check  # Si está configurado
```

### Uso de la Aplicación

1. **Acceder a la aplicación:** `http://localhost:3000`

2. **Subir imagen de receta:**
   - Arrastra imagen o usa el selector
   - Elige idiomas para OCR (español, inglés, alemán)
   - Haz clic en "Procesar Receta con OCR"

3. **Revisar resultados:**
   - **Vista estructurada:** ingredientes y pasos separados
   - **Vista raw:** texto completo extraído
   - Guardar receta en JSON local
   - Descargar como archivo de texto

## 🔧 Funcionalidades Implementadas

### ✅ OCR y Procesamiento
- **Multiidioma:** español + inglés + alemán
- **Preprocesado de imagen:** rotación, escala de grises, normalización
- **Parsing inteligente:** extrae título, ingredientes, pasos, porciones, tiempo
- **Validación de archivos:** formatos soportados, tamaño máximo

### ✅ Interfaz de Usuario
- **Drag & drop** para subir imágenes
- **Loading states** durante procesamiento
- **Tabs** para ver resultados estructurados vs texto crudo
- **Descarga** de resultados en formato texto
- **Consejos** para mejores resultados OCR

### ✅ Persistencia Local
- **Guardado en JSON** con estructura preparada para MySQL
- **Repository pattern** para fácil migración
- **UUIDs** para identificadores únicos
- **Timestamping** automático

## 📊 Esquema de Datos (Preparado para MySQL)

### Tablas Futuras
```sql
-- Recetas principales
CREATE TABLE recipes (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  servings INT,
  total_time VARCHAR(100),
  notes TEXT,
  status ENUM('draft', 'pending', 'approved') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ingredientes
CREATE TABLE ingredients (
  id VARCHAR(36) PRIMARY KEY,
  recipe_id VARCHAR(36) NOT NULL,
  sort_order INT NOT NULL,
  quantity_raw VARCHAR(255),
  unit VARCHAR(50),
  item VARCHAR(255) NOT NULL,
  notes TEXT,
  qty_number DECIMAL(10,2),
  base_unit VARCHAR(50),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Pasos de preparación
CREATE TABLE steps (
  id VARCHAR(36) PRIMARY KEY,
  recipe_id VARCHAR(36) NOT NULL,
  sort_order INT NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Categorías e imágenes (futuras)
-- CREATE TABLE categories, recipe_categories, recipe_images...
```

## 🔄 Plan de Migración a PHP + MySQL

### Fase 2: Backend PHP
1. **Instalar stack:** PHP + MySQL + Composer
2. **Crear API REST:** endpoints CRUD para recetas
3. **Migrar OCR:** usar `tesseract-ocr` CLI + wrapper PHP
4. **Cambiar repositorio:** de FileRepository a MySQLRepository
5. **Mantener frontend:** Next.js como cliente de la API PHP

### Comandos de Migración
```bash
# Crear proyecto PHP
composer create-project slim/slim-skeleton recipe-api
# o
composer create-project laravel/lumen recipe-api

# Instalar dependencias OCR
sudo apt-get install tesseract-ocr tesseract-ocr-spa tesseract-ocr-deu
composer require thiagoalessio/tesseract_ocr
```

## 📝 Notas de Desarrollo

### Mejores Prácticas OCR
- **Iluminación:** evitar sombras y reflejos
- **Orientación:** mantener texto recto y legible
- **Calidad:** imágenes nítidas, evitar desenfoques
- **Formato:** JPG/PNG con buena resolución

### Configuración Tesseract
- **PSM (Page Segmentation Mode):** SINGLE_BLOCK para recetas
- **Whitelist de caracteres:** incluye acentos españoles y alemanes
- **Idiomas combinados:** spa+eng+deu para máxima precisión

### Arquitectura de Código
- **Repository Pattern:** abstrae persistencia para fácil migración
- **Separation of Concerns:** OCR, parsing y UI en módulos separados
- **Type Safety:** TypeScript en todo el stack frontend
- **Error Handling:** validación con Zod y manejo de errores robusto

## 🐛 Troubleshooting

### Problemas Comunes
- **OCR lento:** normal en primera ejecución (descarga modelos)
- **Texto mal reconocido:** mejorar calidad de imagen
- **Upload falla:** verificar tamaño máximo (10MB)
- **Build errors:** verificar versiones Node.js y dependencias

### Performance
- **Modelos Tesseract:** se cachean después de primera carga
- **Preprocesado:** optimizado con Sharp para velocidad
- **Memory usage:** imágenes se procesan y eliminan automáticamente

---

## 💡 Ideas para Futuras Mejoras

1. **OCR Avanzado:**
   - Detección de tablas nutricionales
   - Reconocimiento de fracciones y medidas especiales
   - Support para más idiomas (francés, italiano)

2. **UI/UX:**
   - Preview de imagen antes de procesar
   - Edición inline de resultados
   - Historial de recetas procesadas

3. **Funcionalidades:**
   - Escalado automático de porciones
   - Conversión de unidades de medida
   - Categorización automática por ingredientes

4. **Integración:**
   - API de base de datos nutricional
   - Export a formatos populares (PDF, Word)
   - Sincronización con apps de recetas

---

**Proyecto creado con Claude Code - Fase 1 completada** ✅
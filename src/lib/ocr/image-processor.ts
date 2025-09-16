import sharp from 'sharp'

// ChatGPT's optimized preprocessing for German OCR
export async function preprocessForOCR(input: Buffer) {
  // 1) Rotación por EXIF + recorte de borde oscuro si lo hay
  let img = sharp(input, { limitInputPixels: 268402689 }) // ~16k x 16k
    .rotate()
    .trim({ threshold: 10 }); // recorta bordes uniformes, tolerancia 10

  // 2) Escalar para que el texto tenga ~200–300 DPI efectivos
  const meta = await img.metadata();
  const targetWidth = meta.width && meta.width > 2200 ? meta.width : 2200;
  img = img.resize({ width: targetWidth, withoutEnlargement: false });

  // 3) Gris + normalizar contraste + suavizar ruido
  img = img
    .grayscale()
    .normalize()      // estira histograma
    .median(1)        // quita granitos
    .blur(0.3)        // suaviza bordes duros previos

    // 4) Unsharp para definir trazos de letra
    .sharpen({
      sigma: 1.0,
      m1: 1.2,     // amount
      m2: 0,       // threshold
      x1: 2, y2: 10, y3: 20
    })

    // 5) Binarización (umbral global). Si la foto tiene sombras, prueba .threshold(140–180)
    .threshold(165, { grayscale: true });

  // 6) Salida PNG optimizada para OCR
  return await img.png({ compressionLevel: 9 }).toBuffer();
}

export class ImageProcessor {
  async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await preprocessForOCR(buffer)
    } catch (error) {
      console.error('Error preprocessing image:', error)
      // Fallback: procesamiento básico si falla el avanzado
      try {
        return await sharp(buffer)
          .rotate()
          .resize(null, 2000, { withoutEnlargement: true, fit: 'inside' })
          .grayscale()
          .normalize()
          .sharpen()
          .png({ compressionLevel: 9 })
          .toBuffer()
      } catch {
        throw new Error('Failed to preprocess image')
      }
    }
  }

  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata()

      if (!metadata.width || !metadata.height) {
        return false
      }

      const maxSize = 10 * 1024 * 1024
      if (buffer.length > maxSize) {
        return false
      }

      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif']
      if (!metadata.format || !supportedFormats.includes(metadata.format)) {
        return false
      }

      return true
    } catch {
      return false
    }
  }
}
import { put, del } from '@vercel/blob'
import sharp from 'sharp'
import { Logger } from './logger'

interface UploadOptions {
  folder?: string
  maxSize?: number // en bytes
  allowedTypes?: string[]
  optimize?: boolean
  generateThumbnail?: boolean
  thumbnailSize?: { width: number, height: number }
}

interface UploadResult {
  url: string
  fileName: string
  size: number
  type: string
  thumbnailUrl?: string
}

export class FileService {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  private static readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'text/plain']

  // Upload principal
  static async uploadFile(
    file: File | Buffer,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const {
        folder = 'uploads',
        maxSize = this.DEFAULT_MAX_SIZE,
        allowedTypes = [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_DOCUMENT_TYPES],
        optimize = true,
        generateThumbnail = false,
        thumbnailSize = { width: 300, height: 300 }
      } = options

      // Validation de taille
      const fileSize = file instanceof File ? file.size : Buffer.byteLength(file)
      if (fileSize > maxSize) {
        throw new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`)
      }

      // Validation de type
      const fileType = file instanceof File ? file.type : 'application/octet-stream'
      if (!allowedTypes.includes(fileType)) {
        throw new Error(`File type not allowed: ${fileType}`)
      }

      // Convertir en Buffer si nécessaire
      let buffer: Buffer
      if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer())
      } else {
        buffer = file
      }

      // Optimisation d'image
      if (optimize && this.isImageType(fileType)) {
        buffer = await this.optimizeImage(buffer)
      }

      // Upload du fichier principal
      const finalFileName = `${folder}/${Date.now()}-${fileName}`
      const blob = await put(finalFileName, buffer, {
        access: 'public',
        contentType: fileType
      })

      const result: UploadResult = {
        url: blob.url,
        fileName: finalFileName,
        size: buffer.length,
        type: fileType
      }

      // Génération de thumbnail si demandée
      if (generateThumbnail && this.isImageType(fileType)) {
        const thumbnailBuffer = await this.generateThumbnail(buffer, thumbnailSize)
        const thumbnailFileName = `${folder}/thumbs/${Date.now()}-thumb-${fileName}`
        
        const thumbnailBlob = await put(thumbnailFileName, thumbnailBuffer, {
          access: 'public',
          contentType: 'image/webp'
        })
        
        result.thumbnailUrl = thumbnailBlob.url
      }

      Logger.info(`File uploaded successfully`, {
        fileName: finalFileName,
        size: fileSize,
        type: fileType
      })

      return result

    } catch (error) {
      Logger.error('File upload failed', error)
      throw error
    }
  }

  // Upload multiple files
  static async uploadMultiple(
    files: (File | Buffer)[],
    fileNames: string[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const promises = files.map((file, index) => 
      this.uploadFile(file, fileNames[index], options)
    )

    const results = await Promise.allSettled(promises)
    
    const successful = results
      .filter((r): r is PromiseFulfilledResult<UploadResult> => r.status === 'fulfilled')
      .map(r => r.value)
    
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason)

    if (failed.length > 0) {
      Logger.warn(`Some files failed to upload`, { failedCount: failed.length })
    }

    return successful
  }

  // Supprimer un fichier
  static async deleteFile(url: string): Promise<void> {
    try {
      await del(url)
      Logger.info(`File deleted: ${url}`)
    } catch (error) {
      Logger.error(`Failed to delete file: ${url}`, error)
      throw error
    }
  }

  // Optimiser une image
  private static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(2048, 2048, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer()
    } catch (error) {
      Logger.warn('Image optimization failed, using original', error)
      return buffer
    }
  }

  // Générer un thumbnail
  private static async generateThumbnail(
    buffer: Buffer, 
    size: { width: number, height: number }
  ): Promise<Buffer> {
    return await sharp(buffer)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toBuffer()
  }

  // Vérifier si c'est une image
  private static isImageType(mimeType: string): boolean {
    return this.ALLOWED_IMAGE_TYPES.includes(mimeType)
  }

  // Convertir taille en format lisible
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Valider un fichier avant upload
  static validateFile(
    file: File,
    options: Pick<UploadOptions, 'maxSize' | 'allowedTypes'> = {}
  ): { valid: boolean, error?: string } {
    const {
      maxSize = this.DEFAULT_MAX_SIZE,
      allowedTypes = [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_DOCUMENT_TYPES]
    } = options

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Fichier trop volumineux. Taille max: ${this.formatFileSize(maxSize)}`
      }
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Type de fichier non autorisé: ${file.type}`
      }
    }

    return { valid: true }
  }
}
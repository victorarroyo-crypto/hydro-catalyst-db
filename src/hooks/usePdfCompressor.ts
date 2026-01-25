import { PDFDocument } from "pdf-lib";

interface CompressionResult {
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

interface CompressionOptions {
  removeMetadata?: boolean;
}

/**
 * Comprime un PDF usando pdf-lib:
 * - useObjectStreams: true para reducir tamaño estructural
 * - Limpieza de metadatos innecesarios
 */
export async function compressPdf(
  file: File,
  options: CompressionOptions = { removeMetadata: true }
): Promise<CompressionResult> {
  console.log("[PDF-COMPRESSOR] Starting compression for:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2), "MB");
  
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  
  // Limpiar metadatos innecesarios para reducir tamaño
  if (options.removeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }
  
  // Guardar con object streams para compresión estructural
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,  // Reduce tamaño de estructura interna (~10-30%)
    addDefaultPage: false,
    objectsPerTick: 50,      // Evitar bloquear UI
  });
  
  // Crear Blob directamente desde Uint8Array
  const compressedBlob = new Blob([new Uint8Array(compressedBytes)], { type: 'application/pdf' });
  const compressionRatio = ((file.size - compressedBlob.size) / file.size) * 100;
  
  console.log(`[PDF-COMPRESSOR] Compression complete: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% reducción)`);
  
  return {
    compressedBlob,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
    compressionRatio,
  };
}

export function usePdfCompressor() {
  return { compressPdf };
}

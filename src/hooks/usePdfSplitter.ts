import { PDFDocument } from "pdf-lib";

const MAX_PAGES_PER_PART = 20;
const MAX_SIZE_FOR_SINGLE_UPLOAD = 8 * 1024 * 1024; // 8MB - files larger than this get split

interface SplitResult {
  parts: { blob: Blob; name: string; pageRange: string }[];
  totalPages: number;
  wasSplit: boolean;
}

export async function splitPdfIfNeeded(file: File): Promise<SplitResult> {
  console.log("[PDF-SPLITTER] Starting PDF analysis:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2), "MB");
  
  // Load the PDF with error handling
  let pdfDoc;
  let arrayBuffer;
  
  try {
    arrayBuffer = await file.arrayBuffer();
    console.log("[PDF-SPLITTER] ArrayBuffer loaded, size:", arrayBuffer.byteLength);
  } catch (bufferError) {
    console.error("[PDF-SPLITTER] Error reading file buffer:", bufferError);
    throw new Error(`No se pudo leer el archivo: ${bufferError instanceof Error ? bufferError.message : 'Error desconocido'}`);
  }
  
  try {
    // Use ignoreEncryption to handle some problematic PDFs
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    console.log("[PDF-SPLITTER] PDF loaded successfully");
  } catch (pdfError) {
    console.error("[PDF-SPLITTER] Error parsing PDF:", pdfError);
    throw new Error(`El PDF está corrupto o tiene un formato no compatible: ${pdfError instanceof Error ? pdfError.message : 'Error de parsing'}`);
  }
  
  const totalPages = pdfDoc.getPageCount();
  console.log("[PDF-SPLITTER] Total pages:", totalPages);
  
  const baseName = file.name.replace(/\.pdf$/i, "");
  
  // If small file and few pages, no need to split
  if (file.size <= MAX_SIZE_FOR_SINGLE_UPLOAD && totalPages <= MAX_PAGES_PER_PART) {
    console.log("[PDF-SPLITTER] No split needed - file is small enough");
    return {
      parts: [{ blob: file, name: file.name, pageRange: `1-${totalPages}` }],
      totalPages,
      wasSplit: false,
    };
  }
  
  // Calculate number of parts needed
  const numParts = Math.ceil(totalPages / MAX_PAGES_PER_PART);
  console.log("[PDF-SPLITTER] Splitting into", numParts, "parts");
  const parts: SplitResult["parts"] = [];
  
  for (let i = 0; i < numParts; i++) {
    const startPage = i * MAX_PAGES_PER_PART;
    const endPage = Math.min(startPage + MAX_PAGES_PER_PART, totalPages);
    
    console.log(`[PDF-SPLITTER] Creating part ${i + 1}/${numParts} (pages ${startPage + 1}-${endPage})`);
    
    try {
      // Create a new PDF with just these pages
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: endPage - startPage },
        (_, idx) => startPage + idx
      );
      
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: "application/pdf" });
      
      const partName = `${baseName}_parte${i + 1}de${numParts}.pdf`;
      const pageRange = `${startPage + 1}-${endPage}`;
      
      parts.push({ blob, name: partName, pageRange });
      console.log(`[PDF-SPLITTER] Part ${i + 1} created successfully, size:`, (blob.size / 1024).toFixed(2), "KB");
    } catch (partError) {
      console.error(`[PDF-SPLITTER] Error creating part ${i + 1}:`, partError);
      throw new Error(`Error al crear parte ${i + 1} del PDF: ${partError instanceof Error ? partError.message : 'Error desconocido'}`);
    }
  }
  
  console.log("[PDF-SPLITTER] Split complete:", parts.length, "parts created");
  return { parts, totalPages, wasSplit: true };
}

export function usePdfSplitter() {
  return { splitPdfIfNeeded };
}

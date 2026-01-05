import { PDFDocument } from "pdf-lib";

const MAX_PAGES_PER_PART = 20;
const MAX_SIZE_FOR_SINGLE_UPLOAD = 8 * 1024 * 1024; // 8MB - files larger than this get split

interface SplitResult {
  parts: { blob: Blob; name: string; pageRange: string }[];
  totalPages: number;
  wasSplit: boolean;
}

export async function splitPdfIfNeeded(file: File): Promise<SplitResult> {
  // Load the PDF
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  const baseName = file.name.replace(/\.pdf$/i, "");
  
  // If small file and few pages, no need to split
  if (file.size <= MAX_SIZE_FOR_SINGLE_UPLOAD && totalPages <= MAX_PAGES_PER_PART) {
    return {
      parts: [{ blob: file, name: file.name, pageRange: `1-${totalPages}` }],
      totalPages,
      wasSplit: false,
    };
  }
  
  // Calculate number of parts needed
  const numParts = Math.ceil(totalPages / MAX_PAGES_PER_PART);
  const parts: SplitResult["parts"] = [];
  
  for (let i = 0; i < numParts; i++) {
    const startPage = i * MAX_PAGES_PER_PART;
    const endPage = Math.min(startPage + MAX_PAGES_PER_PART, totalPages);
    
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
  }
  
  return { parts, totalPages, wasSplit: true };
}

export function usePdfSplitter() {
  return { splitPdfIfNeeded };
}

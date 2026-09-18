// AI receipt scanner (STUB).
//
// This simulates extracting expense fields from a receipt image so the
// full UI flow works end-to-end. Replace the body of scanReceipt() with a
// real call to an OCR / vision model (e.g. Tesseract.js, or a hosted
// vision API) when you're ready. Keep the same return shape.

/**
 * Simulate scanning a receipt image and extracting expense fields.
 * @param {File} file The uploaded receipt image.
 * @returns {Promise<{ amount: number, description: string, date: string }>}
 */
export async function scanReceipt(file) {
  // Simulate network / processing latency.
  await new Promise((resolve) => setTimeout(resolve, 1200))

  // --- STUBBED RESULT ---
  // A real implementation would parse `file` and return actual values.
  // We derive a plausible placeholder so the UI is clearly populated.
  const fakeAmount = Math.round((Math.random() * 90 + 5) * 100) / 100
  const today = new Date().toISOString().slice(0, 10)

  return {
    amount: fakeAmount,
    description: `Scanned: ${file.name.replace(/\.[^.]+$/, '')}`,
    date: today,
  }
}

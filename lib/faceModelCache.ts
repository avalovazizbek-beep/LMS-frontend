/* Module-level state — persists across React re-renders and SPA navigation */
let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

const MODEL_URL = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/models`

export async function ensureFaceModels(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const fa = (window as any).faceapi
  if (!fa) throw new Error("face-api.js yuklanmagan")

  const TOTAL = 3

  if (
    fa.nets.tinyFaceDetector.isLoaded &&
    fa.nets.faceLandmark68Net.isLoaded &&
    fa.nets.faceRecognitionNet.isLoaded
  ) {
    modelsLoaded = true
    onProgress?.(TOTAL, TOTAL)
    return
  }

  if (modelsLoaded) return

  if (loadingPromise) return loadingPromise

  // Uch modelni PARALLEL yuklaymiz (avval ketma-ket edi) — sekin mobil
  // tarmoqda bu round-trip vaqtini deyarli 3x kamaytiradi, chunki uchtasi
  // ham bir-biriga bog'liq bo'lmagan alohida fayl so'rovlari.
  loadingPromise = (async () => {
    let loaded = 0
    function markLoaded() { loaded++; onProgress?.(loaded, TOTAL) }
    function loadNet(net: { isLoaded: boolean; loadFromUri: (url: string) => Promise<void> }) {
      if (net.isLoaded) { markLoaded(); return Promise.resolve() }
      return net.loadFromUri(MODEL_URL).then(markLoaded)
    }

    await Promise.all([
      loadNet(fa.nets.tinyFaceDetector),
      loadNet(fa.nets.faceLandmark68Net),
      loadNet(fa.nets.faceRecognitionNet),
    ])
    modelsLoaded = true
  })()

  return loadingPromise
}

export function areFaceModelsLoaded(): boolean {
  const fa = (window as any).faceapi
  if (!fa) return false
  return !!(
    fa.nets.tinyFaceDetector.isLoaded &&
    fa.nets.faceLandmark68Net.isLoaded &&
    fa.nets.faceRecognitionNet.isLoaded
  )
}

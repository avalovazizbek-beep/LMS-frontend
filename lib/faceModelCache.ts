/* Module-level state — persists across React re-renders and SPA navigation */
let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

const MODEL_URL = "/models"

export async function ensureFaceModels(): Promise<void> {
  const fa = (window as any).faceapi
  if (!fa) throw new Error("face-api.js yuklanmagan")

  if (
    fa.nets.tinyFaceDetector.isLoaded &&
    fa.nets.faceLandmark68Net.isLoaded &&
    fa.nets.faceRecognitionNet.isLoaded
  ) {
    modelsLoaded = true
    return
  }

  if (modelsLoaded) return

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    if (!fa.nets.tinyFaceDetector.isLoaded)
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    if (!fa.nets.faceLandmark68Net.isLoaded)
      await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    if (!fa.nets.faceRecognitionNet.isLoaded)
      await fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
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

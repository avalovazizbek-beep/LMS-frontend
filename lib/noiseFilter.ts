import { RnnoiseWorkletNode, loadRnnoise } from "@sapphi-red/web-noise-suppressor"

/**
 * Meeting mikrofoni uchun shovqin filtri: brauzerning o'z aks-sado
 * bekor qiluvchisidan (getUserMedia echoCancellation) keyin
 *   80 Hz dan past g'uvillashni kesish (fan, konditsioner, stol taqillashi)
 *   → RNNoise (neyron tarmoq: klaviatura, ko'cha, xona shovqinini olib tashlaydi).
 * Worklet va wasm fayllari `public/noise-suppressor/` da — paket versiyasi
 * (package.json'da qat'iy 0.4.1) bilan bir xil bo'lishi shart.
 *
 * Filtr ishlamasa (eski brauzer, AudioWorklet yo'q, wasm yuklanmadi) —
 * xato bermaydi, mikrofon filtrsiz ishlayveradi.
 */

const BASE = "/noise-suppressor"
let wasmPromise: Promise<ArrayBuffer> | null = null

function loadWasm(): Promise<ArrayBuffer> {
  if (!wasmPromise) {
    wasmPromise = loadRnnoise({ url: `${BASE}/rnnoise.wasm`, simdUrl: `${BASE}/rnnoise_simd.wasm` })
    wasmPromise.catch(() => { wasmPromise = null })
  }
  return wasmPromise
}

async function filterTrack(raw: MediaStreamTrack): Promise<MediaStreamTrack> {
  // RNNoise 48 kHz'ni kutadi
  const ctx = new AudioContext({ sampleRate: 48000 })
  try {
    const [wasmBinary] = await Promise.all([loadWasm(), ctx.audioWorklet.addModule(`${BASE}/rnnoiseWorklet.js`)])
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined)

    const source = ctx.createMediaStreamSource(new MediaStream([raw]))
    const highpass = ctx.createBiquadFilter()
    highpass.type = "highpass"
    highpass.frequency.value = 80
    const rnnoise = new RnnoiseWorkletNode(ctx, { wasmBinary, maxChannels: 1 })
    const destination = ctx.createMediaStreamDestination()
    source.connect(highpass).connect(rnnoise).connect(destination)

    const filtered = destination.stream.getAudioTracks()[0]
    if (!filtered) throw new Error("no filtered track")

    // Filtrlangan trek to'xtatilganda asl mikrofon va AudioContext ham
    // yopilishi kerak — aks holda mikrofon brauzerda "band" qolib ketadi.
    const stopFiltered = filtered.stop.bind(filtered)
    filtered.stop = () => {
      stopFiltered()
      raw.stop()
      rnnoise.destroy()
      void ctx.close().catch(() => undefined)
    }
    return filtered
  } catch (issue) {
    void ctx.close().catch(() => undefined)
    throw issue
  }
}

/** Oqimdagi mikrofon trekini filtrlanganiga almashtiradi (video treklar o'zgarmaydi). */
export async function applyNoiseFilter(stream: MediaStream): Promise<MediaStream> {
  const raw = stream.getAudioTracks()[0]
  if (!raw || typeof AudioWorkletNode === "undefined") return stream
  try {
    const filtered = await filterTrack(raw)
    filtered.enabled = raw.enabled
    return new MediaStream([filtered, ...stream.getVideoTracks()])
  } catch (issue) {
    console.warn("[noise-filter] ishlamadi, mikrofon filtrsiz:", issue)
    return stream
  }
}

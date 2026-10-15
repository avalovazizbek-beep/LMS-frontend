import { Device } from "mediasoup-client"
import type { types as MediasoupClientTypes } from "mediasoup-client"
import type { Socket } from "socket.io-client"

export type ProducerSource = "camera" | "mic" | "screen"

export interface ProducerSummary {
  producerId: string
  socketId: string
  userId: number
  fullName: string
  role: string
  groupId: number | null
  kind: "audio" | "video"
  source: ProducerSource
}

/** Video yuborish sifati: maksimal bitreyt va (ixtiyoriy) o'lchamni kichraytirish. */
export interface VideoEncodingProfile {
  maxBitrate: number
  scaleResolutionDownBy?: number
  maxFramerate?: number
}

/* Simulcast: video 2 sifatda yuboriladi, server (mediasoup) har bir
   talabaga uning interneti ko'targanini avtomatik beradi — sust internetli
   talabada video qotib qolmaydi, pastki qatlamga tushadi. 120 kishilik
   darsda server chiqish trafigini ham cheklaydi. Tartib: pastdan yuqoriga. */

// O'qituvchi kamerasi: 320×180 va ~854×480
export const TEACHER_CAMERA_LAYERS: VideoEncodingProfile[] = [
  { maxBitrate: 150_000, scaleResolutionDownBy: 4 },
  { maxBitrate: 600_000, scaleResolutionDownBy: 1.5 },
]

// Talaba kamerasi — faqat o'qituvchi ko'rayotganda va faqat o'qituvchiga:
// ~320×180, 15 kadr/s, ~0,2 Mbit/s (mobil internetda ham bemalol)
export const STUDENT_LIVE_LAYERS: VideoEncodingProfile[] = [
  { maxBitrate: 200_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
]

// Ekran ulashish: yarim o'lcham va to'liq o'lcham (slayd matni tiniq).
// Slayd o'zgarmaganda haqiqiy bitreyt maksimaldan ancha past bo'ladi.
const SCREEN_LAYERS: VideoEncodingProfile[] = [
  { maxBitrate: 300_000, scaleResolutionDownBy: 2 },
  { maxBitrate: 1_200_000, scaleResolutionDownBy: 1 },
]

export interface RemotePeerIdentity {
  socketId: string
  userId: number
  name: string
  role: string
  groupId: number | null
}

interface AckResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function emitAck<T = unknown>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res: AckResponse<T>) => {
      if (res?.success) resolve(res.data as T)
      else reject(new Error(res?.error || `${event} muvaffaqiyatsiz`))
    })
  })
}

export class MeetingMediaClient {
  private device = new Device()
  private sendTransport: MediasoupClientTypes.Transport | null = null
  private recvTransport: MediasoupClientTypes.Transport | null = null
  private producers = new Map<ProducerSource, MediasoupClientTypes.Producer>()
  private consumers = new Map<string, MediasoupClientTypes.Consumer>()
  private consumerIdByProducerId = new Map<string, string>()
  private consumedProducerIds = new Set<string>()
  // Consume tugamasdan yopilgan producer'lar (o'qituvchi sahifani tez
  // almashtirsa) — kech kelgan trek "osilib" qolmasin
  private closedProducerIds = new Set<string>()
  // The server emits "meeting:joined" both as the meeting:join ack AND as a
  // separate event — every join triggers TWO calls to init() with the same
  // data. Without this guard, both calls race past the "transport already
  // exists?" check before either finishes creating one, ending up with two
  // send transports (and this.sendTransport left pointing at whichever
  // resolved last, orphaning anything already attached to the other).
  private setupPromise: Promise<void> | null = null

  constructor(
    private socket: Socket,
    private onTrack: (peer: RemotePeerIdentity, track: MediaStreamTrack) => void,
    private onProducerClosed: (socketId: string, track: MediaStreamTrack) => void,
    /** O'z foydalanuvchi ID'si — boshqa tab/qurilmadagi O'Z ulanishimiz
     *  producer'ini qabul qilmaslik uchun (aks holda odam o'z ovozini
     *  kechikish bilan qayta eshitadi). */
    private selfUserId: number | null = null,
    /** Kamera sifat qatlamlari (simulcast) */
    private cameraLayers: VideoEncodingProfile[] = TEACHER_CAMERA_LAYERS,
    /** O'z roli — talaba boshqa talabalarning kamerasini olmaydi */
    private selfRole: string | null = null
  ) {}

  // "camera" producer'i kamera va ekran ulashish o'rtasida trek almashtiradi —
  // qaysi sifat profili qo'llanganini eslab, faqat o'zgarganda yangilaymiz.
  private cameraProfileIsScreen: boolean | null = null

  async init(rtpCapabilities: MediasoupClientTypes.RtpCapabilities, existingProducers: ProducerSummary[]): Promise<void> {
    if (!this.setupPromise) {
      this.setupPromise = this.setup(rtpCapabilities)
    }
    await this.setupPromise
    for (const producer of existingProducers) {
      await this.maybeConsume(producer)
    }
  }

  private async setup(rtpCapabilities: MediasoupClientTypes.RtpCapabilities): Promise<void> {
    if (!this.device.loaded) {
      await this.device.load({ routerRtpCapabilities: rtpCapabilities })
    }
    await this.ensureSendTransport()
    await this.ensureRecvTransport()
  }

  private async ensureSendTransport(): Promise<MediasoupClientTypes.Transport> {
    if (this.sendTransport) return this.sendTransport
    const params = await emitAck<MediasoupClientTypes.TransportOptions>(this.socket, "mediasoup:createTransport", { direction: "send" })
    const transport = this.device.createSendTransport(params)

    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      emitAck(this.socket, "mediasoup:connectTransport", { transportId: transport.id, dtlsParameters })
        .then(() => callback())
        .catch(errback)
    })
    transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
      emitAck<{ id: string }>(this.socket, "mediasoup:produce", {
        transportId: transport.id,
        kind,
        rtpParameters,
        source: (appData as { source?: ProducerSource } | undefined)?.source,
      })
        .then(({ id }) => callback({ id }))
        // Server rad etdi (masalan o'qituvchi ko'rishni to'xtatgan) — bu
        // simulcast muammosi emas, bitta qatlam bilan qayta urinilmaydi
        .catch((issue: Error) => errback(Object.assign(issue, { fromServer: true })))
    })

    this.sendTransport = transport
    return transport
  }

  private async ensureRecvTransport(): Promise<MediasoupClientTypes.Transport> {
    if (this.recvTransport) return this.recvTransport
    const params = await emitAck<MediasoupClientTypes.TransportOptions>(this.socket, "mediasoup:createTransport", { direction: "recv" })
    const transport = this.device.createRecvTransport(params)

    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      emitAck(this.socket, "mediasoup:connectTransport", { transportId: transport.id, dtlsParameters })
        .then(() => callback())
        .catch(errback)
    })

    this.recvTransport = transport
    return transport
  }

  /** Mavjud producer qatlamlarini (kamera ↔ ekran) almashtirish. Producer.
      setRtpEncodingParameters hamma qatlamga BIR XIL qiymat beradi, shu sabab
      to'g'ridan-to'g'ri RTCRtpSender orqali har qatlam alohida sozlanadi. */
  private async applyLayers(producer: MediasoupClientTypes.Producer, layers: VideoEncodingProfile[]): Promise<void> {
    const sender = producer.rtpSender
    if (!sender) return
    const params = sender.getParameters()
    if (!params.encodings?.length) return
    const offset = Math.max(0, layers.length - params.encodings.length)
    params.encodings.forEach((encoding, idx) => {
      const layer = layers[Math.min(layers.length - 1, idx + offset)]
      encoding.maxBitrate = layer.maxBitrate
      encoding.scaleResolutionDownBy = layer.scaleResolutionDownBy ?? 1
      if (layer.maxFramerate) encoding.maxFramerate = layer.maxFramerate
    })
    await sender.setParameters(params)
  }

  /* Bir manba (mic/camera) bo'yicha amallar navbat bilan bajariladi.
     Mikrofon yoqilganda syncPeerMediaTracks ketma-ket ikki marta chaqiriladi
     (yangi trek + yoqish) — birinchi produce() tugamay turib ikkinchisi
     "producer yo'q" deb YANA birini ochardi: talaba ikki nusxada eshitilardi
     (aks-sadoga o'xshash). Navbat bilan ikkinchisi mavjud producer'da
     replaceTrack qiladi. */
  private produceChains = new Map<ProducerSource, Promise<void>>()

  /**
   * opts.tag     Serverga aytiladigan manba turi. Berilsa (talaba), tur
   *              o'zgarganda producer yopilib yangisi ochiladi, trek
   *              yo'qolganda esa pauza emas — yopiladi (kamera faqat
   *              o'qituvchiga, ekran hammaga boradi).
   * opts.reapply Mavjud producer'ga `layers`ni qayta qo'llash
   */
  private produceTrack(
    source: ProducerSource,
    track: MediaStreamTrack | null,
    opts: { layers?: VideoEncodingProfile[]; reapply?: boolean; tag?: ProducerSource } = {}
  ): Promise<void> {
    const previous = this.produceChains.get(source) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(() => this.produceTrackNow(source, track, opts))
    this.produceChains.set(source, next)
    return next
  }

  private async produceTrackNow(
    source: ProducerSource,
    track: MediaStreamTrack | null,
    { layers, reapply = false, tag }: { layers?: VideoEncodingProfile[]; reapply?: boolean; tag?: ProducerSource }
  ): Promise<void> {
    if (!this.device.loaded) return
    let existing = this.producers.get(source)
    if (!track) {
      // Video manbasi yo'q (masalan talaba ekran ulashishni to'xtatdi) — eski
      // trek "osilib" qolmasin, producer pauza qilinadi (talaba — yopiladi)
      if (existing && tag) this.closeProducer(source)
      else if (existing && !existing.paused) this.pauseProducer(source)
      return
    }
    if (existing && tag && (existing.appData as { source?: ProducerSource }).source !== tag) {
      this.closeProducer(source)
      existing = undefined
    }
    try {
      if (existing) {
        await existing.replaceTrack({ track })
        if (existing.paused) this.resumeProducer(source)
        if (layers && reapply) await this.applyLayers(existing, layers).catch(() => undefined)
        return
      }
      const transport = await this.ensureSendTransport()
      // stopTracks defaults to true — mediasoup-client would stop the
      // camera/mic MediaStreamTrack itself whenever this producer closes
      // (e.g. on every reconnect). That track is owned and reused by the
      // page (localStreamRef), not by us, so stopping it here permanently
      // kills the local camera/mic and every future produce attempt fails
      // with "InvalidStateError: track ended".
      const base = {
        track,
        appData: { source: tag ?? source },
        stopTracks: false,
        // Nutq uchun: mono, jimlikda paket yubormaslik (DTX — fon shovqini
        // uzatilmaydi), yo'qolgan paketlarni tiklash (FEC).
        ...(source === "mic" ? { codecOptions: { opusStereo: false, opusDtx: true, opusFec: true } } : {}),
      }
      let producer: MediasoupClientTypes.Producer
      if (layers?.length) {
        try {
          producer = await transport.produce({
            ...base,
            encodings: layers.map((layer) => ({ ...layer })),
            codecOptions: { videoGoogleStartBitrate: 600 },
          })
        } catch (simulcastIssue) {
          if ((simulcastIssue as { fromServer?: boolean }).fromServer) throw simulcastIssue
          // Brauzer simulcast'ni qo'llamasa — bitta (yuqori) qatlam bilan
          console.warn("[mediasoup] simulcast ishlamadi, bitta qatlam:", simulcastIssue)
          producer = await transport.produce({
            ...base,
            encodings: [{ ...layers[layers.length - 1] }],
            codecOptions: { videoGoogleStartBitrate: 600 },
          })
        }
      } else {
        producer = await transport.produce(base)
      }
      console.log(`[mediasoup] producing ${source} (${producer.kind}), id=${producer.id}, layers=${producer.rtpParameters.encodings?.length ?? 1}`)
      this.producers.set(source, producer)
    } catch (issue) {
      // Server rad etishi kutilgan holat (o'qituvchi shu orada ko'rishni to'xtatdi)
      if ((issue as { fromServer?: boolean }).fromServer) console.warn("[mediasoup] %s rad etildi:", source, (issue as Error).message)
      else console.error("[mediasoup] Failed to produce %s:", source, issue)
    }
  }

  async setCameraTrack(track: MediaStreamTrack | null, isScreen = false): Promise<void> {
    if (track && isScreen) track.contentHint = "detail"   // matn/slayd: o'lcham saqlanadi, kadr soni kamayadi
    const changed = this.cameraProfileIsScreen !== isScreen
    if (track) this.cameraProfileIsScreen = isScreen
    await this.produceTrack("camera", track, {
      layers: isScreen ? SCREEN_LAYERS : this.cameraLayers,
      reapply: changed,
      // Talaba: kamera (faqat o'qituvchiga) va ekran (hammaga) — alohida producer
      tag: this.selfRole === "student" ? (isScreen ? "screen" : "camera") : undefined,
    })
  }

  async setMicTrack(track: MediaStreamTrack | null): Promise<void> {
    await this.produceTrack("mic", track)
  }

  private closeProducer(source: ProducerSource): void {
    const producer = this.producers.get(source)
    if (!producer) return
    this.producers.delete(source)
    producer.close()
    void emitAck(this.socket, "mediasoup:closeProducer", { producerId: producer.id })
      .catch((issue) => console.error("[mediasoup] closeProducer failed:", issue))
  }

  pauseProducer(source: ProducerSource): void {
    const producer = this.producers.get(source)
    if (!producer || producer.paused) return
    producer.pause()
    void emitAck(this.socket, "mediasoup:pauseProducer", { producerId: producer.id })
      .catch((issue) => console.error("[mediasoup] pauseProducer failed:", issue))
  }

  resumeProducer(source: ProducerSource): void {
    const producer = this.producers.get(source)
    if (!producer || !producer.paused) return
    producer.resume()
    void emitAck(this.socket, "mediasoup:resumeProducer", { producerId: producer.id })
      .catch((issue) => console.error("[mediasoup] resumeProducer failed:", issue))
  }

  async handleNewProducer(producer: ProducerSummary): Promise<void> {
    await this.maybeConsume(producer)
  }

  // Everyone in the room consumes everyone else's audio AND video — this is
  // a real, discussion-style meeting where every participant should see and
  // hear every other participant, not just the teacher.
  private async maybeConsume(producer: ProducerSummary): Promise<void> {
    if (this.selfUserId && producer.userId && producer.userId === this.selfUserId) return
    // Talabalarning jonli kamerasi faqat o'qituvchi uchun (server ham buni tekshiradi)
    if (this.selfRole === "student" && producer.role === "student" && producer.kind === "video" && producer.source === "camera") return
    if (this.consumedProducerIds.has(producer.producerId) || this.closedProducerIds.has(producer.producerId)) return
    this.consumedProducerIds.add(producer.producerId)

    let consumer: MediasoupClientTypes.Consumer | null = null
    try {
      const transport = await this.ensureRecvTransport()
      const data = await emitAck<{ id: string; producerId: string; kind: "audio" | "video"; rtpParameters: MediasoupClientTypes.RtpParameters }>(
        this.socket,
        "mediasoup:consume",
        { transportId: transport.id, producerId: producer.producerId, rtpCapabilities: this.device.recvRtpCapabilities }
      )
      consumer = await transport.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      })
      this.consumers.set(consumer.id, consumer)
      this.consumerIdByProducerId.set(producer.producerId, consumer.id)
      if (this.closedProducerIds.has(producer.producerId)) throw new Error("producer allaqachon yopilgan")
      await emitAck(this.socket, "mediasoup:resumeConsumer", { consumerId: consumer.id })
      // Shu orada producer yopilgan bo'lsa (handleProducerClosed allaqachon tozaladi)
      if (consumer.closed) return
      console.log(`[mediasoup] consuming ${producer.kind} from ${producer.fullName} (${producer.source}), track.readyState=${consumer.track.readyState}`)

      this.onTrack(
        { socketId: producer.socketId, userId: producer.userId, name: producer.fullName, role: producer.role, groupId: producer.groupId },
        consumer.track
      )
    } catch (issue) {
      console.error("[mediasoup] Failed to consume producer %s (%s/%s):", producer.producerId, producer.kind, producer.source, issue)
      this.consumedProducerIds.delete(producer.producerId)
      if (consumer && !consumer.closed) {
        consumer.close()
        this.consumers.delete(consumer.id)
        this.consumerIdByProducerId.delete(producer.producerId)
      }
    }
  }

  handleProducerClosed(socketId: string, producerId: string): void {
    this.closedProducerIds.add(producerId)
    this.consumedProducerIds.delete(producerId)
    const consumerId = this.consumerIdByProducerId.get(producerId)
    if (!consumerId) return
    const consumer = this.consumers.get(consumerId)
    this.consumers.delete(consumerId)
    this.consumerIdByProducerId.delete(producerId)
    if (!consumer) return
    const track = consumer.track
    consumer.close()
    this.onProducerClosed(socketId, track)
  }

  closeAll(): void {
    this.produceChains.clear()
    this.producers.forEach((producer) => producer.close())
    this.producers.clear()
    this.consumers.forEach((consumer) => consumer.close())
    this.consumers.clear()
    this.consumerIdByProducerId.clear()
    this.consumedProducerIds.clear()
    this.closedProducerIds.clear()
    this.cameraProfileIsScreen = null
    this.sendTransport?.close()
    this.recvTransport?.close()
    this.sendTransport = null
    this.recvTransport = null
  }
}

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

export interface RemotePeerIdentity {
  socketId: string
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

  constructor(
    private socket: Socket,
    private onTrack: (peer: RemotePeerIdentity, track: MediaStreamTrack) => void,
    private onProducerClosed: (socketId: string) => void
  ) {}

  async init(rtpCapabilities: MediasoupClientTypes.RtpCapabilities, existingProducers: ProducerSummary[]): Promise<void> {
    if (!this.device.loaded) {
      await this.device.load({ routerRtpCapabilities: rtpCapabilities })
    }
    await this.ensureSendTransport()
    await this.ensureRecvTransport()
    for (const producer of existingProducers) {
      await this.maybeConsume(producer)
    }
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
        .catch(errback)
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

  private async produceTrack(source: ProducerSource, track: MediaStreamTrack | null): Promise<void> {
    if (!track || !this.device.loaded) return
    try {
      const existing = this.producers.get(source)
      if (existing) {
        await existing.replaceTrack({ track })
        return
      }
      const transport = await this.ensureSendTransport()
      const producer = await transport.produce({ track, appData: { source } })
      console.log(`[mediasoup] producing ${source} (${producer.kind}), id=${producer.id}`)
      this.producers.set(source, producer)
    } catch (issue) {
      console.error(`[mediasoup] Failed to produce ${source}:`, issue)
    }
  }

  async setCameraTrack(track: MediaStreamTrack | null): Promise<void> {
    await this.produceTrack("camera", track)
  }

  async setMicTrack(track: MediaStreamTrack | null): Promise<void> {
    await this.produceTrack("mic", track)
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
    if (this.consumedProducerIds.has(producer.producerId)) return
    this.consumedProducerIds.add(producer.producerId)

    try {
      const transport = await this.ensureRecvTransport()
      const data = await emitAck<{ id: string; producerId: string; kind: "audio" | "video"; rtpParameters: MediasoupClientTypes.RtpParameters }>(
        this.socket,
        "mediasoup:consume",
        { transportId: transport.id, producerId: producer.producerId, rtpCapabilities: this.device.recvRtpCapabilities }
      )
      const consumer = await transport.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      })
      this.consumers.set(consumer.id, consumer)
      this.consumerIdByProducerId.set(producer.producerId, consumer.id)
      await emitAck(this.socket, "mediasoup:resumeConsumer", { consumerId: consumer.id })
      console.log(`[mediasoup] consuming ${producer.kind} from ${producer.fullName} (${producer.source}), track.readyState=${consumer.track.readyState}`)

      this.onTrack(
        { socketId: producer.socketId, name: producer.fullName, role: producer.role, groupId: producer.groupId },
        consumer.track
      )
    } catch (issue) {
      console.error(`[mediasoup] Failed to consume producer ${producer.producerId} (${producer.kind}/${producer.source}):`, issue)
      this.consumedProducerIds.delete(producer.producerId)
    }
  }

  handleProducerClosed(socketId: string, producerId: string): void {
    const consumerId = this.consumerIdByProducerId.get(producerId)
    if (consumerId) {
      this.consumers.get(consumerId)?.close()
      this.consumers.delete(consumerId)
      this.consumerIdByProducerId.delete(producerId)
    }
    this.consumedProducerIds.delete(producerId)
    this.onProducerClosed(socketId)
  }

  closeAll(): void {
    this.producers.forEach((producer) => producer.close())
    this.producers.clear()
    this.consumers.forEach((consumer) => consumer.close())
    this.consumers.clear()
    this.consumerIdByProducerId.clear()
    this.consumedProducerIds.clear()
    this.sendTransport?.close()
    this.recvTransport?.close()
    this.sendTransport = null
    this.recvTransport = null
  }
}

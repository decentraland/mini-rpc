import mitt from 'mitt'
import future, { IFuture } from 'fp-future'

/**
 * A class to implement RPC server/client or simple event emitters over an abstract transport
 */


export class RPC<
  Method extends string = string,
  Params extends Record<Method, any> = Record<Method, any>,
  Result extends Record<Method, any> = Record<Method, any>,
  EventType extends string = string,
  EventData extends Record<EventType, any> = Record<EventType, any>,
> {
  private currentId = 0
  private events = mitt<EventData>()
  private promises = new Map<number, IFuture<any>>()
  private handlers = new Map<
    Method,
    (params: Params[Method]) => Promise<Result[Method]>
  >()

  constructor(
    public id: string,
    public transport: RPC.Transport,
  ) {
    this.transport.addEventListener('message', this.handler)
  }

  private handler = async (message: any) => {
    if (this.isMessage(message)) {
      switch (message.type) {
        case RPC.MessageType.EVENT: {
          if (this.isEvent(message.payload)) {
            const event = message.payload
            this.events.emit(event.type, event.data)
          }
          break
        }
        case RPC.MessageType.REQUEST: {
          if (this.isRequest(message.payload)) {
            const request = message.payload
            try {
              const handler = this.handlers.get(request.method)
              if (!handler) {
                throw new Error(`Method "${request.method}" not implemented`)
              }
              const result = await handler(request.params)
              const message = this.createMessage('response', {
                id: request.id,
                method: request.method,
                success: true,
                result,
              })
              this.transport.send(message)
            } catch (error) {
              const message = this.createMessage('response', {
                id: request.id,
                method: request.method,
                success: false,
                error: (error as Error).message,
              })
              this.transport.send(message)
            }
          }
          break
        }
        case RPC.MessageType.RESPONSE: {
          if (this.isResponse(message.payload)) {
            const response = message.payload
            if (this.promises.has(response.id)) {
              const promise = this.promises.get(response.id)!
              if (response.success) {
                promise.resolve(response.result)
              } else {
                promise.reject(new Error(response.error))
              }
              this.promises.delete(response.id)
            }
          }
          break
        }
      }
    }
  }

  private isMessage(
    value: any,
  ): value is RPC.Message<
    RPC.MessageType,
    RPC.MessagePayload<Method, Params, Result, EventType, EventData>
  > {
    const messageTypes = Object.values(RPC.MessageType).filter(
      (value) => typeof value === 'string',
    )
    return (
      value &&
      value.id === this.id &&
      typeof value.type === 'string' &&
      messageTypes.includes(value.type) &&
      typeof value.payload === 'object' &&
      value.payload !== null
    )
  }

  private isEvent(value: any): value is RPC.Event<EventType, EventData> {
    return value && typeof value.type === 'string'
  }

  private isRequest(value: any): value is RPC.Request<Method, Params> {
    return (
      value && typeof value.method === 'string' && typeof value.id === 'number'
    )
  }

  private isResponse(value: any): value is RPC.Response<Method, Result> {
    return (
      value && typeof value.method === 'string' && typeof value.id === 'number'
    )
  }

  on<T extends EventType>(type: `${T}`, handler: (data: EventData[T]) => void) {
    this.events.on(type as T, handler)
  }

  off<T extends EventType>(
    type: `${T}`,
    handler: (data: EventData[T]) => void,
  ) {
    this.events.off(type as T, handler)
  }

  emit<T extends EventType>(type: `${T}`, data: EventData[T]) {
    this.transport.send({
      id: this.id,
      type: RPC.MessageType.EVENT,
      payload: {
        type,
        data,
      },
    })
  }

  async request<T extends Method>(method: `${T}`, params: Params[T]) {
    const promise = future<Result[T]>()
    const id = this.currentId++
    this.promises.set(id, promise)
    const message = this.createMessage('request', {
      id,
      method: method as T,
      params,
    })
    this.transport.send(message)
    return promise
  }

  handle<T extends Method>(
    method: `${T}`,
    handler: (params: Params[T]) => Promise<Result[T]>,
  ) {
    this.handlers.set(
      method as T,
      handler as (params: Params[Method]) => Promise<Result[T]>,
    )
  }

  dispose() {
    this.transport.removeEventListener('message', this.handler)
  }

  createMessage = <Type extends RPC.MessageType>(
    type: `${Type}`,
    payload: RPC.MessagePayload<
      Method,
      Params,
      Result,
      EventType,
      EventData
    >[Type],
  ): RPC.Message<
    Type,
    RPC.MessagePayload<Method, Params, Result, EventType, EventData>
  > => ({
    id: this.id,
    type: type as Type,
    payload,
  })
}

export namespace RPC {
  export abstract class Transport {
    abstract send(message: Message): void
    private events = mitt<Transport.EventData>()
    emit(type: `${Transport.EventType}`, message: Message) {
      this.events.emit(type as Transport.EventType, message)
    }
    addEventListener(
      type: `${Transport.EventType}`,
      handler: Transport.Handler,
    ) {
      this.events.on(type as Transport.EventType, handler)
    }
    removeEventListener(
      type: `${Transport.EventType}`,
      handler: Transport.Handler,
    ) {
      this.events.off(type as Transport.EventType, handler)
    }
  }

  export namespace Transport {
    export enum EventType {
      MESSAGE = 'message',
    }
    export type EventData = {
      [EventType.MESSAGE]: Message
    }
    export type Handler = (message: Message) => void
  }

  export type Message<
    Type extends string = string,
    Payload extends Record<Type, any> = Record<Type, any>,
  > = {
    id: string
    type: Type
    payload: Payload[Type]
  }

  export enum MessageType {
    REQUEST = 'request',
    RESPONSE = 'response',
    EVENT = 'event',
  }

  export type MessagePayload<
    Method extends string,
    Params extends Record<Method, any>,
    Result extends Record<Method, any>,
    EventType extends string,
    EventData extends Record<EventType, any>,
  > = {
    [MessageType.EVENT]: Event<EventType, EventData>
    [MessageType.REQUEST]: Request<Method, Params>
    [MessageType.RESPONSE]: Response<Method, Result>
  }

  export type Request<
    Method extends string,
    Params extends Record<Method, any>,
  > = {
    id: number
    method: Method
    params: Params[Method]
  }

  export type Response<
    Method extends string,
    Result extends Record<Method, any>,
  > = {
    id: number
    method: Method
  } & (
    | {
        success: true
        result: Result[Method]
      }
    | { success: false; error: string }
  )

  export type Event<
    EventType extends string,
    EventData extends Record<EventType, any>,
  > = {
    type: EventType
    data: EventData[EventType]
  }
}

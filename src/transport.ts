import mitt from 'mitt'

export type Message<
  Type extends string = string,
  Payload extends Record<Type, any> = Record<Type, any>,
> = {
  id: string
  type: Type
  payload: Payload[Type]
}

export abstract class Transport {
  abstract send(message: Message): void
  private events = mitt<{ message: Message }>()
  emit(type: 'message', message: Message) {
    this.events.emit(type, message)
  }
  addEventListener(type: 'message', handler: (message: Message) => void) {
    this.events.on(type, handler)
  }
  removeEventListener(type: 'message', handler: (message: Message) => void) {
    this.events.off(type, handler)
  }
}

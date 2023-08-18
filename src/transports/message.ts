import { Transport } from '../transport'

type Source = {
  addEventListener: (
    type: 'message',
    handler: (event: MessageEvent) => void,
  ) => void
  removeEventListener: (
    type: 'message',
    handler: (event: MessageEvent) => void,
  ) => void
}

type Target = {
  postMessage: (message: any, origin: string) => void
}

export class MessageTransport extends Transport {
  constructor(
    public source: Source,
    public target: Target,
    public origin: string = '*',
  ) {
    super()
    this.source.addEventListener('message', this.handler)
  }

  private handler = (event: MessageEvent) => {
    if (event.data) {
      this.emit('message', event.data)
    }
  }

  send(message: any) {
    this.target.postMessage(message, this.origin)
  }

  dispose() {
    // remove listener
    this.source.removeEventListener('message', this.handler)
  }
}

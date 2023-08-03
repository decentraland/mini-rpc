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
  private ready = false
  private queue: any[] = []

  constructor(
    public source: Source,
    public target: Target,
    public origin: string = '*',
  ) {
    super()
    // bind handler
    this.source.addEventListener('message', this.handler)
    // send ping
    this.target.postMessage({ type: 'ping' }, this.origin)
  }

  private handler = (event: MessageEvent) => {
    if (event.data) {
      // special messages to establish communication
      if (event.data.type === 'ping' || event.data.type === 'pong') {
        // set as ready if was not yet
        if (!this.ready) {
          this.ready = true
        }

        // answer ping with pong
        if (event.data.type === 'ping') {
          this.target.postMessage({ type: 'pong' }, this.origin)
        }

        // flush the queue
        while (this.queue.length > 0) {
          const message = this.queue.shift()
          this.send(message)
        }

        // send all other events to the handler (if any)
      } else {
        this.emit('message', event.data)
      }
    }
  }

  send(message: any) {
    // if not ready enqueue message
    if (!this.ready) {
      this.queue.push(message)
    } else {
      // otherwise send it
      this.target.postMessage(message, this.origin)
    }
  }

  dispose() {
    // remove listener
    this.source.removeEventListener('message', this.handler)
  }
}

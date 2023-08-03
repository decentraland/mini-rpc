import { Message, Transport } from '../transport'

export class InMemoryTransport extends Transport {
  private others = new Set<Transport>()
  send(message: Message) {
    for (const transport of this.others) {
      transport.emit('message', message)
    }
  }
  connect = (transport: InMemoryTransport) => {
    this.others.add(transport)
  }
  disconnect = (transport: InMemoryTransport) => {
    this.others.delete(transport)
  }
}

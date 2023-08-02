import { RPC } from '../rpc'

export class InMemoryTransport extends RPC.Transport {
  private others = new Set<RPC.Transport>()
  send(message: RPC.Message) {
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

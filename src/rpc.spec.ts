import { InMemoryTransport } from './transports'
import { RPC } from './rpc'
import { Transport } from './transport'

namespace Test {
  export enum Method {
    ADD = 'add',
  }

  export type Params = {
    [Method.ADD]: { a: number; b: number }
  }

  export type Result = {
    [Method.ADD]: number
  }

  export enum EventType {
    FOO = 'foo',
  }

  export type EventData = {
    [EventType.FOO]: { bar: string }
  }
}

class Client extends RPC<
  Test.Method,
  Test.Params,
  Test.Result,
  Test.EventType,
  Test.EventData
> {
  constructor(transport: Transport) {
    super('test', transport)
  }
  async add(a: number, b: number) {
    return this.request('add', { a, b })
  }

  // this client method exists just to test an unimplemented method error on the server side
  async unimplemented() {
    return this.request('unimplemented' as never, {} as never)
  }
}

class Server extends RPC<
  Test.Method,
  Test.Params,
  Test.Result,
  Test.EventType,
  Test.EventData
> {
  constructor(transport: Transport) {
    super('test', transport)
    this.handle('add', async ({ a, b }) => {
      if (isNaN(a) || isNaN(b)) {
        throw new Error('baNaNa 🍌')
      }
      return a + b
    })
  }
}

describe('RPC', () => {
  let transportA: InMemoryTransport
  let transportB: InMemoryTransport

  beforeEach(() => {
    transportA = new InMemoryTransport()
    transportB = new InMemoryTransport()
  })
  describe('When creating an RPC', () => {
    it('should send a ping message through the transport', () => {
      const spy = jest.spyOn(transportA, 'send')
      const client = new Client(transportA)
      const message = client.createMessage('connection', { type: 'ping' })
      expect(spy).toHaveBeenCalledWith(message)
    })
  })
  describe('When the RPC is ready', () => {
    let client: Client
    let server: Server

    beforeEach(() => {
      transportA.connect(transportB)
      transportB.connect(transportA)
      client = new Client(transportA)
      server = new Server(transportB)
    })

    describe('When requesting a method from the client', () => {
      describe('and the server response is successful', () => {
        it("should resolve the client request to the server's response", async () => {
          await expect(client.add(1, 2)).resolves.toBe(3)
        })
      })
      describe('and the server response is NOT successful', () => {
        it("should reject the client request with the server's error message", async () => {
          await expect(client.add(1, NaN)).rejects.toThrow(/NaN/)
        })
      })
      describe('and the server has not implemented the method', () => {
        it('should reject the client request with an unimplemented method error', async () => {
          await expect(client.unimplemented()).rejects.toThrow(
            /not implemented/,
          )
        })
      })
    })
    describe('When emitting an event on the server', () => {
      it('should be handled by the client', () => {
        const handler = jest.fn()
        client.on('foo', handler)
        server.emit('foo', { bar: 'baz' })
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith({ bar: 'baz' })
      })
    })
    describe('When emitting an event on the client', () => {
      it('should be handled by the server', () => {
        const handler = jest.fn()
        server.on('foo', handler)
        client.emit('foo', { bar: 'baz' })
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith({ bar: 'baz' })
      })
      describe('and the handler has been unbound', () => {
        it('should not be called', () => {
          const handler = jest.fn()
          client.on('foo', handler)
          client.off('foo', handler)
          server.emit('foo', { bar: 'baz' })
          expect(handler).not.toHaveBeenCalled()
        })
      })
      describe('and the rpc has been disposed', () => {
        it('should not handle the event', () => {
          const handler = jest.fn()
          client.on('foo', handler)
          client.dispose()
          server.emit('foo', { bar: 'baz' })
          expect(handler).not.toHaveBeenCalled()
        })
      })
    })
  })
  describe('When the RPC is not ready', () => {
    let client: Client

    beforeEach(() => {
      transportA.connect(transportB)
      transportB.connect(transportA)
      client = new Client(transportA)
    })

    it('should enqueue the messages', () => {
      const spy = jest.spyOn(transportA, 'send')
      client.add(1, 2)
      expect(spy).not.toHaveBeenCalled()
    })
    describe('and then the RPC becomes ready', () => {
      it('should flush the messages in the queue', async () => {
        const promise = client.add(1, 2)
        const spy = jest.spyOn(transportA, 'send')
        expect(spy).not.toHaveBeenCalled()
        // server becomes available
        new Server(transportB)
        expect(spy).toHaveBeenCalled()
        await expect(promise).resolves.toBe(3)
      })
    })
  })
})

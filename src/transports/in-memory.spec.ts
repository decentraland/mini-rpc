import { Message } from '../transport'
import { InMemoryTransport } from './in-memory'

const message: Message = { id: 'test', type: 'foo', payload: 'bar' }

describe('InMemoryTransport', () => {
  let transportA: InMemoryTransport
  let transportB: InMemoryTransport
  beforeEach(() => {
    transportA = new InMemoryTransport()
    transportB = new InMemoryTransport()
  })
  describe('When a transport is connected to another', () => {
    describe('and a message is sent from one transport', () => {
      it('should emit a message event on the other transport', () => {
        const handler = jest.fn()
        transportB.addEventListener('message', handler)
        transportA.connect(transportB)
        transportA.send(message)
        expect(handler).toHaveBeenCalledWith(message)
      })
    })
    describe('and then is disconnected', () => {
      describe('and a message is sent from one transport', () => {
        it('should not emit a message event on the other transport', () => {
          const handler = jest.fn()
          transportB.addEventListener('message', handler)
          transportA.connect(transportB)
          transportA.disconnect(transportB)
          transportA.send(message)
          expect(handler).not.toHaveBeenCalledWith(message)
        })
      })
    })
  })
})

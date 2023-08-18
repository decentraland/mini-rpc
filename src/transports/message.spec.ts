import mitt from 'mitt'
import { MessageTransport } from './message'
import { Message } from '../transport'

const events = mitt()
const send = (message: any) => events.emit('message', { data: message })

const source = {
  addEventListener: jest
    .fn()
    .mockImplementation((type, hanlder) => events.on(type, hanlder)),
  removeEventListener: jest.fn(),
}

const target = {
  postMessage: jest.fn(),
}

const message: Message = {
  id: 'test',
  type: 'foo',
  payload: { bar: 'baz' },
}

describe('MessageTransport', () => {
  let transport: MessageTransport

  beforeEach(() => {
    events.off('*')
    transport = new MessageTransport(source, target)
  })

  afterEach(() => {
    source.addEventListener.mockClear()
    source.removeEventListener.mockClear()
    target.postMessage.mockClear()
  })

  describe('When creating a MessageTransport', () => {
    it('should send a ping message to the target', () => {
      expect(target.postMessage).toHaveBeenCalledWith({ type: 'ping' }, '*')
    })
  })

  it('should send post messages to the target', () => {
    transport.send(message)
    expect(target.postMessage).toHaveBeenCalledWith(message, '*')
  })
  it('should handle messages from the source and emit them', () => {
    const handler = jest.fn()
    transport.addEventListener('message', handler)
    send(message)
    expect(handler).toHaveBeenCalledWith(message)
  })

  describe('When disposing the transport', () => {
    it('should remove the listener from the source', () => {
      transport.dispose()
      expect(source.removeEventListener).toHaveBeenCalledTimes(1)
    })
  })
})

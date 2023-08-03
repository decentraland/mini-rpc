import { Message, Transport } from './transport'

describe('Transport', () => {
  const sendMock = jest.fn()
  const handlerMock = jest.fn()

  const message: Message = {
    id: 'test',
    type: 'test',
    payload: 'test',
  }

  class TestTransport extends Transport {
    send(message: Message) {
      return sendMock(message)
    }
  }

  const transport = new TestTransport()

  afterEach(() => {
    sendMock.mockReset()
    handlerMock.mockReset()
  })

  describe('When sending a message throw a transport', () => {
    it('should send te message', () => {
      transport.send(message)
      expect(sendMock).toHaveBeenCalledWith(message)
    })
  })
  describe('When emiting a message from a transport', () => {
    describe('and there is a handler listening to the message event', () => {
      beforeAll(() => {
        transport.addEventListener('message', handlerMock)
      })
      afterAll(() => {
        transport.removeEventListener('message', handlerMock)
      })
      it('should call the handler with the message', () => {
        transport.emit('message', message)
        expect(handlerMock).toHaveBeenCalledWith(message)
      })
      describe('and the listener is removed', () => {
        it('should NOT call the handler with the message', () => {
          transport.removeEventListener('message', handlerMock)
          transport.emit('message', message)
          expect(handlerMock).not.toHaveBeenCalledWith(message)
        })
      })
    })
  })
})

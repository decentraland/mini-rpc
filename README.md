# @dcl/mini-rpc

This package can be used to create client and servers over an abstract transport, and it includes some transport implementations

## Installation

```bash
npm i @dcl/mini-rpc
```

## Usage

You need to create define the events and/or methods, and optionally can also add events

```ts
enum Method {
  GET = 'get',
  SET = 'set',
  HAS = 'has',
  DELETE = 'delete'
}

type Params = {
  [Method.GET]: { key: string }
  [Method.SET]: { key: string; value: string }
  [Method.HAS]: { key: string }
  [Method.DELETE]: { key: string }
}

type Result = {
  [Method.GET]: string
  [Method.SET]: void
  [Method.HAS]: boolean
  [Method.DELETE]: void
}

// optionally you can have events emitted by the server or client

enum EventType {
  READY = 'ready'
}

type EventData = {
  [EventType.READY]: { hello: string }
}


```

Then you can implement the client by extending the `RPC` class and using the internal `request` method

```ts
//client.ts
import { RPC } from '@dcl/mini-rpc'
import { EventType, EventData, Method, Params, Result } from './types'

export class Client extends RPC<EventType, EventData, Method, Params, Result> {
  constructor(transport: RPC.Transport) {
    super(id, transport)
  }

  get(key: string) {
    return this.request('get', { key })
  }

  set(key: string, value: string) {
    return this.request('set', { key, value })
  }

  has(key: string) {
    return this.request('has', { key })
  }

  delete(key: string) {
    return this.request('delete', { key })
  }
}
```

To implement the server you do the same thing but use the internal `handle` to implement the methods


```ts
// server.ts
import { RPC } from '@dcl/mini-rpc'
import { EventType, EventData, Method, Params, Result } from './types'

export class Server extends RPC<EventType, EventData, Method, Params, Result> {
  constructor(transport: RPC.Transport) {
    super(id, transport)
    this.handle('get', async ({ key }) => {
      return localStorage.getItem(key)
    })
    this.handle('set', async ({ key, value }) => {
      return localStorage.setItem(key, value)
    })
    this.handle('has', async ({ key }) => {
      return localStorage.getItem(key) !== null
    })
    this.handle('delete', async ({ path }) => {
      return localStorage.removeItem(key)
    })
  }
}
```

Now you can create a transport and use the client/server like this

```ts
// webapp.ts
import { MessageTransport } from '@dcl/mini-rpc'
import { Client } from './client'

const iframe = document.getElementById('my-iframe')
const transport = new MessageTransport(window, iframe.contentWindow, 'https://iframe.com')
const client = new Client(transport)

// you can use any method on the client and it will be relayer to the server, and it will resolve/reject to the result/error
await client.set('some-key', 'some-value')

// you can also listen to event
client.on('ready', ({ hello }) => console.log(`hello ${hello}`))
```

```ts
// iframe.ts
import { MessageTransport } from '@dcl/mini-rpc'
import { Server } from './server'

const transport = new MessageTransport(window, window.parent, 'https://parent.com')
const server = new Server(transport)

// you can emits events if needed
server.emit('ready', { hello: 'world' })
```

## Test

```bash
npm test
```

Or with coverage reports

```bash
npm run test:coverage
```

## Build

```bash
npm run build
```

## Release

To release a new version of this package create a [new release](https://github.com/decentraland/mini-rpc/releases) via GitHub

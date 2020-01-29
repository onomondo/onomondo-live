#!/usr/bin/env node

const pcapGenerator = require('./pcap-generator')
const monitorSocket = require('./socket')
const minimist = require('minimist')
const prettyBytes = require('pretty-bytes')
const log = require('single-line-log').stdout
const pkgJson = require('./package.json')

const argv = minimist(process.argv.slice(2), { string: 'sim'})
const token = argv.token
const simId = argv.sim
const filename = argv.filename
const apiUrl = argv.api || 'https://api.onomondo.com'
const hasAllParams = filename && token && simId
let capturedPackets = 0
let capturedBytes = 0

if (!hasAllParams) {
  console.error([
    'Usage:',
    'onomondo-live --token=a1b2c3 --sim=123456789 --filename=output.pcap',
    '',
    'You need to use the ID of one of your SIMs, and an API token.',
    'It is also possible to use the token used in the app. Get this by visiting https://app.onomondo.com and look at the network tab in developer tools.',
    '',
    `Version: ${pkgJson.version}`
  ].join('\n'))
  process.exit(1)
}

pcapGenerator.writeHeader({ filename })

connect()

function connect () {
  const socket = monitorSocket(`${apiUrl}/monitor?from=onomondo-live`)

  socket.on('open', () => {
    console.log('Connected')
    socket.send('authenticate', token)
  })

  socket.on('error', err => {
    const isNotAuthenticated = err === 'Not authenticated'

    if (isNotAuthenticated) {
      console.error('Authenticated failed. Token is incorrect')
      process.exit(1)
    }

    console.error(`Error: ${err}`)
  })

  socket.on('close', () => {
    console.log('Connection closed. Trying to re-establish')
    socket.kill()
    setTimeout(connect, 1000)
  })

  socket.on('authenticated', () => {
    console.log('Authenticated')
    socket.send('attach', simId)
  })
  socket.on('attached', ({ id, ip }) => {
    console.log(`Attached. SIM id=${id}. ip=${ip}`)
  })

  socket.on('packet', hexString => {
    const timestamp = Date.now()
    const packet = Buffer.from(hexString, 'hex')

    capturedPackets += 1
    capturedBytes += packet.length

    log(`Captured: ${capturedPackets} packet${capturedPackets === 1 ? '' : 's'} (${prettyBytes(capturedBytes)})`)

    pcapGenerator.appendPacket({ packet, filename, timestamp })
  })
}

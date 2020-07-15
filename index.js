#!/usr/bin/env node

const pcapGenerator = require('./pcap-generator')
const io = require('socket.io-client')
const minimist = require('minimist')
const prettyBytes = require('pretty-bytes')
const log = require('single-line-log').stderr
const pkgJson = require('./package.json')

const argv = minimist(process.argv.slice(2), { string: 'sim' })
const token = argv.token
const simIds = typeof argv.sim === 'string' ? [argv.sim] : argv.sim
const filename = argv.filename
const apiUrl = argv.api || 'https://api.onomondo.com'
const isWritingToStdout = argv._.includes('-')
const isWritingToFile = !!filename
const hasAllRequiredParams = token && simIds && simIds.length
const isWritingToStdoutOrFile = isWritingToStdout || isWritingToFile
const isWritingToStdoutAndFile = isWritingToStdout && isWritingToFile
let capturedPackets = 0
let capturedBytes = 0

if (!hasAllRequiredParams) {
  console.error([
    `Onomondo Live ${pkgJson.version}`,
    'Intercept all data between a device and the network, seen from the network\'s perspective.',
    'Output to a PCAP file, or pipe to another tool that can read PCAP files (like Wireshark).',
    '',
    'Write to file:',
    'onomondo-live --token=a1b2c3 --sim=012345678 --filename=output.pcap',
    '',
    'Write to standard output:',
    'onomondo-live --token=a1b2c3 --sim=012345678 -',
    '',
    'Pipe to Wireshark example:',
    'onomondo-live --token=a1b2c3 --sim=012345678 - | wireshark -k -i -',
    '',
    'You need to use the ID of one or more of your SIMs, and an API token.',
    'It is also possible to use the token used in the app. Get this by visiting https://app.onomondo.com and look at the network tab in developer tools.',
    '',
    'If you want to listen to multiple SIMs you can supply multiple --sim params, like this: --sim=111111111 --sim=222222222'
  ].join('\n'))
  process.exit(1)
}

if (!isWritingToStdoutOrFile) {
  console.error('You need to either write to file, or to standard output. Not both.')
  process.exit(1)
}

if (!isWritingToStdoutOrFile) {
  console.error('You need to either write to file, or to standard output.')
  process.exit(1)
}

if (isWritingToStdout) {
  // Kill process if the process piped to is closed, and not writing to a file
  process.stdout.on('error', () => { }) // ignore errors
  process.stdout.on('close', () => process.exit(0))
}

pcapGenerator.writeHeader({ filename, stdout: isWritingToStdout })

connect()

function connect () {
  const socket = io(apiUrl, { path: '/monitor' })

  socket.on('connect', () => {
    console.error('Connected')
    socket.emit('authenticate', token)
  })

  socket.on('error', err => {
    const isNotAuthenticated = err === 'Not authenticated'

    if (isNotAuthenticated) {
      console.error('Authenticated failed. Token is incorrect')
      process.exit(1)
    }

    console.error(`Error: ${err}`)
  })

  socket.on('disconnect', () => {
    console.error('Connection closed. Trying to re-establish')
    socket.disconnect()
    setTimeout(connect, 1000)
  })

  socket.on('authenticated', () => {
    console.error('Authenticated')
    simIds.forEach(simId => socket.emit('subscribe:packets', simId))
  })

  socket.on('subscribed:packets', ({ simId, ip }) => {
    console.error(`Attached. SIM id=${simId}. ip=${ip}`)
  })

  socket.on('packets', ({ simId, packet: hexString }) => {
    const timestamp = Date.now()
    const packet = Buffer.from(hexString, 'hex')

    capturedPackets += 1
    capturedBytes += packet.length

    log(`Captured: ${capturedPackets} packet${capturedPackets === 1 ? '' : 's'} (${prettyBytes(capturedBytes)})`)

    pcapGenerator.appendPacket({ packet, filename, timestamp, stdout: isWritingToStdout })
  })
}

#!/usr/bin/env node

const pcapGenerator = require('./pcap-generator')
const io = require('socket.io-client')
const minimist = require('minimist')
const prettyBytes = require('pretty-bytes')
const log = require('single-line-log').stderr
const pkgJson = require('./package.json')
const getPackageJson = require('package-json')

const ALLOWED_PARAMS = ['token', 'key', 'sim', 'filename', 'api', '-', '_']

const argv = minimist(process.argv.slice(2), { string: 'sim' })
const apiKey = argv.key || argv.token
const allParams = Object.keys(argv)
const simIds = typeof argv.sim === 'string' ? [argv.sim] : argv.sim
const filename = argv.filename
const apiUrl = argv.api || 'https://api.onomondo.com'
const isWritingToStdout = argv._.includes('-')
const isWritingToFile = !!filename
let capturedPackets = 0
let capturedBytes = 0
let isAuthenticated = false

checkPrerequisites().then(run)

async function checkPrerequisites() {
  const publicVersion = await getPublicVersion()
  const isUsingCorrectVersion = pkgJson.version === publicVersion
  const disallowedParams = allParams.filter(param => !ALLOWED_PARAMS.includes(param))
  const hasAllRequiredParams = apiKey && simIds?.length
  const hasOnlyAllowedParams = disallowedParams.length === 0
  const hasNoParameters = allParams.includes('_') && allParams.length === 1
  const isWritingToStdoutOrFile = isWritingToStdout || isWritingToFile
  const isWritingToStdoutAndFile = isWritingToStdout && isWritingToFile
  const areSimsCorrectLength = simIds?.filter(id => id.length === 9).length > 0

  if (isUsingCorrectVersion) console.error(`Onomondo Live ${pkgJson.version}\n`)
  if (!isUsingCorrectVersion) console.error(`Onomondo Live ${pkgJson.version}. You are currently using an outdated version. The latest is ${publicVersion}.\n`)
  if (hasNoParameters) {
    exit([
      'Use onomondo-live to capture all data between devices and the Onomondo network, seen from the Onomondo\'s perspective.',
      'Output to a pcap file, or pipe to another tool that can read pcap files (like Wireshark).',
      '',
      'Write to file:',
      'onomondo-live --key=a1b2c3 --sim=012345678 --filename=output.pcap',
      '',
      'Write to standard output:',
      'onomondo-live --key=a1b2c3 --sim=012345678 -',
      '',
      'Pipe to Wireshark:',
      'onomondo-live --key=a1b2c3 --sim=012345678 - | wireshark -k -i -',
      '',
      'You need to use the id of one or more of your sims, and an Onomondo api key.',
      'You can generate an api key in the app, https://app.onomondo.com.',
      '',
      'If you want to listen to multiple sims you can supply multiple --sim params, like this: --sim=111111111 --sim=222222222'
    ].join('\n'))
  }
  if (!hasOnlyAllowedParams) exit(`You are using illegal paramters: ${disallowedParams.join(', ')}`)
  if (!hasAllRequiredParams && !apiKey) exit('You are missing a required parameter: --key')
  if (!hasAllRequiredParams && !simIds?.length) exit('You are missing a required paramter: --sim')
  if (!isWritingToStdoutOrFile) exit('You are missing a required parameters: Either write to file (--filename), or to standard output (-)')
  if (isWritingToStdoutAndFile) exit('You need to either write to file, or to standard output. Not both.')
  if (!areSimsCorrectLength) exit('Some of the sims are not exactly 9 digits long')
}

function run () {
  if (isWritingToStdout) {
    // Kill process if the process piped to is closed, and not writing to a file
    process.stdout.on('error', () => { }) // ignore errors
    process.stdout.on('close', () => process.exit(0))
  }

  pcapGenerator.writeHeader({ filename, stdout: isWritingToStdout })
  connect()
}

function connect () {
  const socket = io(apiUrl, { path: '/monitor', withCredentials: true })
  const COOKIE_NAME = 'AWSALB'

  // https://socket.io/how-to/deal-with-cookies
  socket.io.on('open', () => {
    socket.io.engine.transport.on('pollComplete', () => {
      const request = socket.io.engine.transport.pollXhr.xhr
      const cookieHeader = request.getResponseHeader('set-cookie')
      if (!cookieHeader) return

      cookieHeader.forEach(cookieString => {
        if (cookieString.includes(`${COOKIE_NAME}=`)) {
          const cookieValue = cookie.parse(cookieString)
          socket.io.opts.extraHeaders = {
            cookie: `${COOKIE_NAME}=${cookieValue[COOKIE_NAME]}`
          }
        }
      })
    })
  })

  socket.on('connect', () => {
    socket.emit('authenticate', apiKey)
  })

  function onerror (err) {
    const isNotAuthenticated = err === 'Not authenticated'

    if (isNotAuthenticated) {
      exit('Authenticated failed. Api key is incorrect')
    }

    console.error(`Error: ${err}`)
  }

  socket.on('error', onerror)
  socket.on('subscribe-error', onerror)

  socket.on('disconnect', err => {
    const hasServerForcefullyDisconnectedClient = err === 'io server disconnect'
    if (hasServerForcefullyDisconnectedClient && isAuthenticated) return console.error('The server disconnected you')
    if (hasServerForcefullyDisconnectedClient && !isAuthenticated) return console.error('The server disconnected you. Is the api key correct?')

    console.error('Connection closed. Trying to re-establish')
    socket.disconnect()
    setTimeout(connect, 1000)
  })

  socket.on('authenticated', () => {
    isAuthenticated = true
    console.error('Connected and authenticated')
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

function exit (err) {
  console.error(err)
  console.error()
  console.error('See https://github.com/onomondo/onomondo-live for more information')
  process.exit(1)
}

async function getPublicVersion () {
  const pkgJson = await getPackageJson('onomondo-live')
  return pkgJson.version
}

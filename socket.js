const SockJS = require('sockjs-client')
const EventEmitter = require('events')

module.exports = url => {
  const that = new EventEmitter()
  const socket = new SockJS(url)

  socket.onopen = () => that.emit('open')
  socket.onclose = () => that.emit('close')
  socket.onmessage = ({ data }) => {
    try {
      data = JSON.parse(data)
    } catch (err) {
      return that.kill('Only JSON allowed')
    }

    that.emit(data.event, data.data)
  }

  that.send = (event, data) => socket.send(JSON.stringify({ event, data }))
  that.kill = err => {
    if (!err) return socket.close()

    that.send('error', err.message || err)
    setTimeout(() => socket.close(), 500)
  }

  return that
}

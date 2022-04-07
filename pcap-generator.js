// Generator for the pcap file format, https://wiki.wireshark.org/Development/LibpcapFileFormat
const fs = require('fs')

module.exports = {
  writeHeader ({ filename, stdout }) {
    const opts = {
      magicNumber: 2712847316,
      majorVersion: 2,
      minorVersion: 4,
      gmtOffset: 0,
      timestampAccuracy: 0,
      snapshotLength: 65535,
      linkLayerType: 101
    }

    const header = Buffer.alloc(24)
    header.writeUInt32BE(opts.magicNumber, 0) // 4
    header.writeUInt16BE(opts.majorVersion, 4) // 2
    header.writeUInt16BE(opts.minorVersion, 6) // 2
    header.writeInt32BE(opts.gmtOffset, 8) // 4
    header.writeUInt32BE(opts.timestampAccuracy, 12) // 4
    header.writeUInt32BE(opts.snapshotLength, 16) // 4
    header.writeUInt32BE(opts.linkLayerType, 20) // 4

    if (stdout) process.stdout.write(header)
    if (filename) fs.writeFileSync(filename, header)
  },
  appendPacket ({ filename, stdout, timestamp, packet }) {
    const packetHeader = Buffer.alloc(16)
    const seconds = Math.floor(timestamp / 1000)
    const microseconds = Math.floor(((timestamp / 1000) % 1) * 1000000)

    packetHeader.writeUInt32BE(seconds, 0) // 4
    packetHeader.writeUInt32BE(microseconds, 4) // 4
    packetHeader.writeUInt32BE(packet.length, 8) // 4
    packetHeader.writeUInt32BE(packet.length, 12) // 4

    const buffer = Buffer.concat([packetHeader, packet])

    if (stdout) process.stdout.write(buffer)
    if (filename) fs.appendFileSync(filename, buffer)
  }
}

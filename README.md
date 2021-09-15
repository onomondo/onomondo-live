# onomondo-live

Capture all traffic between a device and the network, seen from the network's perspective.

Output to a pcap file, or pipe to another tool that can read pcap files (like Wireshark).

## Installation

You need to have [node](https://nodejs.org/en/download/) and `npm` installed on your system.

Then run this command:
`$ npm install onomondo-live --global`

## Usage

You need to use the id of one or more of your sims, and an Onomondo api key.

If you want to listen to multiple sims you can supply multiple --sim params, like this: `--sim=111111111 --sim=222222222`

### Write to file
`$ onomondo-live --key=onok_a1b2c3.f00ba5 --sim=012345678 --filename=output.pcap`

### Write to standard output
`$ onomondo-live --key=onok_a1b2c3.f00ba5 --sim=012345678 -`

### Pipe to Wireshark example
`$ onomondo-live --key=onok_a1b2c3.f00ba5 --sim=012345678 - | wireshark -k -i -`


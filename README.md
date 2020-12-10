# onomondo-live

Capture all traffic between a device and the network, seen from the network's perspective.

Output to a PCAP file, or pipe to another tool that can read PCAP files (like Wireshark).

## Installation

You need to have [node](https://nodejs.org/en/download/) and `npm` installed on your system.

Then run this command:
`$ npm install onomondo-live --global`

## Usage

You need to use the ID of one or more of your SIMs, and an API token.

It is also possible to use the token used in the app. Get this by visiting https://app.onomondo.com and look at the network tab in developer tools.

If you want to listen to multiple SIMs you can supply multiple --sim params, like this: `--sim=111111111 --sim=222222222`

### Write to file
`$ onomondo-live --token=a1b2c3 --sim=012345678 --filename=output.pcap`

### Write to standard output
`$ onomondo-live --token=a1b2c3 --sim=012345678 -`

### Pipe to Wireshark example
`$ onomondo-live --token=a1b2c3 --sim=012345678 - | wireshark -k -i -`


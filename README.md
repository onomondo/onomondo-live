# onomondo-live

Get packets sent from your devices, and save them as a PCAP file.

## Installation

`$ npm install onomondo-live -g`

## Usage

You need to use the ID of one of your SIMs, and an API token.

You can also use the token used in the app. Get this by visiting `app.onomondo.com` and look at the network tab in developer tools.

`$ onomondo-live --token=a1b2c4 --sim=000000001 --filename=output.pcap`

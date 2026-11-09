---
title: "NeoPAN: Sharing an Android Phone's Network with a Mac over Bluetooth"
description: "An Android and macOS project that forwards network connections over Bluetooth Classic RFCOMM. How it works, what has been tested, and its current compatibility limits."
lang: en
urlSlug: neopan-android-mac-bluetooth-network
translationKey: neopan-android-mac-bluetooth-network
category: computing
tags: [NeoPAN, Android, macOS, Bluetooth, SOCKS5]
pubDate: "2026-11-09"
draft: false
featured: false
sourceRevision: "f6dfb8f4d620ed39d7ad46e98e07eed9623106a3"
---

## Introduction

I recently built a small project called NeoPAN to let a Mac use an Android phone's network over Bluetooth. Once the devices are paired, the phone starts its sharing service and the Mac connects when needed. When the computer disconnects, the phone keeps waiting for the next connection.

The project currently consists of an Android server and a macOS client, with data carried over Bluetooth Classic RFCOMM. After connecting, the Mac provides a local SOCKS5 proxy that applications can use to reach the network through the phone. There is also an experimental system IPv4 mode for testing traffic from ordinary applications through a virtual network interface.

This post introduces the workflow and some of the problems involved in turning a Bluetooth connection into a working network connection. It is based on the code and test records available as of 8 November 2026.

## The phone waits; the computer connects

First, pair the phone and Mac in their system Bluetooth settings. The phone needs a working network connection. Start the NeoPAN service on Android and grant the nearby-devices permission. The service then runs in the foreground, waiting for paired computers to connect.

Select the phone in the Mac client and connect. The SOCKS5 proxy is available at `127.0.0.1:10808`. For example, on an already connected Mac, HTTPS access can be checked from a terminal with:

```sh
curl -q --proxy socks5h://127.0.0.1:10808 --noproxy '' https://www.apple.com/library/test/success.html
```

`socks5h` passes the hostname to the proxy side for resolution, and the phone connects to the destination. Clearing the `no_proxy` bypass rules helps check that the request actually uses the proxy. HTTPS certificate verification remains enabled.

The computer can disconnect independently while the phone service continues running, so there is no need to restart sharing on the phone each time. The Android home screen shows cumulative traffic, transfer rates in both directions, and a 60-second history. Each client also has its own connection duration, traffic counters, and disconnect control.

<figure>
  <img src="/images/blog/neopan-android-mac-bluetooth-network/android-waiting.png" alt="NeoPAN Android home screen with the service running, waiting for a paired computer, and current transfer rates at zero" width="720" height="1604" loading="lazy" decoding="async" style="width:100%;max-width:360px;height:auto;display:block;margin-inline:auto" />
  <figcaption>The Android service waiting for a connection. Device names are hidden; traffic counters and connection status retain their actual values.</figcaption>
</figure>

## How data travels over Bluetooth

The current data path is:

```text
Mac application → local SOCKS5 proxy → Bluetooth RFCOMM → Android service → destination
```

The Mac receives an application's connection request and sends the destination and data to the phone. The phone resolves the hostname, opens the outbound connection, and forwards the response. For HTTPS, TLS remains between the application and the destination website; NeoPAN forwards bytes between them.

A single Bluetooth link carries multiple application connections, so both ends distinguish them with stream identifiers in data frames. Each direction waits for downstream acknowledgment after sending data, with limits on write queues and connection counts. These limits help control queued data when a destination receives slowly and support closing or failing individual connections.

Early versions allowed fewer concurrent connections. The Mac proxy, Android proxy, and network worker now share a limit of 256 data streams. Android uses an event loop for TCP forwarding, together with bounded DNS threads and Bluetooth read/write queues. Project records cover holding 256 TCP connections, rejecting a connection beyond the limit, and recovering capacity after connections are released.

This limit describes the concurrency allowed by the software. All connections still share the Bluetooth link, so adding connections does not increase total bandwidth in proportion.

## From an application proxy to system IPv4 access

The local proxy mode is straightforward: an application selects the SOCKS5 address, and NeoPAN forwards its connections. For applications without a proxy setting, the project also includes an optional experimental system IPv4 mode.

This mode creates its own `utun` virtual interface on the Mac. An HEV tun2socks worker passes traffic to the same local proxy and on to the phone over Bluetooth. The network worker runs as an ordinary user; a restricted C helper handles creating the interface, routes, and session DNS state.

Because this changes system networking, enabling it requires local administrator authorization. Disconnecting, quitting the application, or failing a health check should release the network resources created for that session so the original connection can continue to work. Cleanup and recovery are part of the tests.

There is a version difference to keep in mind. The released `0.9.0-beta.1` test package retains a 10-minute limit for system mode. The `0.9.0-beta.2` development candidate removes that fixed limit and adds a native administrator dialog. Within the same application process, disconnecting and reconnecting can reuse the restricted authorization service already started. Restarting the application requires authorization again.

At the time of writing, beta.2 is still a local development candidate. Records cover system networking beyond 10 minutes and reconnection within the same process; longer use still needs further observation.

## Two problems along the way

After pairing, the Mac still needs to find the channel on which the phone currently offers its service. During development, the Mac SDK sometimes continued to supply an old service record after the phone service restarted. Connecting to the stale channel caused the phone to reject the request.

The current solution uses an explicitly enabled, version-gated compatibility adapter to read actual SDP service records, identify the channel by service UUID, and then establish RFCOMM. There are physical-device records for outbound connections, reconnection, and HTTPS using this path, but it has only been verified on macOS 27.2 / 26B123. Other macOS versions need separate checks, and the current release package is Apple Silicon arm64 only.

Another problem appeared after hostname resolution. One SSH destination returned both IPv6 and IPv4 addresses. The preferred IPv6 connection timed out, while IPv4 returned the service identification quickly. The old code tried only the first address, causing the whole request to time out.

Beta.2 reads all returned addresses and makes bounded connection attempts interleaved by address family. After the change, both hostname-based SOCKS and system `utun` paths exchanged SSH identification and key-exchange initialization messages. These tests did not authenticate an account or log in; they covered connection establishment and the initial protocol exchange.

## Throughput, counters, and current scope

In one Pixel test with four streams and a 20-second measurement interval, aggregate receiver-side throughput was about 1.44 Mbps from Mac to phone and 0.89 Mbps from phone to Mac. The directions were measured separately. Data crossed the actual Bluetooth link to a loopback iperf service on the phone, without using an internet speed-test site. These are effective TCP throughput samples for NeoPAN under those conditions, rather than a measurement of maximum hardware throughput.

Beta.2 adds bidirectional throughput testing to the Android client card. Test data travels between the two endpoints to show throughput under the current load. The test itself consumes shared Bluetooth bandwidth, so concurrent browsing or synchronization affects the result.

The round-trip latency shown in the Android interface measures Bluetooth round trips from the phone to the connected Mac. It does not measure internet latency to a website. Traffic counters represent forwarded data payloads from the phone's perspective and do not include all Bluetooth radio overhead.

<figure>
  <img src="/images/blog/neopan-android-mac-bluetooth-network/android-client.png" alt="NeoPAN Android client card with device name hidden, showing 3.0 MB transferred in each direction, connection duration, and a 26 ms Bluetooth round-trip sample" width="720" height="1604" loading="lazy" decoding="async" style="width:100%;max-width:360px;height:auto;display:block;margin-inline:auto" />
  <figcaption>Client traffic and an on-demand latency check. The 26 ms value is one Bluetooth round-trip sample, not internet latency or a stable upper bound.</figcaption>
</figure>

There are test records for TCP, hostname resolution on the phone, UDP forwarding, and real ICMP Echo through the phone. System integration remains scoped to IPv4. System IPv6 handling, other ICMP/PMTU behavior, QUIC/HTTP3, and prolonged Doze operation have not completed acceptance testing. The software allows registration of up to four paired devices, but four physical computers connected simultaneously still need testing.

Native BNEP/PAN was another route investigated early in the project, and link establishment remains blocked. The working path described here relies on NeoPAN applications at both ends forwarding traffic over RFCOMM. An iPhone client has not been implemented. Tailscale has a separately installed compatibility solution for a fixed version on the test machine; general VPN coexistence remains to be verified.

## Further work

A `0.9.0-beta.1` test package exists for both platforms, and the beta.2 Android and Mac candidates have been built. Dual-platform builds, artifact assembly, and SHA-256 verification have run successfully in GitHub Actions. Physical Bluetooth and system-network tests continue to be performed separately on local devices.

The next work includes compatibility records for more systems and devices, longer-running sessions, and recovery after disconnection, followed by formal signing and macOS notarization. The current Mac test package is still ad hoc signed and has not been notarized.

The code is hosted at [Mantains/MacPAN](https://github.com/Mantains/MacPAN), while the application is named NeoPAN. The repository is currently private, so this post records the implementation and progress without providing a download available to all readers.

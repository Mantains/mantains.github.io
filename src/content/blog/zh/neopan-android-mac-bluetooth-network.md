---
title: "MacPAN：让 Mac 通过蓝牙使用 Android 手机的网络"
description: "最近做了一个 Android 与 macOS 双端项目，通过经典蓝牙 RFCOMM 转发网络连接。记录它的使用方式、实现过程，以及目前的测试和兼容范围。"
lang: zh
urlSlug: neopan-android-mac-bluetooth-network
translationKey: neopan-android-mac-bluetooth-network
category: computing
tags: [MacPAN, Android, macOS, Bluetooth, SOCKS5]
pubDate: "2026-11-09"
updatedDate: "2026-11-09"
draft: false
featured: false
sourceRevision: "f6dfb8f4d620ed39d7ad46e98e07eed9623106a3"
---

## 前言

最近我做了一个叫 MacPAN 的小项目，想让已经与手机配对的 Mac，通过蓝牙使用 Android 手机的网络。手机开启一次共享服务，电脑需要联网时主动连接；电脑断开之后，手机继续等待下一次连接。

目前项目包含 Android 服务端和 macOS 客户端，使用经典蓝牙 RFCOMM 传输数据。Mac 连接后提供一个本机 SOCKS5 代理，支持代理的应用就可以通过手机联网。另外还做了一个系统 IPv4 接入模式，用于测试普通应用经虚拟网卡使用这条链路。

这篇主要介绍项目的使用方式，以及从蓝牙连接到实际联网过程中处理的一些问题。内容依据截至 2026 年 11 月 8 日的代码和测试记录整理。

## 手机等待，电脑主动连接

使用时，先在系统设置中完成手机和 Mac 的蓝牙配对。手机自己需要有可用的网络，然后在 Android 端开启 MacPAN 服务，并允许附近设备权限。服务开启后会保持前台运行，等待已配对的电脑连接。

Mac 端选择手机并连接，就可以使用 `127.0.0.1:10808` 上的 SOCKS5 代理。比如，在已经连接的 Mac 终端中，可以这样检查 HTTPS 访问：

```sh
curl -q --proxy socks5h://127.0.0.1:10808 --noproxy '' https://www.apple.com/library/test/success.html
```

其中 `socks5h` 会把域名交给代理一侧解析，再由手机连接目标网站。这里清空 `no_proxy` 的绕过规则，便于检查请求是否经过代理；HTTPS 的证书校验仍然保留。

电脑可以单独断开连接，手机服务继续运行，不需要每次都在手机上重新点击。Android 首页可以看到累计流量、双向速率和最近 60 秒的曲线，每台客户端也有自己的连接时长、流量统计和断开入口。

<figure>
  <img src="/images/blog/neopan-android-mac-bluetooth-network/android-waiting.png" alt="MacPAN Android 首页：服务已开启，正在等待已配对电脑连接，当前速率为零" width="720" height="1604" loading="lazy" decoding="async" style="width:100%;max-width:360px;height:auto;display:block;margin-inline:auto" />
  <figcaption>Android 端开启服务后等待连接。截图来自更名前的测试版，已隐藏设备名称，累计流量和连接状态保留实际显示。</figcaption>
</figure>

## 数据怎样经过蓝牙

MacPAN 目前的数据路径可以简单写成：

```text
Mac 应用 → 本机 SOCKS5 → 蓝牙 RFCOMM → Android 服务 → 目标网站
```

Mac 端接收应用的连接请求，把目标地址和数据交给手机。手机负责解析域名、建立出站连接，再把收到的数据传回来。HTTPS 的 TLS 连接仍然建立在应用与目标网站之间，MacPAN 在中间转发字节。

一条蓝牙链路需要承载多个应用连接，因此两端使用带有流编号的数据帧区分它们。每个方向发送数据后等待下游确认，并限制写入队列和连接数量。这样在某个目标接收较慢时，可以控制排队占用，也便于处理单个连接的关闭与失败。

早期版本的并发数量比较少，后来将 Mac 代理、Android 代理和网络 worker 的数据流上限统一为 256。Android 使用事件循环处理 TCP 转发，另设有界的 DNS 线程和蓝牙读写队列。项目记录中验证过 256 条 TCP 连接保持、超出上限时拒绝，以及释放连接后恢复容量。

这个上限表示软件允许的并发规模。各条连接仍共享同一条蓝牙链路，增加连接数并不会按比例增加总带宽。

## 从应用代理到系统 IPv4 接入

本机代理模式比较直接：应用自己选择 SOCKS5 地址，MacPAN 负责转发。对于没有代理设置入口的应用，项目还加入了可选的系统 IPv4 实验模式。

这个模式在 Mac 上创建自有的 `utun` 虚拟网卡，由 HEV tun2socks worker 将流量交给同一个本机代理，再经蓝牙传给手机。网络 worker 以普通用户运行，创建网卡、路由和会话 DNS 等操作由受限的 C helper 处理。

由于涉及系统网络设置，启用时需要本机管理员授权。断开连接、退出应用或健康检查失败后，需要回收本次创建的网络资源，让原有网络继续使用。这里的清理和恢复也是测试内容的一部分。

版本之间有一个需要区分的地方：已发布的 `0.9.0-beta.1` 测试包，系统模式仍有 10 分钟上限；开发中的 `0.9.0-beta.2` 已移除这个固定上限，并加入原生管理员对话框。同一次应用运行期间，断开和重连可以复用已启动的受限授权服务。重新启动应用后仍需重新授权。

截至本文整理时，beta.2 还是本地开发候选。记录中已有超过 10 分钟的系统联网和同进程重连测试，尚需继续观察更长时间的使用情况。

## 连接过程中的两个问题

蓝牙配对完成后，还需要找到手机当前提供服务的通道。开发中遇到过手机服务重启后，Mac SDK 继续提供旧服务记录的情况；使用旧通道连接时，手机会拒绝请求。

目前通过一个显式启用、受系统版本限制的兼容适配读取实际 SDP 服务记录，按服务 UUID 确定通道，再建立 RFCOMM 连接。这条路径已经有主动连接、重连和 HTTPS 的实机记录，但只核验了 macOS 27.2 / 26B123。其他 macOS 版本仍需要单独检查，现阶段也只有 Apple Silicon arm64 发布包。

另一个问题出现在域名解析之后。有一个 SSH 目标同时返回 IPv6 和 IPv4 地址，首选 IPv6 连接超时，IPv4 却能较快返回服务标识。原来的代码只尝试第一个地址，因此整个请求也跟着超时。

beta.2 改为读取全部地址，按地址族交错进行有界连接尝试。修改后，域名 SOCKS 和系统 `utun` 两条路径都完成了 SSH 标识及密钥交换初始化消息的传输。这项测试没有进行账户认证或登录，确认的是连接建立和初始协议交换。

## 速率、流量和目前的适用范围

在 Pixel 的一次四流、20 秒统计中，Mac→手机和手机→Mac 的接收端聚合吞吐分别约为 1.44 和 0.89 Mbps。两个方向分别测量，数据经过实际蓝牙链路，手机端目标是回环 iperf 服务，没有使用公网测速网站。这是当时 MacPAN 的有效 TCP 吞吐样本，还不能据此确定硬件最大速率。

beta.2 在 Android 客户端卡片中加入了双向测速，可以在两端之间传输测试数据，观察当前负载下的吞吐。测速也会占用共享蓝牙带宽，同时进行浏览或同步时，结果会受到影响。

Android 界面里的往返延迟则是手机到已连接 Mac 的蓝牙往返，不是访问网站的互联网延迟。流量统计以手机视角的转发数据载荷为基础，也不包含全部蓝牙空口开销。

<figure>
  <img src="/images/blog/neopan-android-mac-bluetooth-network/android-client.png" alt="MacPAN Android 客户端卡片：设备名称已隐藏，显示累计双向各 3.0 MB、连接时长和一次 26 ms 蓝牙往返样本" width="720" height="1604" loading="lazy" decoding="async" style="width:100%;max-width:360px;height:auto;display:block;margin-inline:auto" />
  <figcaption>客户端流量和按需延迟。图中的 26 ms 是当次蓝牙往返样本，不能当作互联网延迟或稳定上限。</figcaption>
</figure>

目前 TCP、手机侧域名解析、UDP 转发和手机真实 ICMP Echo 路径都有相应测试记录。系统接入仍以 IPv4 为范围，IPv6 系统接管、其他 ICMP/PMTU、QUIC/HTTP3 和长期 Doze 下的行为还没有完成验收。软件设定最多登记 4 台已配对设备，但 4 台实体电脑同时连接也还需要测试。

原生 BNEP/PAN 是项目早期调查过的另一条路线，目前仍未建链成功。这篇所介绍的可用路径依靠两端 MacPAN 应用通过 RFCOMM 转发。iPhone 客户端尚未实现；Tailscale 也只有固定版本、单独安装的本机兼容方案，通用 VPN 共存仍待验证。

## 后续整理

目前已经有 `0.9.0-beta.1` 双端测试包，beta.2 的 Android 和 Mac 候选也已完成构建。GitHub Actions 中的双端构建、附件汇总和 SHA-256 校验已经跑通，真实蓝牙与系统网络测试仍在本机单独进行。

接下来需要继续补充不同系统与设备的兼容记录、较长时间运行和断线恢复测试，再处理正式签名与 macOS 公证。目前 Mac 测试包仍是 ad hoc 签名，尚未公证。

项目代码托管在 [Mantains/MacPAN](https://github.com/Mantains/MacPAN)。仓库目前仍为私有，这篇先记录实现过程和已有进展，暂不提供面向所有读者的下载入口。

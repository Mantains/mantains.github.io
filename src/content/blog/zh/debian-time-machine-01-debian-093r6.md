---
title: "Debian 时间机器（一）：安装 Debian 0.93R6，用 Gnuplot 和 LaTeX 制作文章"
description: "从空白磁盘安装 Debian 0.93R6，用当年的 Gnuplot、LaTeX 和 BibTeX 制作带图表及参考文献的文章，再在现代宿主上转换为 PDF。"
lang: zh
urlSlug: debian-time-machine-01-debian-093r6
translationKey: debian-time-machine-01-debian-093r6
category: computing
tags: [Debian, Linux, QEMU, Retrocomputing, LaTeX, Gnuplot]
pubDate: "2026-10-24"
draft: false
featured: false
sourceRevision: "9f60cd302abf374754447094804d7d1c0c31d547"
---

## 前言

Gnuplot、LaTeX 和 BibTeX 可以分别用来绘制图表、排版文章和管理参考文献。这些软件在 1995 年的 Debian 0.93R6 中就已经存在了。本文尝试从空白磁盘开始安装这套系统，再使用当时的软件制作一篇带图表和参考文献的文章。

整个过程分为两部分：先在老 Debian 中生成图表、DVI 和 PostScript 文件（以下简称 PS），再将 PS 传回现代系统，转换为 PDF。为了方便跟着操作，我把下载、文件传输和构建所需的脚本放在了配套仓库中。我们可以直接在控制台完成这些步骤，暂时不需要配置图形桌面或 SSH。

本文使用的工具版本固定在 [debian-history-paper 的这个提交](https://github.com/Mantains/debian-history-paper/tree/9f60cd302abf374754447094804d7d1c0c31d547)。其中的 Python 工具只使用标准库，不需要通过 pip 安装其他依赖；QEMU、文件系统工具和 PDF 转换软件则通过宿主系统的软件包管理器安装。

2026 年 10 月 24 日，我使用新建的空白磁盘重新走了一遍下面的流程，最终得到两页 A4 PDF，并检查了正文、引用、参考文献和图表。这里使用的是专门兼容旧工具链的示例文章，任意现代 LaTeX 项目不一定能直接编译。

## 1. 准备宿主环境

这里把运行 QEMU 的现代 Linux 系统称为“宿主”，虚拟机中的 Debian 0.93R6 称为“客体”。下面会分别标明命令在哪一边执行。

本文实际使用的是 WSL2 中的 Debian trixie，QEMU 窗口通过 WSLg 显示。使用 Debian/Ubuntu 桌面系统的读者也可以从宿主的 Linux 终端开始，但需要先确认下面列出的 QEMU 版本要求。首先安装工具，下载配套仓库，并切换到本文使用的版本：

```bash
sudo apt update
sudo apt install python3 git qemu-system-x86 qemu-system-gui qemu-utils e2fsprogs ghostscript poppler-utils
cd "$HOME"
git clone https://github.com/Mantains/debian-history-paper.git
cd debian-history-paper
git checkout --detach 9f60cd302abf374754447094804d7d1c0c31d547
LAB="$HOME/debian093-lab"
python3 retro093.py --work "$LAB" prepare
python3 retro093.py --work "$LAB" init
```

本次使用的版本为 QEMU 10.0.13、Python 3.13 和 e2fsprogs 1.47.2。启动脚本指定了 `pc-i440fx-9.2` 机型，因此需要使用提供该机型的 QEMU（9.2 或更新版本）。可以运行 `qemu-system-i386 -machine help` 查看；如果列表中没有这个机型，需要先升级 QEMU，再继续启动虚拟机。

`prepare` 会下载五份安装介质、需要的原版软件包，以及固定版本的四个文章源码文件，并检查文件大小和 SHA-256。之后，`init` 创建下面两块磁盘：

| 文件 | 容量 | 内容及客体位置 |
| --- | --- | --- |
| `system.img` | 512 MiB | 空白系统盘，客体 `/dev/hda`；安装时创建 `/dev/hda1` |
| `bootstrap.img` | 16 MiB | ext2 revision 0，无分区表，客体整个 `/dev/hdb`；只预置 netbase、Lynx、LILO 和 bootstrap.sh，之后也用于导出结果 |

如果工作目录中已经有磁盘，工具会停止，以免覆盖。需要重新安装时，换一个新的 `--work` 路径即可。注意，辅助盘没有分区表，后面要挂载的是整个 `/dev/hdb`，不是 `/dev/hdb1`。

`prepare` 可以重复运行，已经下载的文件也会重新校验。遇到下载失败或校验不符时，先根据提示处理，再继续后面的步骤。文件来源、版本和校验值都保存在 `$LAB/www/manifest.json` 中。

## 2. 启动宿主 HTTP 服务和虚拟机

接下来需要同时保留三个宿主终端：A 运行 HTTP 服务，B 运行虚拟机，C 用于换软盘等操作。首先在终端 A 的仓库根目录中运行：

```bash
LAB="$HOME/debian093-lab"
python3 retro093.py --work "$LAB" serve
```

这个服务用于把准备好的软件包和源码交给老 Debian，只监听宿主的 `127.0.0.1:8000`，提供 `$LAB/www` 中的文件。虚拟机通过 QEMU 的 user 网络访问 `10.0.2.2:8000`，就能连接到它。Windows 用户注意，HTTP 服务和 QEMU 要运行在同一个 WSL 发行版中。

终端 B 执行：

```bash
cd "$HOME/debian-history-paper"
LAB="$HOME/debian093-lab"
python3 retro093.py --work "$LAB" run --boot install
```

QEMU 窗口会显示软盘引导提示。终端 B 在窗口关闭前保持占用。后续宿主换盘命令在终端 C 执行，先准备同一工作目录：

```bash
cd "$HOME/debian-history-paper"
LAB="$HOME/debian093-lab"
```

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-installer-2026-10-24.png" alt="Debian 0.93R6 原版软盘安装器欢迎画面" width="720" height="400" loading="lazy" decoding="async" />

## 3. 从软盘安装基础系统

以下按屏幕提示操作。键盘被 QEMU 捕获时，按 Ctrl+Alt 可释放。不要把现代宿主的真实磁盘路径传给虚拟机。

1. 在 `boot:` 提示符按 Enter。等待 `Insert Debian GNU/Linux Root Disk and press <ENTER>`。
2. 在宿主终端 C 执行：

   ```bash
   python3 retro093.py --work "$LAB" change 1440_root_floppy
   ```

   回到 QEMU 按 Enter，等待读盘结束。
3. 欢迎页选 OK，显示设置选 Continue，安装模式选 **Expert**。
4. 选 **1 Partition A Hard Disk**，磁盘选 **/dev/hda**。在 cfdisk 中依次选择 New → Primary，大小用默认值占满磁盘；设置 Bootable。选择 Write（快捷键是大写 W），输入 `yes`，等待写入完成，再 Quit。
5. 选 **3 Prepare A Linux Partition**，输入框已有 `/dev/`，在后面补 `hda1`。等待格式化和坏块检查完成；512 MiB 在模拟环境中也可能需要几分钟。
6. 选 **4 Mount/Unmount Partitions**，按其命令提示把 hda1 挂到根目录：输入 `m`，设备框已有 `/dev/`，补 `hda1`；目录框已有 `/`，直接 Enter；最后输入 `c` 继续。不是把它挂到宿主目录。
7. 选 **5 Install Debian GNU/Linux**，确认根分区 `/dev/hda1`，来源选 `/dev/fd0`。按提示依次换入三个分卷：

   ```bash
   python3 retro093.py --work "$LAB" change 1440_base_floppy-1
   python3 retro093.py --work "$LAB" change 1440_base_floppy-2
   python3 retro093.py --work "$LAB" change 1440_base_floppy-3
   ```

   **每次只执行当前所需的一条**，回到 QEMU 按 Enter，等下一张盘的提示再换。第三张官方下载只有 1,119,232 字节，这是完整分卷；但 QEMU 软驱需要标准容量。工具保留原件与校验值，另生成补零到 1,474,560 字节的 `.img` 副本，`change` 命令自动选择该副本。直接插入未补齐的第三张会出现 `/dev/fd0: No such device or address`。
8. 选 **6 Configure Debian GNU/Linux**，确认根分区，选择键盘；本次使用 `en.us`。各模块选择页保持默认，不额外加载模块。主机名用 `debian`，域名留空，时区按实际所在地选择。
9. 在重启之前，把软盘换回引导盘：

   ```bash
   python3 retro093.py --work "$LAB" change 1440_boot_floppy
   ```

   再选 **9 Reboot The System**。在新的 `boot:` 提示符输入：

   ```text
   linux root=/dev/hda1
   ```

10. 以 root 登录，按首次启动提示设置自己的密码，然后创建一个普通账户（例如 `paper`）并设置密码。姓名、办公室等四项可留空，最后的确认要明确输入 `y`。首次配置接着启动 dselect，选择 **6 [Q]uit** 退出，不在这里选择其他软件。回到 login 提示后，再以 root 和刚设置的密码登录。此时先借软盘内核启动硬盘上的系统；安装 LILO 后才改成直接硬盘引导。

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-first-boot-2026-10-24.png" alt="新建系统盘首次启动后的登录提示" width="720" height="400" loading="lazy" decoding="async" />

## 4. 配置网络并安装 LILO

基础系统安装好之后，我们先使用辅助盘安装网络工具，再通过 HTTP 下载排版软件。以下命令全部在 **Debian 0.93R6 虚拟机内**执行：

```sh
mount -t ext2 /dev/hdb /mnt
ls /mnt
sh /mnt/bootstrap.sh
```

脚本从辅助盘安装 `netbase-1.17-1.deb` 和 `lynx-2.4.2-1.deb`。netbase 会询问 `/etc/init.d/netbase`、gateways、hosts.allow、hosts.deny、rpc 等配置文件差异，均选默认 **N**（Enter），保留安装器生成的版本；Lynx 询问默认主页时也可 Enter。然后脚本设置 ISA NE2000 网络，并通过 HTTP GET 把宿主清单下载到 `/root/resource-manifest.json`。它在本次新安装中运行一次即可；重复执行 `route add` 可能报告路由已存在。

网络配置等价于：

```sh
ifconfig lo 127.0.0.1 up
ifconfig eth0 10.0.2.15 netmask 255.255.255.0 broadcast 10.0.2.255 up
route add -net 10.0.2.0 netmask 255.255.255.0 dev eth0
route add default gw 10.0.2.2
```

`dmesg` 应显示 NE2000 位于 0x300、IRQ 9。若 HTTP 失败，先确认终端 A 仍在运行服务、地址和端口是 `10.0.2.2:8000`，再检查 `ifconfig` 和 `route -n`。客体不需要支持 HTTPS：下载归档和 GitHub HTTPS 的工作由宿主 Python 完成。

接着安装 LILO：

```sh
dpkg -i /mnt/lilo-16-0.deb
```

根据安装脚本的提示确认安装引导器。本教程的根分区是 `/dev/hda1`，引导盘是 `/dev/hda`。安装完成后，我们最后会尝试不挂软盘，直接从硬盘启动。

## 5. 安装绘图和排版软件

接下来在虚拟机内下载并运行软件安装脚本：

```sh
cd /root
lynx -source http://10.0.2.2:8000/install-paper.sh >install-paper.sh
test -s install-paper.sh
sh install-paper.sh
echo $?
```

退出状态应为 0。texlib 配置期间会出现 **Hyphenation** 语言选择框，保留包含 english 的默认选择，确认 OK；不要将整个安装命令的输出重定向到文件，否则可能看不到这个界面。安装脚本以 HTTP GET 获取以下包，按表中顺序交给原装 dpkg；不使用 `--force-depends`。同一次 dpkg 调用会先解包，再按依赖配置，最后保存已安装包清单。

| 软件包文件 | 在此流程中的用途 |
| --- | --- |
| `ncurses-runtime-1.9.4-0.deb` | dialog 所需的 ncurses 运行环境 |
| `dialog-0.6-1.deb` | texlib 的配置工具 |
| `xlib-3.1.2-2.deb` | 提供 mfbin 声明依赖的 `xlibraries`；不安装 X server |
| `kpathsea-2.6-1.deb` | TeX 系列的文件及字体搜索 |
| `mflib-1.0-4.deb` | Metafont 辅助文件及字体生成脚本 |
| `mfbin-2.71-3.deb` | 提供 `metafont`，供 TeX/dvips 的字体生成使用 |
| `texlib-1.0-4.deb` | TeX 宏、断词和标准参考文献样式等辅助文件 |
| `texbin-3.1415-3.deb` | TeX、initex，提供虚拟包 `tex` |
| `mfbasfnt-1.0-3.deb` | 基础字体源文件 |
| `textfm-1.0-3.deb` | 字体度量文件 |
| `latex-2e-4.deb` | LaTeX 格式和宏 |
| `bibtex-0.99c-3.deb` | 参考文献处理 |
| `dvipsk-5.58f-3.deb` | DVI 转 PostScript，及相应 EPS 宏 |
| `gnuplot-3.5-3.deb` | 从数据生成 EPS |

这份软件列表适用于前面通过软盘安装的 Debian 0.93R6，libc 和 shell 等基础组件已经由安装器准备好。这里使用原版二进制包，不需要另外编译 Gnuplot 或 TeX。

安装脚本还会准备好文章所需的四个文件：`debian_intro.tex` 是正文，`plot.gp` 是绘图脚本，`debian.dat` 是数据，`references.bib` 是参考文献数据库。它们保存在 `/root/paper/`，构建脚本则是同目录下的 `build-paper.sh`，不需要在老 Debian 中安装 Git。

文章源码固定在 `ee2486875ebf6074bc008e6b969a49136eb78f77`，与开头下载的工具提交不同。下载工具已经处理了这个对应关系。我们可以先检查文件是否齐全：

```sh
cd /root/paper
ls -l debian_intro.tex plot.gp debian.dat references.bib
```

四个文件长度分别应为 2523、1135、270、200 字节。最终结果包也包含这四个输入，宿主可以再次与下载清单核对。曲线使用仓库中的固定数据，本次没有重新考证各版本的包数量。

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-hyphenation-2026-10-24.png" alt="原装 texlib 配置时的断词语言选择，保留默认选项即可" width="720" height="400" loading="lazy" decoding="async" />

## 6. 绘图和编译文章

文件准备好以后，运行构建脚本：

```sh
sh /root/paper/build-paper.sh
```

下面简单说明脚本做了什么。首先检查 LaTeX 的格式文件；如果 `latex.fmt` 不存在或为空，就进入 `/usr/lib/texmf/ini` 重新生成，相当于执行：

```sh
cd /usr/lib/texmf/ini
initex '\nonstopmode\input latex.ltx' </dev/null >/root/paper/logs/initex.txt 2>&1
ls -l latex.fmt
test -s latex.fmt
```

旧版 LaTeX 会检查源文件的日期，这可能使 `initex` 带着日期警告退出，但格式文件已经生成。因此，脚本会保留初始化日志，并检查 `latex.fmt` 是否非空，再继续编译文章；没有生成格式文件时就停止。这里不需要修改系统时间或宏源码。

接下来回到 `/root/paper`，依次绘图、排版和处理参考文献：

```sh
cd /root/paper
gnuplot plot.gp
latex '\nonstopmode\input debian_intro.tex'
bibtex debian_intro
latex '\nonstopmode\input debian_intro.tex'
latex '\nonstopmode\input debian_intro.tex'
dvips -t a4 debian_intro.dvi -o debian_intro.ps
```

Gnuplot 首先生成 EPS 图表，LaTeX 将它放进文章。第一次运行 LaTeX 后，再运行 BibTeX，随后两次 LaTeX 用来更新参考文献和正文引用，最后用 dvips 输出 A4 大小的 PS 文件。

构建脚本会为每一步保存日志，遇到失败时停止，并检查最终日志中是否存在 `!` 错误或未定义引用。首次运行 dvips 可能还需要由 Metafont 生成 PK 字体，因此会比后续运行慢一些。

最后应有 `debian_plot.eps`、`debian_intro.dvi`、`debian_intro.ps`。脚本会把 PS 和包含源码、日志的 `paper-results.tgz` 复制到已挂载的 `/mnt` 辅助盘。看见 `PAPER-BUILD-PASS` 后再进入下一步。

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-build-pass-2026-10-24.png" alt="新安装的原装工具链构建成功，PS 已写入辅助盘" width="720" height="400" loading="lazy" decoding="async" />

本次生成的 EPS、DVI 和 PS 分别为 4,444、2,736 和 31,385 字节，可作为参考。运行日期、字体缓存和转换器元数据都可能影响输出，因此不要求你生成的文件与这次的哈希完全一致。

## 7. 导出文件并转换为 PDF

客体内执行：

```sh
sync
umount /mnt
shutdown -h now
```

等屏幕真正显示 `System halted`。然后在宿主终端 C 退出模拟器并导出：

```bash
python3 retro093.py --work "$LAB" quit
python3 retro093.py --work "$LAB" export
```

`quit` 只退出模拟器，不能代替 Linux 的正常关机。`export` 拒绝在 QEMU 仍运行时读取辅助盘。它使用宿主 debugfs 只读导出两个文件，再运行：

```bash
ps2pdf "$LAB/results/debian_intro.ps" "$LAB/results/debian_intro.pdf"
pdfinfo "$LAB/results/debian_intro.pdf"
```

最终 PDF 位于 `$LAB/results/debian_intro.pdf`；PS、原始结果包、pdfinfo 输出和 SHA-256 记录在同一目录。用宿主 PDF 阅读器打开，检查两页：第一页正文和参考文献，第二页图表及图注。还可以渲染图片检查：

```bash
pdftoppm -png -r 120 "$LAB/results/debian_intro.pdf" "$LAB/results/page"
```

如果渲染时看到与 Type3 字体 bounding box 有关的警告，可以继续打开页面检查实际显示效果。本次记录中也出现了这类警告，两页的正文、参考文献和图表显示正常。

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-host-pdf-page1-2026-10-24.png" alt="新盘生成的 PS 经现代宿主转换后的 PDF 第一页：正文和参考文献" width="827" height="1170" loading="lazy" decoding="async" />

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-host-pdf-page2-2026-10-24.png" alt="同一份宿主 PDF 的第二页：Gnuplot 图表和图注" width="827" height="1170" loading="lazy" decoding="async" />

上面两张图是现代宿主转换后的 PDF 预览。本次 PDF 大小为 46,802 字节，`pdfinfo` 显示为两页 A4。到这里，从安装系统到绘图、排版，再到 PDF 转换就完成了！

## 8. 再次启动

LILO 安装成功并正常关机后，宿主运行：

```bash
python3 retro093.py --work "$LAB" run --boot disk
```

此时不挂引导软盘。如果要重新下载东西，仍需启动宿主 HTTP 服务并在客体设置网络；首次安装时的手工路由不会自动永久保存。已有软件和 `/root/paper` 文件保存在系统盘。

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-lilo-login-2026-10-24.png" alt="安装 LILO 后不挂软盘直接引导并成功登录" width="720" height="400" loading="lazy" decoding="async" />

安装软盘使用 Linux 1.2.13 的 1995-09-19 构建，安装到硬盘后的内核是 1995-10-04 构建；版本输出不同是正常现象。本轮既验证了借软盘启动硬盘根目录，也验证了最后的 LILO 直接引导。

## 后续尝试和参考资料

之前在另一份测试盘中，我还尝试过 XFree86/FVWM 桌面、Ghostview、SSH、本地邮件、FTP 和 Lynx 网页浏览。手动启动 X 可以使用，自动 xdm 登录仍有内核 Oops；邮件和网页只检查了本机环境。这些内容可以留作后续扩展，当前的最小系统不需要安装它们，也不用处理那份测试盘里的 xdm 和 gpm 问题。

下一篇计划继续使用相同的文章源码，尝试 Debian 1.1 Buzz，看看安装配置和软件使用上有哪些变化。

本文使用的资料和复测记录如下：

- [Debian Archive 原始介质与软件包](https://archive.debian.org/debian/dists/Debian-0.93R6/)。
- [QEMU 官方 user 网络说明](https://www.qemu.org/docs/master/system/devices/net.html)。
- [e2fsprogs 1.47.2 发行记录](https://github.com/tytso/e2fsprogs/blob/master/doc/RelNotes/v1.47.2.txt)：配套工具兼容旧版的 `-r 0` 和新版的 `-E revision=0` 参数。
- [2026 年 10 月 24 日的新盘复测记录](https://github.com/Mantains/debian-history-paper/blob/9f60cd302abf374754447094804d7d1c0c31d547/VERIFICATION-093.md)。

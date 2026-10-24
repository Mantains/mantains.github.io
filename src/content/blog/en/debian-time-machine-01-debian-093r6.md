---
title: "Debian Time Machine (1): Installing Debian 0.93R6 and Preparing an Article with Gnuplot and LaTeX"
description: "Install Debian 0.93R6 on a blank disk, use its original Gnuplot, LaTeX, and BibTeX tools to prepare an illustrated article with references, then convert it to PDF on a modern host."
lang: en
urlSlug: debian-time-machine-01-debian-093r6
translationKey: debian-time-machine-01-debian-093r6
category: computing
tags: [Debian, Linux, QEMU, Retrocomputing, LaTeX, Gnuplot]
pubDate: "2026-10-24"
draft: false
featured: false
sourceRevision: "9f60cd302abf374754447094804d7d1c0c31d547"
---

## Introduction

Gnuplot, LaTeX, and BibTeX can handle plotting, typesetting, and references, respectively. All three were already available in Debian 0.93R6 in 1995. In this post, we will install that system on a blank disk and use the software of the time to prepare an article with a figure and references.

The process has two parts: generate the plot, DVI, and PostScript files (PS for short) inside the old Debian system, then bring the PS file back to a modern system and convert it to PDF. I have put the download, file transfer, and build scripts in a companion repository to make the steps easier to follow. Everything here can be done from the console, without setting up a graphical desktop or SSH first.

The tools used here are pinned to [this commit of debian-history-paper](https://github.com/Mantains/debian-history-paper/tree/9f60cd302abf374754447094804d7d1c0c31d547). The Python tool uses only the standard library, so there are no additional pip dependencies. QEMU, filesystem utilities, and PDF conversion software are installed through the host's package manager.

On 24 October 2026, I repeated the procedure below using a newly created blank disk. The result was a two-page A4 PDF, whose text, citations, references, and plot I checked. The example article was prepared specifically for the old toolchain; an arbitrary modern LaTeX project may not compile directly.

## 1. Prepare the host

Here, the modern Linux system running QEMU is the **host**, and Debian 0.93R6 inside the virtual machine is the **guest**. Each step below identifies where to run the commands.

My host was Debian trixie under WSL2, with the QEMU window displayed through WSLg. On a Debian/Ubuntu desktop, you can also start from a host Linux terminal, but check the QEMU version requirement below first. Install the tools, clone the companion repository, and check out the version used in this post:

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

The versions used in this test were QEMU 10.0.13, Python 3.13, and e2fsprogs 1.47.2. The launcher specifies the `pc-i440fx-9.2` machine type, so you need a QEMU version that provides it (9.2 or later). Run `qemu-system-i386 -machine help` to check. If the machine type is missing, upgrade QEMU before starting the virtual machine.

`prepare` downloads five installation media files, the required original packages, and four article source files pinned to a fixed revision. It checks their sizes and SHA-256 hashes. Then `init` creates these two disks:

| File | Size | Contents and guest device |
| --- | --- | --- |
| `system.img` | 512 MiB | Blank system disk, `/dev/hda` in the guest; create `/dev/hda1` during installation |
| `bootstrap.img` | 16 MiB | ext2 revision 0, with no partition table; mounted as the whole `/dev/hdb` in the guest. Initially contains only netbase, Lynx, LILO, and bootstrap.sh; also used later to export results |

The tool stops if disks already exist in the working directory, to avoid overwriting them. To reinstall, choose a new `--work` path. The auxiliary disk has no partition table, so mount the whole `/dev/hdb` later, rather than `/dev/hdb1`.

You can run `prepare` again; it rechecks files that have already been downloaded. If a download or checksum check fails, resolve the reported problem before continuing. File sources, versions, and checksums are saved in `$LAB/www/manifest.json`.

## 2. Start the host HTTP server and virtual machine

Keep three host terminals open: A for the HTTP server, B for the virtual machine, and C for changing floppy disks and other host operations. In terminal A, run the following from the repository root:

```bash
LAB="$HOME/debian093-lab"
python3 retro093.py --work "$LAB" serve
```

This server supplies the prepared packages and source files to the old Debian system. It listens only on the host's `127.0.0.1:8000` and serves files from `$LAB/www`. The guest can reach it at `10.0.2.2:8000` through QEMU's user networking. On Windows, run the HTTP server and QEMU in the same WSL distribution.

In terminal B, run:

```bash
cd "$HOME/debian-history-paper"
LAB="$HOME/debian093-lab"
python3 retro093.py --work "$LAB" run --boot install
```

The QEMU window will display the floppy boot prompt. Terminal B remains occupied until that window closes. Use terminal C for subsequent host commands to change disks. First set up the same working directory there:

```bash
cd "$HOME/debian-history-paper"
LAB="$HOME/debian093-lab"
```

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-installer-2026-10-24.png" alt="Welcome screen of the original Debian 0.93R6 floppy installer" width="720" height="400" loading="lazy" decoding="async" />

## 3. Install the base system from floppies

Follow the prompts on screen. If QEMU captures the keyboard, press Ctrl+Alt to release it. Do not pass paths to the host's physical disks to the virtual machine.

1. Press Enter at the `boot:` prompt. Wait for `Insert Debian GNU/Linux Root Disk and press <ENTER>`.
2. In host terminal C, run:

   ```bash
   python3 retro093.py --work "$LAB" change 1440_root_floppy
   ```

   Return to QEMU, press Enter, and wait for the disk to finish loading.
3. Select OK on the welcome screen, Continue for the display settings, and **Expert** for the installation mode.
4. Select **1 Partition A Hard Disk**, then **/dev/hda**. In cfdisk, choose New → Primary and accept the default size to use the whole disk. Set Bootable. Select Write (the shortcut is uppercase W), type `yes`, wait for the write to finish, and select Quit.
5. Select **3 Prepare A Linux Partition**. The input box already contains `/dev/`; append `hda1`. Wait for formatting and the bad-block check to finish. Even a 512 MiB disk may take a few minutes under emulation.
6. Select **4 Mount/Unmount Partitions** and follow its prompts to mount hda1 as the root filesystem. Enter `m`; append `hda1` after the existing `/dev/` in the device field. The directory field already contains `/`, so press Enter. Finally, enter `c` to continue. This mount is inside the guest, not in a host directory.
7. Select **5 Install Debian GNU/Linux**, confirm `/dev/hda1` as the root partition, and choose `/dev/fd0` as the source. Insert the three base-system volumes as prompted:

   ```bash
   python3 retro093.py --work "$LAB" change 1440_base_floppy-1
   python3 retro093.py --work "$LAB" change 1440_base_floppy-2
   python3 retro093.py --work "$LAB" change 1440_base_floppy-3
   ```

   **Run only the command for the disk currently requested.** Return to QEMU and press Enter, then wait for the next disk prompt before changing it. The third official download is only 1,119,232 bytes, which is the complete volume, but QEMU's floppy drive needs a standard-size image. The tool preserves the original file and its checksum, and creates a separate `.img` copy padded with zeros to 1,474,560 bytes. The `change` command selects that copy automatically. Inserting the unpadded third volume directly causes `/dev/fd0: No such device or address`.
8. Select **6 Configure Debian GNU/Linux**, confirm the root partition, and choose a keyboard layout; I used `en.us`. Keep the defaults on the module selection screens without loading additional modules. Use `debian` as the hostname, leave the domain blank, and choose your local time zone.
9. Before rebooting, change the floppy back to the boot disk:

   ```bash
   python3 retro093.py --work "$LAB" change 1440_boot_floppy
   ```

   Then select **9 Reboot The System**. At the new `boot:` prompt, enter:

   ```text
   linux root=/dev/hda1
   ```

10. Log in as root and follow the first-boot prompts to set your own password. Create a regular account, such as `paper`, and set its password. You can leave the four personal-information fields, including name and office, blank; explicitly enter `y` at the final confirmation. Initial configuration then starts dselect. Choose **6 [Q]uit** without selecting more software. At the login prompt, log in again as root with the password you just set. For now, the floppy's kernel boots the system on the hard disk; direct hard-disk boot comes after installing LILO.

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-first-boot-2026-10-24.png" alt="Login prompt after the first boot of the newly installed system disk" width="720" height="400" loading="lazy" decoding="async" />

## 4. Configure networking and install LILO

With the base system installed, use the auxiliary disk to install the networking tools, then download the typesetting software over HTTP. Run all commands in this section **inside the Debian 0.93R6 guest**:

```sh
mount -t ext2 /dev/hdb /mnt
ls /mnt
sh /mnt/bootstrap.sh
```

The script installs `netbase-1.17-1.deb` and `lynx-2.4.2-1.deb` from the auxiliary disk. When netbase asks about configuration-file differences for `/etc/init.d/netbase`, gateways, hosts.allow, hosts.deny, rpc, and related files, accept the default **N** by pressing Enter to keep the versions created by the installer. You can also press Enter when Lynx asks for its default home page. The script then configures the ISA NE2000 network and downloads the host's manifest by HTTP GET to `/root/resource-manifest.json`. Run it once for this fresh installation; repeating `route add` may report that the route already exists.

The network configuration is equivalent to:

```sh
ifconfig lo 127.0.0.1 up
ifconfig eth0 10.0.2.15 netmask 255.255.255.0 broadcast 10.0.2.255 up
route add -net 10.0.2.0 netmask 255.255.255.0 dev eth0
route add default gw 10.0.2.2
```

`dmesg` should show the NE2000 at 0x300, IRQ 9. If HTTP fails, first confirm that terminal A is still serving files and that the address and port are `10.0.2.2:8000`. Then check `ifconfig` and `route -n`. The guest does not need HTTPS support: the host's Python tool handles HTTPS downloads from the archive and GitHub.

Next, install LILO:

```sh
dpkg -i /mnt/lilo-16-0.deb
```

Follow the package script's prompts to confirm bootloader installation. In this tutorial, the root partition is `/dev/hda1` and the boot disk is `/dev/hda`. At the end, we will try booting directly from the hard disk with no boot floppy attached.

## 5. Install the plotting and typesetting software

Inside the guest, download and run the software installation script:

```sh
cd /root
lynx -source http://10.0.2.2:8000/install-paper.sh >install-paper.sh
test -s install-paper.sh
sh install-paper.sh
echo $?
```

The exit status should be 0. During texlib configuration, a **Hyphenation** language selection dialog appears. Keep the default selection, which includes english, and confirm with OK. Do not redirect the entire installation command's output to a file, or you may miss this dialog. The script retrieves the following packages by HTTP GET and passes them to the original dpkg in the order shown, without using `--force-depends`. A single dpkg invocation unpacks them first, then configures them according to their dependencies and saves the installed-package list.

| Package file | Purpose in this workflow |
| --- | --- |
| `ncurses-runtime-1.9.4-0.deb` | ncurses runtime required by dialog |
| `dialog-0.6-1.deb` | Configuration tool used by texlib |
| `xlib-3.1.2-2.deb` | Provides `xlibraries`, a declared dependency of mfbin; does not install an X server |
| `kpathsea-2.6-1.deb` | File and font lookup for the TeX tools |
| `mflib-1.0-4.deb` | Metafont support files and font-generation scripts |
| `mfbin-2.71-3.deb` | Provides `metafont` for TeX/dvips font generation |
| `texlib-1.0-4.deb` | TeX support files, including macros, hyphenation, and standard bibliography styles |
| `texbin-3.1415-3.deb` | TeX and initex; provides the virtual package `tex` |
| `mfbasfnt-1.0-3.deb` | Base font source files |
| `textfm-1.0-3.deb` | Font metric files |
| `latex-2e-4.deb` | LaTeX format and macros |
| `bibtex-0.99c-3.deb` | Bibliography processing |
| `dvipsk-5.58f-3.deb` | DVI-to-PostScript conversion and the corresponding EPS macros |
| `gnuplot-3.5-3.deb` | Generates EPS plots from data |

This package list is intended for the Debian 0.93R6 system installed from floppies above. The installer has already supplied basic components such as libc and the shell. These are original binary packages, so there is no need to compile Gnuplot or TeX separately.

The installation script also prepares four files for the article: `debian_intro.tex` contains the text, `plot.gp` is the plotting script, `debian.dat` holds the data, and `references.bib` is the bibliography database. They are saved in `/root/paper/`, alongside the build script `build-paper.sh`. Git is not needed inside the old Debian system.

The article sources are pinned to `ee2486875ebf6074bc008e6b969a49136eb78f77`, a different revision from the tools checked out at the start. The download tool handles this mapping. Check that the files are present:

```sh
cd /root/paper
ls -l debian_intro.tex plot.gp debian.dat references.bib
```

Their sizes should be 2523, 1135, 270, and 200 bytes, respectively. The final results archive also includes these four inputs, so they can be checked against the download manifest on the host. The plot uses the repository's fixed data; I did not independently recheck the package counts for each historical release in this test.

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-hyphenation-2026-10-24.png" alt="Hyphenation language selection during configuration of the original texlib package; keep the default selection" width="720" height="400" loading="lazy" decoding="async" />

## 6. Plot and build the article

Once the files are ready, run the build script:

```sh
sh /root/paper/build-paper.sh
```

Here is what the script does. First, it checks the LaTeX format file. If `latex.fmt` is missing or empty, it switches to `/usr/lib/texmf/ini` and regenerates it, equivalent to running:

```sh
cd /usr/lib/texmf/ini
initex '\nonstopmode\input latex.ltx' </dev/null >/root/paper/logs/initex.txt 2>&1
ls -l latex.fmt
test -s latex.fmt
```

The old LaTeX version checks the age of its source files. This can cause `initex` to exit with a date warning even though the format file was generated. The script therefore keeps the initialization log and checks that `latex.fmt` is nonempty before compiling the article. It stops if no format file was generated. There is no need to change the system clock or macro sources.

It then returns to `/root/paper` to plot the data, typeset the article, and process the references:

```sh
cd /root/paper
gnuplot plot.gp
latex '\nonstopmode\input debian_intro.tex'
bibtex debian_intro
latex '\nonstopmode\input debian_intro.tex'
latex '\nonstopmode\input debian_intro.tex'
dvips -t a4 debian_intro.dvi -o debian_intro.ps
```

Gnuplot generates the EPS plot, which LaTeX inserts into the article. After the first LaTeX run, BibTeX processes the bibliography. The next two LaTeX runs update the references and citations, and dvips produces an A4 PS file.

The build script saves a log for each step, stops on failure, and checks the final log for `!` errors or undefined references. The first dvips run may also need Metafont to generate PK fonts, so it can take longer than subsequent runs.

You should end up with `debian_plot.eps`, `debian_intro.dvi`, and `debian_intro.ps`. The script copies the PS file and `paper-results.tgz`, which contains sources and logs, to the auxiliary disk mounted at `/mnt`. Wait for `PAPER-BUILD-PASS` before proceeding.

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-build-pass-2026-10-24.png" alt="Successful build with the original toolchain on a fresh installation, with the PS file written to the auxiliary disk" width="720" height="400" loading="lazy" decoding="async" />

For reference, the EPS, DVI, and PS files from this run were 4,444, 2,736, and 31,385 bytes. The run date, font caches, and converter metadata can affect the output, so your files do not need to match these hashes exactly.

## 7. Export the files and convert to PDF

Inside the guest, run:

```sh
sync
umount /mnt
shutdown -h now
```

Wait until the screen actually displays `System halted`. Then, in host terminal C, exit the emulator and export the files:

```bash
python3 retro093.py --work "$LAB" quit
python3 retro093.py --work "$LAB" export
```

`quit` only exits the emulator; it does not replace a normal Linux shutdown. `export` refuses to read the auxiliary disk while QEMU is still running. It uses the host's debugfs to export the two files read-only, then runs:

```bash
ps2pdf "$LAB/results/debian_intro.ps" "$LAB/results/debian_intro.pdf"
pdfinfo "$LAB/results/debian_intro.pdf"
```

The final PDF is at `$LAB/results/debian_intro.pdf`. The same directory contains the PS file, original results archive, pdfinfo output, and SHA-256 records. Open the PDF in a host reader and check both pages: text and references on the first, and the plot and its caption on the second. You can also render them as images:

```bash
pdftoppm -png -r 120 "$LAB/results/debian_intro.pdf" "$LAB/results/page"
```

If rendering produces Type3 font bounding-box warnings, open the pages and check how they actually look. These warnings also appeared in my test, but the text, references, and plot on both pages displayed correctly.

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-host-pdf-page1-2026-10-24.png" alt="First page of the PDF converted on the modern host from the fresh installation's PS output, showing text and references" width="827" height="1170" loading="lazy" decoding="async" />

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-host-pdf-page2-2026-10-24.png" alt="Second page of the same host-converted PDF, showing the Gnuplot figure and caption" width="827" height="1170" loading="lazy" decoding="async" />

These two images preview the PDF after conversion on the modern host. My PDF was 46,802 bytes, and `pdfinfo` reported two A4 pages. That completes the process from installing the system through plotting and typesetting to PDF conversion!

## 8. Boot again

After installing LILO successfully and shutting down normally, run on the host:

```bash
python3 retro093.py --work "$LAB" run --boot disk
```

No boot floppy is attached this time. To download more files, start the host HTTP server again and configure networking in the guest. The routes added manually during installation are not automatically saved permanently. Installed software and the files in `/root/paper` remain on the system disk.

<img src="/images/blog/debian-time-machine-01-debian-093r6/repro-lilo-login-2026-10-24.png" alt="Successful login after booting directly from the hard disk with LILO and no floppy attached" width="720" height="400" loading="lazy" decoding="async" />

The installation floppy uses a Linux 1.2.13 build dated 1995-09-19, while the kernel installed on the hard disk is dated 1995-10-04. Different version output is therefore expected. This test covered both booting the hard-disk root filesystem with the floppy kernel and, finally, booting directly with LILO.

## Further experiments and references

On a separate test disk, I previously tried the XFree86/FVWM desktop, Ghostview, SSH, local mail, FTP, and web browsing with Lynx. Starting X manually worked, while automatic xdm login still caused a kernel Oops. Mail and web tests were limited to the local machine. These can be explored later; the minimal system here does not need those components or the fixes for that other disk's xdm and gpm issues.

In the next post, I plan to use the same article sources with Debian 1.1 Buzz and see how installation, configuration, and software use have changed.

Sources and records used for this post:

- [Original installation media and packages at Debian Archive](https://archive.debian.org/debian/dists/Debian-0.93R6/).
- [QEMU's official user networking documentation](https://www.qemu.org/docs/master/system/devices/net.html).
- [e2fsprogs 1.47.2 release notes](https://github.com/tytso/e2fsprogs/blob/master/doc/RelNotes/v1.47.2.txt): the companion tool supports both the older `-r 0` and newer `-E revision=0` options.
- [Fresh-disk verification record from 24 October 2026](https://github.com/Mantains/debian-history-paper/blob/9f60cd302abf374754447094804d7d1c0c31d547/VERIFICATION-093.md).

---
title: "用 Miniforge 和 pak 安装 GAPIT：从 R 环境到示例 GWAS"
description: "在 Linux 上创建独立的 R 环境，从 GitHub 安装 GAPIT 4.1.0，处理 fs 编译时缺少 libuv 的问题，并用包内示例数据检查安装。"
lang: zh
urlSlug: install-gapit-with-miniforge-and-pak
translationKey: install-gapit-with-miniforge-and-pak
category: bioinformatics
tags: [GAPIT, R, GWAS, Miniforge, Mamba, pak]
pubDate: "2026-11-13"
draft: false
featured: false
sourceRevision: "b7b985fe83835089e1379e85284ff594cfdec0c6"
---

GAPIT 是一个用于全基因组关联分析（GWAS）和基因组预测的 R 包。本文记录在 Linux 上用 Miniforge 创建独立的 R 环境，再用 pak 从 GitHub 安装 GAPIT 的过程。原安装记录使用 Mamba 2.5.0，最后装好的是 GAPIT 4.1.0。中间遇到的问题出在依赖包 `fs` 的编译，可以先从这个报错定位需要补哪一层依赖。

## 准备 R 环境

先按 [Miniforge 的安装说明](https://github.com/conda-forge/miniforge)安装与系统架构对应的版本。打开终端，新建一个叫 `gapit` 的环境，把 R 和 pak 一起装进去：

```bash
mamba --version
mamba create -n gapit "r-base>=4.3" r-pak
mamba activate gapit
R --version
R --vanilla
```

这里的 R 版本下限来自[该提交的 DESCRIPTION](https://github.com/jiabowang/GAPIT/blob/b7b985fe83835089e1379e85284ff594cfdec0c6/DESCRIPTION)。激活环境后，终端提示符通常会出现 `(gapit)`；再看 `R --version`，确认启动的是这次安装的 R。以下安装命令在刚打开的 R 会话中运行。

## 从 GitHub 安装 GAPIT

```r
pak::pak("jiabowang/GAPIT@b7b985fe83835089e1379e85284ff594cfdec0c6")
```

这条命令固定到原记录里出现的提交 `b7b985f`，避免以后 GitHub 默认分支更新时装到另一版 GAPIT。它没有锁定所有依赖的版本，因此不同时间或系统上的安装清单仍可能不同。

pak 会列出准备安装或更新的包；如果询问是否继续，可以先检查安装目标和依赖，再确认。下载完成后还可能需要编译源码，看到 `Downloaded` 时先等安装结束。具体的 GitHub 安装语法见 [pak 文档](https://pak.r-lib.org/reference/pak.html)。

## fs 编译失败时怎么办

原记录中，下载已经完成，安装在编译 `fs` 时停止。日志中最有用的是这几行：

```text
Package 'libuv', required by 'virtual:world', not found
fatal error: uv.h: No such file or directory
ERROR: configuration failed for package 'fs'
```

`fs` 是 R 包，`libuv` 是它编译时需要用到的库。这里找不到 `uv.h`，所以可以先解决 `fs` 的安装，再回到 GAPIT。下面两条路线按环境选择。

### 在当前环境里补装 r-fs

如果没有系统管理员权限，或者希望把依赖放在同一个环境里，先退出 R，再回终端运行：

```bash
mamba activate gapit
mamba install r-fs
R --vanilla
```

`r-fs` 是 Conda 的 R 包构建，安装时由 Mamba 处理它在环境中的依赖。回到 R 后，重新运行上一节的 `pak::pak(...)`，检查计划是否保留现有的 `fs`。如果 pak 仍打算从源码重建它，再按新的安装计划和报错排查。

### 在 Debian 或 Ubuntu 上补系统依赖

如果有管理员权限，并且准备在 Debian 或 Ubuntu 上从源码编译，可以根据 pak 的系统依赖提示补装相应软件。原日志还列出了 `curl` 所需的开发包，以及 `knitr`、`rmarkdown` 可能用到的 Pandoc：

```bash
sudo apt update
sudo apt install libcurl4-openssl-dev libuv1-dev pandoc
```

这是原记录对应的 APT 包名，其他发行版需要查相应的包。装好后，在同一个 `gapit` 环境里重新打开 R 并重试。若仍报错，先找**第一个构建失败的包**和缺失的头文件或工具，再处理对应依赖。原记录最后出现了 `Installed GAPIT 4.1.0`，这才是安装完成的信号。

## 加载包并跑一个示例

建议安装完以后重新启动 R，先检查包能否加载：

```r
library(GAPIT)
packageVersion("GAPIT")
find.package("GAPIT")
```

版本应为 `4.1.0`，包路径应指向刚才的环境。如果用 `source()` 从网上直接加载函数，运行的可能是远端脚本中的实现，不能用来确认本机装好的 GAPIT 是否能加载。

下面将原笔记的多模型演示简化为一个 BLINK 示例，读的是 GAPIT 随包分发的玉米示例数据。三份表分别提供表型（`Y`）、数值型基因型（`GD`）和标记位置（`GM`）。取表型和基因型共有的样本并对齐顺序后，运行一次分析：

```r
read_example <- function(name) {
  path <- system.file("extdata", name, package = "GAPIT", mustWork = TRUE)
  read.table(path, header = TRUE, stringsAsFactors = FALSE)
}

phenotypes <- read_example("mdp_traits.txt.gz")[, c(1, 3)]
genotypes <- read_example("mdp_numeric.txt.gz")
markers <- read_example("mdp_SNP_information.txt.gz")

samples <- intersect(genotypes[[1]], phenotypes[[1]])
stopifnot(length(samples) > 0)
phenotypes <- phenotypes[match(samples, phenotypes[[1]]), , drop = FALSE]
genotypes <- genotypes[match(samples, genotypes[[1]]), , drop = FALSE]

result <- GAPIT::GAPIT(
  Y = phenotypes,
  GD = genotypes,
  GM = markers,
  model = "Blink",
  PCA.total = 3,
  file.output = FALSE
)

stopifnot(is.list(result), is.data.frame(result$GWAS), nrow(result$GWAS) > 0)
head(result$GWAS)
```

这段代码按[该提交中的 BLINK 测试](https://github.com/jiabowang/GAPIT/blob/b7b985fe83835089e1379e85284ff594cfdec0c6/tests/testthat/test-Blink.R)整理，用 `file.output = FALSE` 关闭常规结果文件输出。运行完成后，应能在控制台看到关联结果表的前几行。这个例子用于检查包加载和分析流程；改用自己的数据时，仍需核对样本名、标记对应关系，并根据分析目的选择模型和协变量。

原笔记记录了安装成功；这里的单模型检查按上游测试整理，没有在本次发文环境中重跑。

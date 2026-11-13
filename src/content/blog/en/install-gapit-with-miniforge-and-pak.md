---
title: "Installing GAPIT with Miniforge and pak: From R Setup to an Example GWAS"
description: "Create a separate R environment on Linux, install GAPIT 4.1.0 from GitHub, resolve a missing libuv dependency when building fs, and check the installation with bundled example data."
lang: en
urlSlug: install-gapit-with-miniforge-and-pak
translationKey: install-gapit-with-miniforge-and-pak
category: bioinformatics
tags: [GAPIT, R, GWAS, Miniforge, Mamba, pak]
pubDate: "2026-11-13"
draft: false
featured: false
sourceRevision: "b7b985fe83835089e1379e85284ff594cfdec0c6"
---

GAPIT is an R package for genome-wide association studies (GWAS) and genomic prediction. This note covers setting up a separate R environment with Miniforge on Linux and installing GAPIT from GitHub with pak. The original installation used Mamba 2.5.0 and ended with GAPIT 4.1.0. The failure along the way came from compiling the R package `fs`; its error message helps identify which dependency is missing.

## Set up the R environment

Follow the [Miniforge installation instructions](https://github.com/conda-forge/miniforge) for your system architecture. Open a terminal and create an environment named `gapit` with R and pak:

```bash
mamba --version
mamba create -n gapit "r-base>=4.3" r-pak
mamba activate gapit
R --version
R --vanilla
```

The minimum R version comes from [the DESCRIPTION file at this revision](https://github.com/jiabowang/GAPIT/blob/b7b985fe83835089e1379e85284ff594cfdec0c6/DESCRIPTION). After activation, the prompt usually shows `(gapit)`. Check `R --version` to confirm which R is starting. Run the installation command below inside the new R session.

## Install GAPIT from GitHub

```r
pak::pak("jiabowang/GAPIT@b7b985fe83835089e1379e85284ff594cfdec0c6")
```

This command pins the GAPIT commit shown in the original log, `b7b985f`, so changes to the default branch do not change the GAPIT version you install. It does not lock every dependency. The installation plan can still vary by system and date.

Pak lists the packages it plans to install or update. If it asks for confirmation, review the target library and dependencies first. Some packages may need to be compiled from source after downloading; wait for the installation result rather than stopping at `Downloaded`. See the [pak documentation](https://pak.r-lib.org/reference/pak.html) for the GitHub installation syntax.

## What to do when fs fails to build

In the original log, the downloads completed and the build stopped at `fs`. These were the useful lines:

```text
Package 'libuv', required by 'virtual:world', not found
fatal error: uv.h: No such file or directory
ERROR: configuration failed for package 'fs'
```

`fs` is an R package, and `libuv` is a library it needs during compilation. The missing `uv.h` header points to the dependency to address before retrying GAPIT. Choose one of the following approaches for your environment.

### Install r-fs in the active environment

If you do not have administrator access or want to keep dependencies in the same environment, quit R and run these commands in the terminal:

```bash
mamba activate gapit
mamba install r-fs
R --vanilla
```

`r-fs` is the Conda build of the R package. Mamba resolves its dependencies within the environment. Back in R, rerun `pak::pak(...)` from the previous section and check whether the plan keeps the installed `fs`. If pak still wants to rebuild it from source, use the new plan and error output to investigate.

### Install system dependencies on Debian or Ubuntu

If you have administrator access and are building from source on Debian or Ubuntu, you can install the packages named in pak's system dependency report. The original log also listed the development package for `curl` and Pandoc, which can be used by `knitr` and `rmarkdown`:

```bash
sudo apt update
sudo apt install libcurl4-openssl-dev libuv1-dev pandoc
```

These are the APT package names for the system in the original notes. Check the equivalent names on other distributions. Reopen R in the same `gapit` environment and retry. If it still fails, start with **the first package that failed to build** and identify the missing header or tool. The original log eventually reported `Installed GAPIT 4.1.0`, which is the signal that installation finished.

## Load the package and run an example

After installation, start a fresh R session and check that the package loads:

```r
library(GAPIT)
packageVersion("GAPIT")
find.package("GAPIT")
```

The version should be `4.1.0`, and the package path should point to the new environment. Using `source()` to load functions from the web can run a different implementation from a remote script, so it does not check whether the locally installed package loads.

The following check reduces the original multi-model demonstration to one BLINK run using the maize example data distributed with GAPIT. The three tables supply phenotypes (`Y`), numeric genotypes (`GD`), and marker positions (`GM`). Match the samples shared by the phenotype and genotype tables, put them in the same order, and run the analysis:

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

This example follows [the BLINK test at the pinned revision](https://github.com/jiabowang/GAPIT/blob/b7b985fe83835089e1379e85284ff594cfdec0c6/tests/testthat/test-Blink.R) and uses `file.output = FALSE` to suppress regular result files. After the run, the first rows of the association table should appear in the console. This checks package loading and the analysis workflow. With your own data, check sample names and marker correspondence, then choose the model and covariates to suit the analysis.

The original notes record a successful installation. The single-model check shown here was adapted from the upstream test and was not rerun in the publishing environment.

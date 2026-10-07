---
title: BerkeleyGW+qe运行BSE计算笔记
lang: zh-CN
date: 2026-10-04
author: "Fisherd"
categories: 物理
tags:
  - BSE
  - GW
  - 软件学习
description: 记录自己使用BerkeleyGW+qe运行BSE计算的过程
---
# BerkeleyGW+qe运行BSE计算笔记
## 前置安装
先安装qe，仓库链接https://gitlab.com/QEF/q-e
```shell
tar -xvf q-e-qe-7.5.tar.bz2
cd q-e-qe-7.5
mkdir ./build
cd ./build
cmake -DCMAKE_Fortran_COMPILER=mpiifx -DCMAKE_C_COMPILER=mpiicx ..
make -j `nproc`
```
然后安装hdf5，虽然可以用sudo apt install libhdf5-mpi-dev安装，但它的mpi实现会用openmpi，为避免和intel mpi冲突还是用源码安装
```shell
tar -xzvf hdf5-1.14.6.tar.gz
cd hdf5-1.14.6
./configure --prefix=/opt/hdf5-1.14.6 --enable-build-mode=production \
  --enable-fortran --enable-hl --enable-shared --enable-parallel
make -j$(nproc)
su  // 切换root账户，同时继承/.bashrc
make install
```
在.bashrc中添加
```
# for hdf5
export HDF5_DIR=/opt/hdf5-1.14.6
export PATH=$HDF5_DIR/bin:$PATH
export LD_LIBRARY_PATH=$HDF5_DIR/lib:$LD_LIBRARY_PATH
export CPATH=$HDF5_DIR/include:$CPATH
```
最后安装BerkeleyGW
```shell
wget -O BerkeleyGW-4.0.tar.gz https://app.box.com/shared/static/22edl07muvhfnd900tnctsjjftbtcqc4.gz
tar -xzvf BerkeleyGW-4.0.tar.gz
cd BerkeleyGW-4.0.tar.gz
```
在当前路径下新建arch.mk
```
# arch.mk for BerkeleyGW codes
COMPFLAG  = -DINTEL
PARAFLAG  = -DMPI -DOMP
MATHFLAG  = -DUSESCALAPACK -DUNPACKED -DUSEFFTW3 -DUSEMR3 -DHDF5
# Only uncomment DEBUGFLAG if you need to develop/debug BerkeleyGW.
# The output will be much more verbose, and the code will slow down by ~20%.
#DEBUGFLAG = -DDEBUG
FCPP    = cpp -C -E -P -nostdinc # 预处理fortran中的条件编译
F90free = mpiifx -free -qopenmp
LINK    = mpiifx -qopenmp
FOPTS   = -O3 -align array64byte
#FOPTS   = -fast -align array64byte -g -debug inline-debug-info -traceback -check all -ftrapuv -init=snan
FNOOPTS = $(FOPTS)
MOD_OPT = -module #-module 后面有一个空格
INCFLAG = -I

C_PARAFLAG  = -DPARA -DMPICH_IGNORE_CXX_SEEK
CC_COMP = mpiicpx -qopenmp
C_COMP  = mpiicx -qopenmp
C_LINK  = mpiicx -qopenmp -lstdc++
C_OPTS  = -O3 -align #-g -traceback
C_DEBUGFLAG =

REMOVE  = /bin/rm -f

# Math Libraries

FFTWLIB      = $(MKLROOT)/lib/intel64/libmkl_scalapack_lp64.a -Wl,--start-group $(MKLROOT)/lib/intel64/libmkl_intel_lp64.a $(MKLROOT)/lib/intel64/libmkl_core.a \
               $(MKLROOT)/lib/intel64/libmkl_intel_thread.a $(MKLROOT)/lib/intel64/libmkl_blacs_intelmpi_lp64.a -Wl,--end-group -lpthread -lm -ldl
FFTWINCLUDE  = $(MKLROOT)/include/fftw/

LAPACKLIB = $(FFTWLIB)
SCALAPACKLIB = $(FFTWLIB)

HDF5_DIR     = /opt/hdf5-1.14.6
HDF5_LDIR    =  $(HDF5_DIR)/lib
HDF5LIB      =  $(HDF5_LDIR)/libhdf5hl_fortran.a \
                $(HDF5_LDIR)/libhdf5_hl.a \
                $(HDF5_LDIR)/libhdf5_fortran.a \
                $(HDF5_LDIR)/libhdf5.a -lz -ldl -lsz
HDF5INCLUDE  = $(HDF5_DIR)/include

PERFORMANCE  =

TESTSCRIPT = sbatch my.scr
```
接着运行
```shell
make -j all-flavors
```

最后在.bashrc加上
```
# for BerkeleyGW+QE
export BGW_dir=$HOME/Downloads/BerkeleyGW-4.0/bin
export qe_dir=$HOME/Downloads/q-e-qe-7.5/build/bin
export PATH=$PATH:$BGW_dir:$qe_dir
```

## 跑kxxx-fyyy任务的input
BerkeleyGW支持从稀疏的k网格xxx计算GW，再用波函数投影的方式插值到密集k网格yyy上。附件[template_BGW@qe.tar.gz](/template_BGW@qe.tar.gz)附带了全计算流程所需的输入文件，可以根据自己的需求修改k点和STRU的部分。

```
├ 1-scf
|  ├ scf.in       #K_POINTS下面，system中a(或者A)的单位是Å
|  └ Si.UPF
├ 2-wfn
|  ├ bands.in     # 已经用脚本实现k点自动化。
|  ├ kgrid.inp    #第一行（第二行是k_shift，第三行是q_shift，两者等价k_shift*k_step=q_shift）
|  └ pw2bgw.in    #7-12行（wfng_dk需要与kgrid.inp中的shift一致）
├ 3-wfnq
|  ├ bands.in     # 已经用脚本实现k点自动化。
|  ├ kgrid.inp    #第一行
|  └ pw2bgw.in    #7-12行
├ 4-wfn_fi
|  ├ bands.in     # 已经用脚本实现k点自动化。
|  ├ kgrid.inp    #第一行和第二行（第9-10行需要移动原子位置来屏蔽对称性）
|  └ pw2bgw.in    #7-12行
├ 5-wfnq_fi
|  ├ bands.in     # 已经用脚本实现k点自动化。
|  ├ kgrid.inp    #第一行和第二行
|  └ pw2bgw.in    #7-12行
├ 6-epsilon
|  └ epsilon.inp  # 已经用脚本实现自动化。begin qpoints 下面,将2-wfn/kgrid.out复制过来，并且将权重全部设为1.0，
|					将接近0的q点设为微小的非零值，并且最右列设为1
├ 7-sigma
|  └ sigma.inp    # 已经用脚本实现自动化。begin qpoints 下面,将2-wfn/kgrid.out复制过来，并且将权重全部设为1.0
├ 8-kerenl
|  └ kernel.inp
├ 9-absorption
└  └ absorption.inp #要注意number_cond_bands_fine等需要符合degeneracy_check的要求
```
需要注意，BerkeleyGW会通过能带简并检查选择的KS波函数数量是否合理。可以提前用$BGW_dir/degeneracy_check.x 2-wfn/WFN 检查稀疏k网格上的能带简并，给出允许的epsilon和sigma的number_bands，以及kernel的number_val_bands、number_cond_bands。absorption使用的密集k网格则需要检查4-wfn_fi/WFN。

## 奇怪的bug
在Fisherd-Server中diagonalize.f90的calc_broken_herm无法正常运行。250922注释掉了相应代码，暂时凑合用。或者也可以mpirun 大于1的进程数，也能避开这个函数。
---
title: gdb笔记
lang: zh-CN
date: 2025-01-17
author: "Fisherd"
categories: 计算机
tags:
  - 调试
  - C++
  - 开发工具
  - gdb
description: 调试C++程序的必备工具使用指南
---

## 安装
IntelOneAPI中包含了gdb-oneapi命令，但是它依赖于GLIBC_2.25，一些老服务器并没有这么新的库，所以需要手动安装gdb。
##### 前置包：GMP4.2+，MPFR 3.1.0+
```shell
wget https://gcc.gnu.org/pub/gcc/infrastructure/gmp-6.2.1.tar.bz2
tar -xvjf gmp-6.2.1.tar.bz2
cd gmp-6.2.1/
./configure --prefix=$(pwd)
make -j 24
make install

wget https://gcc.gnu.org/pub/gcc/infrastructure/mpfr-4.1.0.tar.bz2
tar -xvjf mpfr-4.1.0.tar.bz2
cd mpfr-4.1.0/
./configure --prefix=$(pwd) --with-gmp-include=../gmp-6.2.1/include --with-gmp-lib=../gmp-6.2.1/lib
make -j 36
make install
```
对于怀柔服务器，链接到`libtinfo.so.5`有问题，似乎版本不匹配，需要安装ncurses以⽀持图形界⾯tui。
```shell
wget https://ftp.gnu.org/gnu/ncurses/ncurses-6.5.tar.gz
tar -xvzf ncurses-6.5.tar.gz
mkdir ncurse-6.5-build
cd ncurses-6.5-build
../ncurses-6.5/configure --prefix=$(pwd)/install --with-shared --with-termlib --enable-widec
make -j 36 make install （这一步会产生和构建文件相同的文件，为避免冲突要注意把安装路径设置得与构建路径不同）
```
##### 正式安装gdb
```bash
wget https://ftp.gnu.org/gnu/gdb/gdb-16.2.tar.xz
mkdir gdb-16.2-build
cd gdb-16.2-build
../gdb-16.2/configure --prefix=$(pwd) --with-gmp=$HOME/software/gmp-6.2.1 --with-mpfr=$HOME/software/mpfr-4.1.0
--------- 怀柔 -------
../gdb-16.2/configure --prefix=$(pwd) --with-gmp=$HOME/package/gmp-6.2.1 --with-mpfr=$HOME/package/mpfr- 4.1.0 --with-curses --enable-tui LDFLAGS="-L/home/guanzq/package/ncurses-6.5-build/lib -Wl,- rpath,/home/guanzq/package/ncurses-6.5-build/lib" CPPFLAGS="-I/home/guanzq/package/ncurses-6.5- build/include"
注意要把将路径嵌入到可执行文件中，运行时动态链接器会使用该路径-Wl,-rpath,/home/guanzq/package/ncurses-6.5-build/lib
下面一句需要加入环境变量
export TERMINFO=/home/guanzq/package/ncurses-6.5-build/install/share/terminfo --------- 怀柔 -------
make -j 36
make install
```
## 编译
为了让gdb能够调试代码，在编译程序时要加上-g命令
```sh
mpiicpx -g .... 编译时加上-g确保写入debugging symbols
```
对于ABACUS或LibRPA，编译时加上下面的选项就可以开启debug功能，但运行速度会变慢，建议单独新建一个build文件夹来编译调试
```shell
 -DCMAKE_BUILD_TYPE=Debug
```
## 运行
本节参考[https://mp.weixin.qq.com/s/w_Z2ftOnb4VtB4jUaMF0fw](https://mp.weixin.qq.com/s/w_Z2ftOnb4VtB4jUaMF0fw)，这里记录最基础最常用的功能

对于ABACUS，在含有INPUT的文件夹中运行
```shell
gdb $HOME/deepmodeling/abacus-BSE/build_debug/abacus
```
三⼤法宝：breakpoint、display、watch

info breakpoints (i b)

info display

info watch

断点：b 文件:行数，例如 
```bash
b /home/fisherd/deepmodeling/abacus-BSE/source/source_lcao/module_lr/bse/molecular_lri.hpp:86
b main (在main函数暂停一下)
delete 编号 (删除特定编号的断点，如果没有跟编号就会删除所有断点)
displaye 变量名 (每次暂停都输出一下)
undisplay 编号
watch 变量名 (变量值出现变化时会自动暂停并输出)
```
r：run 从头开始运行直到碰到断点

n：next 运行到当前文件的下⼀行，不进入函数内部

s：step 运行到当前文件的下⼀行，会进入函数内部

c：continue 继续运行直到下⼀个断点

<br>

bt：backtrace 列出当前堆栈中的所有帧，每调用⼀次函数都会在内存中加上⼀个

frame 堆栈编号：切换到该堆栈

info frame：查看当前堆栈页的所有变量

p 变量名：print 打印当前堆栈中的变量值

p \*array@10 ：打印数组开头连续10个元素的值

对于vector V，可以 p \*V.data()@10

set 变量名=值 在暂停处强行给变量赋值

list 行号：显示当前文件以行号为中心的前后10行代码

可以通过图形化窗口显示源码，快捷键`ctrl+x+a`

layout src：显示源码窗口

## 多线程
info threads 输出所有线程信息，例如
```bash
(gdb) set environment OMP_NUM_THREADS 1 //这样可以限制线程数
(gdb) info threads
  Id Target Id
* 1 Thread 0x2aaaaaaff600 (LWP 153094) "gdb_study_1.o" main () at gdb_study_1.cpp:34
  2 Thread 0x2aaaac04b700 (LWP 153722) "gdb_study_1.o" 0x00002aaaaacdde9d in nanosleep () from /lib64/libpthread.so.0
  3 Thread 0x2aaaac24c700 (LWP 154059) "gdb_study_1.o" 0x00002aaaaacdde9d in nanosleep () from /lib64/libpthread.so.0
(gdb) thread 2 ##切换到线程2
[Switching to thread 2 (Thread 0x2aaaac04b700 (LWP 153722))]
#0 0x00002aaaaacdde9d in nanosleep () from /lib64/libpthread.so.0
(gdb) bt ##输出当前线程的堆栈信息
#省略一堆堆栈信息输出...... 
```
## 多进程
attach pid 切换到指定进程编号，这个编号是由操作系统分配的pid号

info inferiors 输出所有进程信息

inferior 2 切换到进程2，这个编号是gdb给的编号

结合mpirun来运行多进程
```shell
mpirun -np 4 --gdb ./可执行文件
```
mpirun --gdb需要重新运行时只能退出再启动， run 只在第⼀次启动时有效， start 会变成只有⼀个proc

默认情况下，gdb在多进程时只会跟踪父进程，如果程序中用fork()函数产生了子进程，那么需要一些方法才能让gdb跟踪fork出的子进程
#### 方法一：在开始前切换跟踪模式
follow-fork-mode 后面加parent或者child

在启动gdb后运行run之前，可以 set follow-fork-mode child 这样能默认跟踪子进程

show follow-fork-mode 可以查看当前的mode是parent还是child

#### 方法二：在调试过程中切换跟踪模式
如果想在调试过程中切换进程，可以运行

set detach-on-fork 后面加on或者off。

on的时候gdb只会跟踪一个进程，一旦fork产生子进程，它就会切换到子进程而略去父进程。如果设置为off，就能在fork时保留对所有进程的跟踪。

show detach-on-fork 可以查看当前的mode是on还是off

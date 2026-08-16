---
title: ABACUS+LibRPA运行BSE计算教程
lang: zh-CN
date: 2026-08-17
author: "Fisherd"
categories: 物理
tags:
  - BSE
  - GW
  - 凝聚态物理
description: 方便新手快速上手
---
# ABACUS+LibRPA运行BSE计算教程
本教程是论文 https://arxiv.org/abs/2607.05853 的配套实操手册，旨在帮助人类用户和LLM都能快速上手ABACUS+LibRPA的BSE计算。
## 一、计算流程概览

BSE的计算包含scf→nscf→GW→BSE四个步骤，所有步骤都写在示例包[example-k555-f666.tar.gz](/example-k555-f666.tar.gz)的`create.sh`脚本中。

1.用ABACUS做scf计算，并导出`band_out`、`coulomb_cut_{rank}.txt`、`coulomb_mat_{rank}.txt`、`coulomb_unshrinked_cut_{rank}.txt`、`Cs_data_{rank}.txt`、`Cs_shrinked_data_{rank}.txt`、`KS_eigenvector_{index}.dat`、`shrink_sinvS_{rank}.txt`、`velocity_matrix`、`vxc_out`、`stru_out`，其中`rank`是MPI进程数，`index`是k点序号，均从0计数。

2.用ABACUS做nscf计算，并用`preprocess_abacus_for_librpa_band.py`导出`band_kpath_info`、`band_KS_eigenvalue_k_{index}.txt`、`band_KS_eigenvector_k_{index}.txt`、`band_vxc_k_{index}.txt`

3.用LibRPA做GW计算，并导出`energy_qp`、`EXX_band_spin_{index}.txt`、`KS_band_spin_{index}.txt`、`GW_band_spin_{index}.txt`，其中`index`是自旋序号，从1计数。

4.用ABACUS做BSE计算，在`OUT.bse/`中会出现`trans_dipole_{spin_type}_{tda|full}.dat`、`trans_analysis_{spin_type}_{tda|full}.dat`和激发能、激发振幅等文件，里面包含主要计算结果。
## 二、软件安装
#### ABACUS
需要使用包含BSE功能的ABACUS版本。目前官方仓库的develop分支已包含
```sh
git clone https://github.com/deepmodeling/abacus-develop.git
```
官方文档见[https://abacus.deepmodeling.com/en/latest](https://abacus.deepmodeling.com/en/latest)，以下提供一个自用的cmake命令
```sh
cmake -B build -DENABLE_ELPA=ON -DELPA_DIR=$ELPA_PATH -DENABLE_LIBXC=ON -DLibxc_DIR=$Libxc_PATH -Dcereal_DIR=$CEREAL_PATH -DENABLE_LIBRI=ON -DLIBRI_DIR=$LibRI_PATH -DLIBCOMM_DIR=$LibComm_PATH -DDEBUG_INFO=ON
```
#### LibRI
BSE的张量乘法计算功能依托于LibRI的Tensor框架，该包不需要编译
```sh
git clone https://github.com/abacusmodeling/LibRI.git
```
#### LibRPA
BSE基于GW的计算结果，GW需要用LibRPA执行
```sh
git clone https://github.com/Srlive1201/LibRPA
```
使用文档见[https://srlive1201.github.io/LibRPA](https://srlive1201.github.io/LibRPA)，以下提供自用的cmake命令
```sh
cmake -B build -DLIBRPA_USE_LIBRI=ON \
    -DCEREAL_INCLUDE_DIR=$CEREAL_PATH/include \
    -DLIBRI_INCLUDE_DIR=$LibRI_PATH/include \
    -DLIBCOMM_INCLUDE_DIR=$LibComm_PATH/include \
    -DCMAKE_CXX_FLAGS="-DLIBRPA_VERBOSE"
```
## 三、执行计算任务
在例子[example-k555-f666.tar.gz](/example-k555-f666.tar.gz)中，文件夹结构如下
```
├ ref/                                  # 参考数据，用于核对数据与绘图
│ ├ abacusjob-bse.log                   # BSE运行日志，含激子结合能与振子强度总和
│ ├ GW_band_spin_1.dat                  # GW准粒子能带
│ ├ KS_band_spin_1.dat                  # KS能带
│ ├ trans_dipole_singlet_tda.dat        # TDA单态跃迁偶极矩
│ ├ trans_dipole_singlet_full.dat       # Full BSE单态跃迁偶极矩
│ ├ Exciton_avg_elec_slice_state0.dat   # 第0激发态的平均电子密度切片
│ ├ Exciton_avg_hole_slice_state0.dat   # 第0激发态的平均空穴密度切片
│ ├ Exciton_cond_elec_slice_state0.dat  # 第0激发态的条件电子密度切片
│ └ Exciton_cond_hole_slice_state0.dat  # 第0激发态的条件空穴密度切片
├ create_continue.sh                    # 重新更改密集k网格KPT_nscf后执行续算
├ create.sh                             # 一键从头执行全部任务
├ INPUT_bse
├ INPUT_nscf
├ INPUT_plot
├ INPUT_scf
├ KPT_nscf
├ KPT_scf
├ librpa.in                             # LibRPA的输入文件
├ plot_compare.py                       # 画GW band与KS band对比
├ plot_spectrum.ipynb                   # 画吸收谱
├ preprocess_abacus_for_librpa_band.py  # 将ABACUS的nscf输出转换为LibRPA/BSE所需的密集k网格文件
├ Si_3s3p2d1f1g_pca1e-6.abfs            # 为了降低LRI误差人为增大的辅助基
├ Si_gga_8au_100Ry_3s3p2d.orb
├ Si_ONCV_PBE-1.0.upf
└ STRU
```
任务流程可以阅读create.sh脚本。下面对四个步骤中的参数做具体解释
### 3.1 scf
#### INPUT_scf

| 参数 | 描述 | 本文取值 | 默认值 |
|------|------|----------|--------|
| `rpa` | 输出第一节中所列举的其他所有文件 | 1 | 0 |
| `rpa_out_vel` | 输出速度矩阵 | 1 | 0 |
| `rpa_outdir` | 输出LibRPA所需文件的目录 | `./OUT.librpa/` | `./OUT.librpa/` |
| `out_mat_xc` | 输出`vxc_out.dat`，后续会复制为`vxc_out` | 1 | 0 |
| `exx_singularity_correction` | 设置为`massidda`后会计算`coulomb_mat_{rank}.txt`，它对库伦积分做截断的方式更完整 | `massidda` | `default` |
| `exx_pca_threshold` | 设为10会跳过默认的辅助基构造，直接读取`.abfs`文件中预设的辅助基 | 10 | 1e-4 |
| `out_unshrinked_v` | 开启后输出辅助基在压缩前的硬截断库伦矩阵 | 1 | 0 |
| `shrink_abfs_pca_thr`<br>`shrink_lu_inv_thr` | 从初始辅助基压缩到小辅助基的筛选参数 | 1e-6<br>1e-3 | -1<br>1e-6 |

#### KPT_scf
做GW计算时所用的稀疏k网格；本例为$5\times5\times5$的Gamma-centered均匀网格。

### 3.2 nscf
#### INPUT_nscf

| 参数 | 描述 | 本文取值 | 默认值 |
|------|------|----------|--------|
| `out_mat_xc` | 输出`vxc_out.dat`，后续再按k点拆分为`band_vxc_k_{index}.txt` | 1 | 0 |
| `out_wfc_lcao` | 输出`wfk{index}_nao.txt`，后续转为`band_KS_eigenvector_k_{index}.txt`和`band_KS_eigenvalue_k_{index}.txt` | 1 | 0 |

预处理脚本`preprocess_abacus_for_librpa_band.py`还会从`KPT.info`中生成`band_kpath_info`。

#### KPT_nscf
做BSE计算时所用的密集k网格，也用于指定GW band所采用的k点路径；本例为$6\times6\times6$的Gamma-centered均匀网格。

### 3.3 GW
#### librpa.in

| 参数 | 描述 | 本文取值 | 默认值 |
|------|------|----------|--------|
| `task` | 告诉LibRPA执行g0w0band任务 | `g0w0_band` | `rpa` |
| `nfreq` | 虚频/虚时网格的频率点数 | 16 | 6 |
| `option_dielect_func` | 设为3时在GW任务中启用head+wing修正 | 3 | 0 |
| `replace_w_head` | 使用宏观介电函数修正介电矩阵的head；本例配合`option_dielect_func = 3`使用 | `t` | `f` |
| `parallel_routing` | LibRPA内部数据和任务的并行路由方式 | `libri` | `auto` |
| `use_shrink_abfs` | 在计算介电函数$\varepsilon$时使用压缩后的小辅助基 | `t` | `f` |
| `use_shrink_chi` | 设为t时，计算响应函数$\chi$会先使用初始辅助基，然后转到压缩后的小辅助基。设为f时，直接使用小辅助基计算$\chi$ | `f` | `t` |
| `input_dir` | 读取ABACUS及预处理结果的目录 | `OUT.librpa` | `./` |
| `output_dir` | LibRPA矩阵文件的输出目录 | `librpa.d` | `librpa.d` |
| `output_wc_rf` | 输出辅助基下的静态屏蔽库伦矩阵$W_{\mu\nu}(R,i\omega)$ | `t` | `f` |
| `ifreq_output_wc_end` | 输出$W_{\mu\nu}(R,i\omega)$时的频率上界（不含该上界）；默认起点为0，因此设为1只输出最低频率点`ifreq=0` | 1 | -1 |
| `output_gw_sigc_mat_rf` | 输出原子基下的自能矩阵$\Sigma(R,i\omega)$ | `t` | `f` |
| `read_sigc_mat_rf` | 是否从自能矩阵出发续算 | `f` | `f` |
| `output_energy_qp` | 输出`energy_qp` | `t` | `f` |

`create_continue.sh`会把`read_sigc_mat_rf`改为`t`，从已输出的自能矩阵续算；从头运行的`create.sh`则将其改回`f`。

完成GW计算后，可以执行`plot_compare.py`，它会导出`gwband.png`，展示KS band和GW band在KPT_nscf中的k网格下的对比。
<img src="/si_gwband.png" alt="Si的能带对比" style="width: 65%;">

### 3.4 BSE
#### INPUT_bse

| 参数 | 描述 | 本文取值 | 默认值 |
|------|------|----------|--------|
| `esolver_type` | 需设为`lr`，配合`xc_kernel bse`共同指定计算任务为BSE | `lr` | `ksdft` |
| `read_file_dir` | SCF、NSCF预处理和LibRPA结果汇集目录 | `OUT.librpa` | `auto` |
| `xc_kernel` | 需设为`bse`，配合`esolver_type lr`共同指定计算任务为BSE | `bse` | `lda` |
| `lr_nstates` | 指定要求解的激发态的数量，`-1`表示全部求解 | -1 | 1 |
| `nocc` | 指定计入电子空穴对的价带数量 | 4 | 自动（内部初值为-1） |
| `nvirt` | 指定计入电子空穴对的导带数量 | 4 | 1 |
| `out_wfc_lr` | 是否在对角化BSE矩阵后输出本征值和本征向量，可用于后续直接做吸收谱分析 | 1 | 0 |
| `lr_solver` | BSE实现支持`elpa`、`spectrum`和`plot`：`elpa`完整对角化BSE矩阵；`spectrum`读取已有本征结果计算光谱；`plot`读取TDA本征结果绘制激子密度。后两者依赖先前任务开启`out_wfc_lr` | `elpa` | `dav`（通用LR默认值，BSE任务不可用） |
| `bse_spin_types` | 支持`singlet`、`triplet`、`rpa`、`ipa`，可以一个任务中同时计算。如果单独使用`ipa`，会绕过对角化直接算光谱 | `singlet` | `singlet triplet` |
| `bse_tda` | 支持`tda`、`full`、`both` | `both` | `tda` |
| `bse_use_fine_kgrid` | k网格模式：`0`使用粗k网格，`1`使用均匀密集k网格`band_kpath_info`，`2`使用非均匀密集k网格`KPT_bse`。模式`1`和`2`均还需要准备`band_KS_eigenvector_k_{index}.txt`、`KS_band_spin_{index}.txt`和`GW_band_spin_{index}.txt` | 1 | 0 |
| `bse_q_approx_mode` | q到k对的映射模式：`0`精确映射；`1`使用粗q网格近似；`2`对接近Γ点的q点精确映射、其余q点使用粗网格近似 | 0 | 0 |
| `bse_q_approx_threshold` | 当`bse_q_approx_mode=2`时，使用精确q映射的阈值半径，单位为Bohr$^{-1}$ | 0.1 | 0.1 |
| `bse_ri_hartree` | 开启后，V矩阵将用LocalRI算法加速，否则用格点积分的方式计算 | 1 | 1 |
| `out_bse_ab` | 是否将A/B矩阵的V、W部分写为`A_V_matrix_*`、`A_W_matrix_*`、`B_V_matrix_*`和`B_W_matrix_*`文件 | 0 | 0 |
| `bse_continue` | 从上一次BSE计算的哪一步继续：`0`重新计算；`1`读取V_A；`2`读取V_A和W_A；`3`读取V_A、W_A和V_B；`4`读取V_A、W_A、V_B和W_B。需要上一任务开启`out_bse_ab`，并让`read_file_dir`目录下存在这些文件的读取链接 | 0 | 0 |
| `bse_mem_save` | 开启后，程序不再单独存储V和W矩阵，这对于节省内存有很大帮助，但会自动关闭`bse_continue`并自动开启`bse_ri_hartree` | 0 | 0 |
| `abs_gauge` | 支持`velocity`和`length`，仅在分子体系且分子的结构位于超胞中央时，`length`的结果才是可靠的 | `velocity` | `velocity` |

**BSE自旋类型参数说明**

`bse_spin_types`参数对应的公式为：

$$
\begin{aligned}
A_{ai\bm{k}_1,bj\bm{k}_2}^\text{BSE}=&(E_{a\bm{k}_1}^\text{GW}-E_{i\bm{k}_1}^\text{GW})\delta_{ab}\delta_{ij}\delta_{\bm{k}_1\bm{k}_2} + \alpha (a\bm{k}_1^*,i\bm{k}_1|V|j\bm{k}_2^*,b\bm{k}_2)+\beta (j\bm{k}_2^*,i\bm{k}_1|W|a\bm{k}_1^*,b\bm{k}_2) \\
B_{ai\bm{k}_1,bj\bm{k}_2}^\text{BSE}=& \alpha (a\bm{k}_1^*,i\bm{k}_1|V|b\bm{k}_2^*,j\bm{k}_2)+ \beta(b\bm{k}_2^*,i\bm{k}_1|W|a\bm{k}_1^*,j\bm{k}_2)
\end{aligned}
$$

| spin type | $\alpha$ | $\beta$ |
| --------- | -------- | ------- |
| singlet | 2 | -1 |
| triplet | 0 | -1 |
| rpa | 2 | 0 |
| ipa | 0 | 0 |

### 3.5 分析结果
对于本示例，经过计算，可以在`abacusjob-bse.log`中看到TDA和full的激子结合能分别为
```
Excition binding energies (eV):0.0798939
.......
Excition binding energies (eV):0.0801936
```
理想情况下，全部激发态的振子强度（oscillator strength）总和应满足f-sum rule：
$$
\frac{2}{3 N_\text{e} N_\bm{ k }}\sum_M\Omega_{MN}|\langle M|\hat{\vec{r}}|N\rangle|^2 = \frac{2}{3 N_\text{e} N_\bm{ k }}\sum_M\Omega_{S} \left|\sum_{ai\bm{ k }}\frac{\langle i\bm{k}|\vec{v}|a\bm{k}\rangle}{E_a-E_i} X_{ai\bm{k}}^{S} + \frac{\langle a\bm{k}|\vec{v}|i\bm{k}\rangle}{E_i-E_a} Y_{ai\bm{k}}^{S} \right|^2 = 1
$$
本例截取有限的价带、导带和激发态后，TDA与Full分别给出
```
Total oscillator strength = 0.985785
.......
Total oscillator strength = 0.857979
```

执行`plot_spectrum.ipynb`后可以得到光吸收谱（介电函数的虚部）：
$$
\epsilon_{2}(\omega)=\sum_{S}\frac{4\pi^{2}}{N_{k}V}\left|\sum_{ai\bm{ k }}\frac{\langle i\bm{k}|\vec{v}|a\bm{k}\rangle}{E_a-E_i} X_{ai\bm{k}}^{S} + \frac{\langle a\bm{k}|\vec{v}|i\bm{k}\rangle}{E_i-E_a} Y_{ai\bm{k}}^{S}\right|^{2}\delta(\omega-\Omega_{S})
$$
其中$\delta$函数用洛伦兹展宽做了近似，展宽取为0.15eV。
<img src="/si_absorption_spectrum.png" alt="Si吸收谱" style="width: 65%;">

图中显示了Si的吸收谱，包含TDA（Tamm-Dancoff近似）和Full（完整BSE）两种计算结果。

另外，`OUT.bse/`目录下还会生成以下主要输出文件：

| 文件名 | 说明 |
|--------|------|
| `trans_dipole_singlet_tda.dat`<br>`trans_dipole_singlet_full.dat` | TDA近似/完整BSE的跃迁偶极矩数据 |
| `trans_analysis_singlet_tda.dat`<br>`trans_analysis_singlet_full.dat` | TDA近似/完整BSE的激发态跃迁分析 |
| `trans_kweight_singlet_tda.dat`<br>`trans_kweight_singlet_full.dat` | TDA近似/完整BSE的k点跃迁贡献分析 |
| `Excitation_Amplitude_singlet_{rank}.dat` | TDA自旋单态的激发态振幅（rank为进程编号） |
| `Excitation_Amplitude_full_X_singlet_{rank}.dat`<br>`Excitation_Amplitude_full_Y_singlet_{rank}.dat` | 完整BSE的$X$、$Y$激发态振幅 |
| `Excitation_Energy_singlet.dat`<br>`Excitation_Energy_full_singlet.dat` | TDA近似/完整BSE的自旋单态激发能（单位Ry） |

GW band和BSE吸收谱的参考数据文件可参考附件下的：/example-k555-f666/ref

该示例使用k555×f666网格，个人实测使用Intel Xeon Platinum 8260，分配1进程48线程，耗时为：
- **scf计算**：16分钟
- **nscf计算**：4秒
- **LibRPA GW计算**：4小时32分钟
- **BSE计算**：9分钟
- **总计算时间**：4小时57分钟

后续如果想从k555的自能矩阵出发续算插值到更密的k网格，只需修改`KPT_nscf`，再执行`create_continue.sh`即可一键完成。

## 四、绘制激子密度
在上一节中，我们得到了激子波函数的系数，可以据此构造平均或条件激子密度。目前程序只支持处理TDA近似后的计算结果。

激子波函数是个两体波函数
$$
\Psi^S(\bm{ r }_e,\bm{ r }_h) = \sum_{ai\bm{k}}X^S_{ai\bm k}\psi^\bm{k}_a(\bm{r_e})\psi_i^{\bm{k}*}(\bm{r_h})
$$
这是一个关于两个坐标的六维函数。关于它的可视化一般有两种做法：
- 平均密度：积分掉其中一个坐标。这种做法的优点是计算简单，缺点是失去了两个坐标的关联性，因此无法反映两个坐标的相对位置关系。
$$
\rho_e^{avg}(\mathbf{r}_e) \equiv \int \mathrm d \bm r_h |\Psi^S(\bm r_e, \bm r_h)|^2= \sum_{ab\bm k} \left(\sum_{i}X^S_{ai\bm k}X^{S*}_{bi\bm k} \right)\psi^{\bm k}_{a}(\bm{r}_e)\psi^{\bm k*}_{b}(\bm{r}_e)
$$
- 条件密度：固定其中一个坐标。这种做法保留了两个坐标的相对位置关系，但需要不断变化固定值来观察关联性。
$$
\rho^{cond}_e(\bm{r}_e | \bm{r}_h=\bm{r}_0) =|\Psi^S(\bm{ r }_e,\bm{ r }_h = \bm{r}_0)|^2 = \left| \sum_{ai\bm k} X^S_{ai\bm k} \psi_{a}^{\bm k}(\mathbf{r}_e)\psi_{i}^{\bm k*}(\mathbf{r}_0) \right|^2
$$
接下来介绍操作流程：
### 4.1 ABACUS的INPUT文件
将附件中的`INPUT_plot`改成`INPUT`后，再次运行ABACUS即可。绘图任务需要设置`lr_solver plot`，其余相关参数含义如下：

| 参数 | 描述 | 本文取值 | 默认值 |
|------|------|----------|--------|
| `read_file_dir` | 读取上一阶段BSE本征结果的目录 | `OUT.bse` | `auto` |
| `lr_solver` | 进入激子密度绘图模式 | `plot` | `dav` |
| `plot_istate` | 要绘制的激发态编号，从`0`开始 | 0 | 0 |
| `exciton_plot_type` | 可选`average`或`conditional`，后者通过`exciton_fixed_coordinate`固定其中的一个粒子 | `conditional` | `average` |
| `exciton_plot_format` | 输出格式：`average`支持`cube`、`slice`或`both`；`conditional`只支持`slice` | `slice` | `cube` |
| `exciton_fixed_coordinate` | 条件密度固定的笛卡尔坐标，单位Bohr，顺序为`hole_x hole_y hole_z electron_x electron_y electron_z`，必须给出6个数 | `2.5 2.5 2.5 2.5 2.5 2.5` | `0 0 0 0 0 0` |
| `exciton_slice_plane` | 切片平面，由晶格矢量方向组成，可选`ab`、`bc`或`ca` | `ca` | `ab` |
| `exciton_slice_pos` | 沿切片法向剩余晶格矢量方向的偏移，单位Bohr；`ab`、`bc`、`ca`分别对应沿`c`、`a`、`b`方向 | 0.0 | 0.0 |
| `exciton_slice_npoints` | 切片面内每个方向的目标网格点数；实际网格覆盖`exciton_slice_range`并包含两端点 | 200 | 200 |
| `exciton_slice_range` | 切片覆盖的原胞范围，格式为`ustart uend vstart vend`；末端值是排他的原胞边界，但网格数据包含范围端点 | `-4 4 -4 4` | `-1 2 -1 2` |

`nocc`、`nvirt`、`bse_spin_types`、`bse_use_fine_kgrid`等描述粒子—空穴基组的设置应与产生TDA本征向量的BSE任务保持一致。附件中的`INPUT_plot`只生成条件密度，若要生成平均密度，还需手动将`exciton_plot_type`改为`average`后再运行一次。

### 4.2 绘制 slice 图
使用ABACUS目录下的`tools/02_postprocessing/plot-tools/plot_exciton_silce.py`脚本，可以绘制slice格式的切片激子密度图。执行命令时在后面加上相应的`.dat`文件即可。

<figure>
  <img src="/si_exciton_slices/si_exciton_slices_2x2.png" alt="Si的切片激子密度图" style="width: 100%;">
  <figcaption>图：Si 的切片激子密度。(a) 平均电子密度；(b) 平均空穴密度；(c) 固定空穴坐标后的条件电子密度；(d) 固定电子坐标后的条件空穴密度。四幅图均为第 0 个激发态、ca平面切片；条件密度图的固定坐标为 (2.5, 2.5, 2.5) Bohr。</figcaption>
</figure>

从(a)和(b)可以看出，平均电子密度与平均空穴密度都呈现出明显的原胞周期性。(c)和(d)所展示的条件密度则呈现出关于BvK超胞的周期性。

> [!Tip]
> 注意：绘制后得到的`Exciton_{avg|cond}_{elec|hole}_slice_state{index}.dat`文件中，第6行的BvK信息默认来自稀疏k网格，还需手动修正为密集k网格所对应的Born–von Karman超胞。因为密集k网格也支持非均匀类型，这意味着很难自动识别对应的BvK超胞。

## 五、目前已知的需要注意的地方
1. 进程并行配置的原则是，BSE矩阵的2d块循环local部分的矩阵元不超过有符号32位整数的上限，即$2^{31}-1$。否则ScaLAPACK和ELPA可能会出现问题。
    线程并行并不是开得越多越好，实测在线程数比较大的时候，很可能在cvc部分报std::bad_alloc（尽管系统的内存还有100G，暂不清楚具体原因）
    案例：在测试k=21×21×21, nocc=4, nvirt=4的情形时，推荐使用16个进程×16个线程的并行方案。
2. 用坐标算符的形式计算跃迁偶极矩仅仅适用于分子体系，且需要确保分子处于超胞的中央。一旦某个KS波函数跨原胞，坐标期望值的计算会出现问题。

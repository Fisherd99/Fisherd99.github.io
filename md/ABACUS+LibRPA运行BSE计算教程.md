---
title: ABACUS+LibRPA运行BSE计算教程
lang: zh-CN
date: 2026-02-04
author: "Fisherd"
categories: 物理
tags:
  - BSE
  - GW
  - 凝聚态物理
description: 方便新手快速上手
---

## 计算流程概览

BSE的计算包含scf→nscf→GW→BSE四个步骤，所有步骤都写在示例包[example-k555-f888.tar.gz](/example-k555-f888.tar.gz)的`create.sh`脚本中，可以结合脚本快速上手。

1.用ABACUS做scf计算，并导出`band_out`、`coulomb_cut_{rank}.txt`、`coulomb_mat_{rank}.txt`、`coulomb_unshrinked_cut_{rank}.txt`、`Cs_data_{rank}.txt`、`Cs_shrinked_data_{rank}.txt`、`KS_eigenvector_{index}.dat`、`shrink_sinvS_{rank}.txt`、`velocity_matrix`、`vxc_out`、`stru_out`

2.用ABACUS做nscf计算，并用`preprocess_abacus_for_librpa_band.py`导出`band_kpath_info`、`band_KS_eigenvalue_k_{index}.txt`、`band_KS_eigenvector_k_{index}.txt`、`band_vxc_k_{index}.txt`

3.用LibRPA做GW计算，并导出`energy_qp`、`EXX_band_spin_{index}.txt`、`KS_band_spin_{index}.txt`、`GW_band_spin_{index}.txt`

4.用ABACUS做BSE计算，在OUT.bse中会出现`trans_dipole/analysis_{spintype}_{tdatype}.dat`两个文件，里面包含了主要的计算结果。
## 软件安装
#### ABAUCS
目前ABACUS需要两个分支上的功能：abfs_moment_after_merge和BSE，需要对这两个分支分别clone下来分别编译
```sh
git clone https://github.com/Fisherd99/abacus-BSE.git -b abfs_moment_after_merge /abacus-rpa
git clone https://github.com/Fisherd99/abacus-BSE.git -b BSE /abacus-BSE
```
具体编译流程可以参考官方文档。
#### LibRI
BSE的张量乘法计算功能依托于LibRI的Tensor框架，目前需要分支cvc-lr的功能
```sh
git clone https://github.com/Fisherd99/LibRI.git -b cvc-lr
```
#### LibRPA
BSE基于GW的计算结果，GW需要用LibRPA执行
```sh
git clone https://github.com/Fisherd99/LibRPA.git -b merge_qsgw
cmake -B build -DUSE_LIBRI=ON \
    -DCEREAL_INCLUDE_DIR=$CEREAL_PATH/include \
    -DLIBRI_INCLUDE_DIR=$LibRI_PATH/include \
    -DLIBCOMM_INCLUDE_DIR=$HLibComm_PATH/include \
    -DUSE_GREENX_API=ON
    -DCMAKE_CXX_FLAGS="-DLIBRPA_VERBOSE"
```
## 执行计算任务
在例子[example-k555-f888.tar.gz](/example-k555-f888.tar.gz)中，文件夹结构如下
```
├ create_continue.sh                    # 重新更改密集k网格KPT_nscf后续算
├ create.sh                             # 一键执行全部任务
├ INPUT_bse
├ INPUT_nscf
├ INPUT_scf
├ KPT_nscf
├ KPT_scf
├ librpa.in                             # LibRPA的输入文件
├ plot_compare.py                       # 画GW band
├ plot.ipynb                            # 画吸收谱
├ preprocess_abacus_for_librpa_band.py  # LibRPA的输入文件
├ Si_3s3p2d1f1g_pca1e-6.abfs            # 为了降低LRI误差人为增大的辅助基
├ Si_gga_8au_100Ry_3s3p2d.orb
├ Si_ONCV_PBE-1.0.upf
└ STRU
```
任务流程可以阅读create.sh脚本。下面对四个步骤中的参数做具体解释
### 1. scf
#### INPUT_scf

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `exx_use_ewald` | 开启后会计算`coulomb_mat`，它在做库伦积分时截断的方式更完整，用于GW计算中的head+wing修正 | 0 |
| `exx_pca_threshold` | 设为10会跳过默认的辅助基构造，直接读取`.abfs`文件中预设的辅助基 | 0.0001 |
| `out_unshrinked_v` | 开启后输出辅助基在压缩前的硬截断库伦矩阵 | 0 |
| `shrink_abfs_pca_thr`<br>`shrink_lu_inv_thr` | 从初始辅助基压缩到小辅助基的筛选参数 | -1 <br> 1e-6 |
| `out_mat_xc` | 输出`vxc_out.dat`，后续会复制为`vxc_out` | 0 |
| `rpa` | 输出第一节中所列举的其他所有文件 | 0 |

#### KPT_scf
做GW计算时所用的稀疏k网格
### 2. nscf
#### INPUT_nscf

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `out_mat_xc` | 输出`vxcsXkY_nao.txt`，后续转为`band_vxc_k_{index}.txt` | 0 |
| `out_wfc_lcao` | 输出`wfsXkY_nao.txt`，后续转为`band_KS_eigenvector_k_{index}.txt` | 0 |

#### KPT_nscf
做BSE计算时所用的密集k网格，也可以用于指定GW band所采用的k path

### 3. GW
#### librpa.in

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `task = g0w0_band` | 告诉LibRPA执行g0w0band任务 | rpa |
| `option_dielect_func = 3` | 设为3时在GW任务中做head+wing修正 | 2 |
| `replace_w_head = t` | 配合`option_dielect_func = 3`使用 | t |
| `use_shrink_abfs = t` | 在计算介电函数$\varepsilon$时使用压缩后的小辅助基 | f |
| `use_shrink_chi = f` | 在计算响应函数$\chi$时使用未压缩前的大辅助基 | t |
| `output_Wc_Rf_mat = 1` | 输出辅助基下的静态屏蔽库伦矩阵$W(R,i\omega \approx 0)$ | 0 |
| `output_gw_sigc_mat_rf = t` | 输出原子基下的自能矩阵$\Sigma(R,i\omega)$ | f |
| `band_continue = f` | 是否从自能矩阵出发续算 | f |
| `output_energy_qp = t` | 输出`energy_qp` | f |

### 4. BSE
#### INPUT_bse

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `esolver_type` | 需设为`lr`，配合`xc_kernel bse`共同指定计算任务为BSE | ksdft |
| `xc_kernel` | 需设为`bse`，配合`esolver_type lr`共同指定计算任务为BSE | lda |
| `lr_nstates` | 指定要求解的激发态的数量，`-1`表示全部求解 | 1 |
| `nocc` | 指定计入电子空穴对的价带数量 | -1 |
| `nvirt` | 指定计入电子空穴对的导带数量 | 1 |
| `out_wfc_lr` | 是否在对角化BSE矩阵后输出本征值和本征向量 | 0 |
| `lr_solver` | `elpa`代表完整地求解BSE矩阵，`spectrum`代表读入对角化BSE矩阵后的结果计算吸收谱（依赖于上一任务开启`out_wfc_lr`） | `dav` |
| `bse_spin_types` | 支持`singlet`、`triplet`、`rpa`、`ipa`，可以一个任务中同时计算 | `singlet triplet` |
| `bse_tda` | 支持`tda`、`full`、`both` | `tda` |
| `bse_use_fine_kgrid` | 1使用密集k网格计算BSE；0使用稀疏k网格（强烈推荐设为1） | 0 |
| `bse_ri_hartree` | 开启后，V矩阵将用LocalRI算法加速，否则用格点积分的方式计算 | 1 |
| `bse_write_ab` | 输出AB矩阵和V_A、W_A、V_B、W_B | 0 |
| `bse_continue` | 0不续算；1从V_A续算；2从W_A续算；3从V_B续算；4从W_B续算（依赖于上一任务开启`bse_write_ab`） | 0 |
| `bse_mem_save` | 开启后，程序不再单独存储V和W矩阵，这对于节省内存有很大帮助，但会自动关闭`bse_continue`并自动开启`bse_ri_hartree` | 0 |
| `abs_gauge` | 支持`velocity`和`length`，仅在分子体系且分子的结构位于超胞中央时，`length`的结果才是可靠的 | `velocity` |

**BSE自旋类型参数说明**

`bse_spin_types`参数对应的公式为：

$$
\begin{aligned}
A_{ai\boldsymbol{k}_1,bj\boldsymbol{k}_2}^\mathrm{BSE}=&(E_{a\boldsymbol{k}_1}^\mathrm{GW}-E_{i\boldsymbol{k}_1}^\mathrm{GW})\delta_{ab}\delta_{ij}\delta_{\boldsymbol{k}_1\boldsymbol{k}_2} + \alpha (ai\boldsymbol{k}_1|V|jb\boldsymbol{k}_2)+\beta (j\boldsymbol{k}_2,i\boldsymbol{k}_1|W|a\boldsymbol{k}_1,b\boldsymbol{k}_2) \\
B_{ai\boldsymbol{k}_1,bj\boldsymbol{k}_2}^\mathrm{BSE}=& \alpha (ai\boldsymbol{k}_1|V|bj\boldsymbol{k}_2)+ \beta(b\boldsymbol{k}_2,i\boldsymbol{k}_1|W|a\boldsymbol{k}_1,j\boldsymbol{k}_2)
\end{aligned}
$$

| spin type | $\alpha$ | $\beta$ |
| --------- | -------- | ------- |
| singlet | 2 | -1 |
| triplet | 0 | -1 |
| rpa | 2 | 0 |
| ipa | 0 | 0 |

对于示例包[example-k555-f888.tar.gz](/example-k555-f888.tar.gz)，经过计算，可以在`abacus-bse.log`中看到TDA和full的激子结合能为
```
Excition binding energies (eV):0.03598
.......
Excition binding energies (eV):0.0360718
```
激子的振子强度(oscilation strength)满足f-sum rule
$$
\frac{2}{3 N_\text{e} N_\boldsymbol{ k }}\sum_M\Omega_{MN}|\langle M|\hat{\vec{r}}|N\rangle|^2 = \frac{2}{3 N_\text{e} N_\boldsymbol{ k }}\sum_M\Omega_{S} \left|\sum_{ai\boldsymbol{ k }}\frac{\langle i\boldsymbol{k}|\vec{v}|a\boldsymbol{k}\rangle}{E_a-E_i} X_{ai\boldsymbol{k}}^{S} \right|^2 = 1
$$
两者分别给出
```
Total oscillator strength = 0.939865
.......
Total oscillator strength = 1.07042
```

执行`plot.ipynb`后应当得到这样的吸收谱：

<img src="/si_absorption_spectrum.png" alt="Si吸收谱" style="width: 65%;">

图中显示了Si的吸收谱，包含TDA（Tamm-Dancoff近似）和Full（完整BSE）两种计算结果。计算完成后，`OUT.bse/`目录下会生成以下主要输出文件：

| 文件名 | 说明 |
|--------|------|
| `trans_dipole_singlet_tda.dat` | TDA近似下的跃迁偶极矩数据（自旋单态） |
| `trans_dipole_singlet_full.dat` | 完整BSE计算的跃迁偶极矩数据（自旋单态） |
| `trans_analysis_singlet_tda.dat` | TDA近似下的跃迁分析数据（自旋单态） |
| `trans_analysis_singlet_full.dat` | 完整BSE计算的跃迁分析数据（自旋单态） |

GW和BSE的相关输出文件可参考：/example-k555-f888/ref

该示例使用k555×f888网格：
- **LibRPA GW计算**：约3小时（48核）
- **BSE计算**：约50分钟
- **总计算时间**：约4小时

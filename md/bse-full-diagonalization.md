---
title: BSE中full情形的对角化流程
lang: zh-CN
date: 2025-01-15
author: "Fisherd"
categories: 物理
tags:
  - BSE
  - 对角化
  - 凝聚态物理
description: BSE计算中超越TDA近似的方法
---
# BSE中full情形的对角化流程

本文是以下两篇文章的阅读笔记

M. Shao, F. H. Da Jornada, C. Yang, J. Deslippe, and S. G. Louie, “Structure preserving parallel algorithms for solving the Bethe–Salpeter eigenvalue problem,” Linear Algebra and its Applications 488, 148–167 (2016)

C. Penke, A. Marek, C. Vorwerk, C. Draxl, and P. Benner, “High performance solution of skew-symmetric eigenvalue problems with applications in solving the Bethe-Salpeter eigenvalue problem,” Parallel Computing 96, 102639 (2020).

在Full BSE中
$$
\begin{bmatrix}
A & B \\
B^* & A^*
\end{bmatrix}\begin{bmatrix}
X  \\
Y
\end{bmatrix}=\Omega \begin{bmatrix}
I & 0 \\
0 & -I
\end{bmatrix}\begin{bmatrix}
X  \\
Y
\end{bmatrix}
$$
其中
$$
\begin{aligned}
A_{ai\boldsymbol{k}_1,bj\boldsymbol{k}_2}^\mathrm{BSE}=&(E_{a\boldsymbol{k}_1}^\mathrm{GW}-E_{i\boldsymbol{k}_1}^\mathrm{GW})\delta_{ab}\delta_{ij}\delta_{\boldsymbol{k}_1\boldsymbol{k}_2} + \alpha (ai\boldsymbol{k}_1|V|jb\boldsymbol{k}_2)-(j\boldsymbol{k}_2,i\boldsymbol{k}_1|W|a\boldsymbol{k}_1,b\boldsymbol{k}_2) \\
B_{ai\boldsymbol{k}_1,bj\boldsymbol{k}_2}^\mathrm{BSE}=&(ai\boldsymbol{k}_1|V|bj\boldsymbol{k}_2)-(b\boldsymbol{k}_2,i\boldsymbol{k}_1|W|a\boldsymbol{k}_1,j\boldsymbol{k}_2) 
\end{aligned}
$$
可以验证，A是厄米矩阵，B是对称矩阵。对于复数Full BSE矩阵，文章提出了以下对角化步骤：

第一步，构造M
$$M=\begin{bmatrix}
\Re(A+B) & \Im(A-B) \\
-\Im(A+B) & \Re(A-B)
\end{bmatrix}$$
第二步，构造J
$$J=\begin{bmatrix}
0 & I\\
-I & 0
\end{bmatrix}$$
第三步，Cholesky分解M
$$
M = U^TU
$$
第四步，构造反对称矩阵$C=UJU^T$
第五步，调用skew_eigenvectors对角化反对称矩阵，得到本征值和本征矢
$$
Cz=\Omega z
$$
第六步，构造SQ
$$
SQ=\frac{1}{\sqrt2}\begin{bmatrix}
I & -i I\\
-I & -i I
\end{bmatrix}
$$
然后得到原BSE方程的归一化的本征右矢
$$
v=SQU^Tz\Omega^{-1/2}
$$
本征右矢的构成是
$$
v=\begin{bmatrix}
X & Y^* \\
Y & X^*
\end{bmatrix}, \quad X^\dagger X - Y^\dagger Y=1
$$
与之正交归一的本征左矢构成是
$$
v_l=\begin{bmatrix}
X & -Y^* \\
-Y & X^*
\end{bmatrix}, \quad v_l^\dagger v=I
$$
### 光谱
在tda近似下，吸收谱是按下式计算的
$$
\begin{aligned}
\epsilon_{2}(\omega)&\xlongequal{\text{length}}\sum_{S}\frac{4\pi^{2}}{N_{k}V}\left|\sum_{ai\boldsymbol{ k }}\langle i\boldsymbol{k}|\vec{r}|a\boldsymbol{k}\rangle X_{ai\boldsymbol{k}}^{S}\right|^{2}\delta(\omega-\Omega_{S})\\
&\xlongequal{\text{vel\_div}}\sum_{S}\frac{4\pi^{2}}{N_{k}V}\left|\sum_{ai\boldsymbol{ k }}\frac{\langle i\boldsymbol{k}|\vec{v}|a\boldsymbol{k}\rangle}{E_a-E_i} X_{ai\boldsymbol{k}}^{S}\right|^{2}\delta(\omega-\Omega_{S})\\
&\xlongequal{\text{vel}}\sum_{S}\frac{4\pi^{2}}{N_{k}V\omega^{2}}\left|\sum_{ai\boldsymbol{ k }}\langle i\boldsymbol{k}|\vec{v}|a\boldsymbol{k}\rangle X_{ai\boldsymbol{k}}^{S}\right|^{2}\delta(\omega-\Omega_{S})
\end{aligned}
$$
根据矩阵的谱分解，full应该是按下式推广为
$$
\epsilon_2(\omega) = \sum_{S} \frac{4\pi^2}{N_k V \omega^2} \left( \sum_{vck} \braket{v\mathbf k| \vec v |c\mathbf k} X_{vck}^S+\braket{c\mathbf k| \vec v |v\mathbf k} Y_{vck}^S\right)\left( \sum_{vck} \braket{v\mathbf k| \vec v |c\mathbf k} X_{vck}^S-\braket{c\mathbf k| \vec v |v\mathbf k} Y_{vck}^S\right)^* \delta(\omega-\Omega_n)
$$
但是经过测试，上式和tda的结果相差很大。目前程序中使用的还是
$$
\epsilon_2(\omega) = \sum_{S} \frac{4\pi^2}{N_k V \omega^2} \left| \sum_{vck} \braket{v\mathbf k| \vec v |c\mathbf k} X_{vck}^S+\braket{c\mathbf k| \vec v |v\mathbf k} Y_{vck}^S\right|^2 \delta(\omega-\Omega_n)
$$
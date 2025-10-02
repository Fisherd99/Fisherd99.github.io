---
title: k空间和R空间的LRI矩阵元
lang: zh-CN
date: 2025-10-02
author: "Fisherd"
categories: 物理
description: 关于k空间和R空间的变换关系，以及Local RI在两个表象下的变换关系
---

# k空间和R空间的LRI矩阵元

## 1.一些初步的认识

### 1.1周期边界条件在R空间产生的镜像BVK超胞

考虑k=4×4×1的这样一个BvK超胞

<table>
  <thead>
    <tr>
      <th></th>
      <td colspan="2">R<sub>x</sub>=-1</td> 
      <th colspan="2">R<sub>x</sub>=0</th> 
      <th colspan="2">R<sub>x</sub>=1</th> 
      <th colspan="2">R<sub>x</sub>=2</th> 
      <th colspan="2">R<sub>x</sub>=3</th> 
      <td colspan="2">R<sub>x</sub>=4</td> 
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">R<sub>y</sub>=-1</td>
      <td></td><td style="background: #6a00ea" >I<sup>'</sup><sub>4</sub></td>
      <td></td><td style="background: #d1666f">I<sup>'</sup><sub>3</sub></td>
      <td></td><td>I</td><td></td><td>I</td><td></td><td>I</td><td></td><td>I</td>
    </tr>
    <tr>
      <td>J</td><td></td> <td>J</td><td></td><td>J</td><td></td><td>J</td><td></td>
      <td>J</td><td></td><td>J</td><td></td>
    </tr>
    <tr>
      <th rowspan="2">R<sub>y</sub>=0</th>
      <td></td><td style="background: #1976d2">I<sup>'</sup><sub>2</sub></td>
      <td style=" border-top: 5px solid orange;  border-left: 5px solid orange"></td><td style="background: #43cc6c; border-top: 5px solid orange">I<sub>1</sub></td>
      <td style=" border-top: 5px solid orange"></td><td style=" border-top: 5px solid orange">I</td>
      <td style=" border-top: 5px solid orange"></td><td style=" border-top: 5px solid orange">I</td>
      <td style=" border-top: 5px solid orange"></td><td style="border-top: 5px solid orange; border-right: 5px solid orange; background: #145699">I<sub>2</sub></td>
      <td></td><td>I</td>
    </tr>
    <tr>
      <td>J</td><td></td> <td style=" border-left: 5px solid orange">J</td><td></td><td>J</td><td></td><td>J</td><td></td>
      <td>J</td><td></td><td style=" border-left: 5px solid orange">J</td><td></td>
    </tr>
    <tr>
      <th rowspan="2">R<sub>y</sub>=1</th> <td></td><td>I</td>
      <td style=" border-left: 5px solid orange"></td><td>I</td>
      <td></td><td>I</td><td></td><td>I</td><td></td><td>I</td>
      <td style=" border-left: 5px solid orange"></td><td>I</td>
    </tr>
    <tr>
      <td>J</td><td></td> <td style=" border-left: 5px solid orange">J</td><td></td>
      <td>J</td><td></td><td>J</td><td></td>
      <td>J</td><td></td><td style=" border-left: 5px solid orange">J</td><td></td>
    </tr>
    <tr>
      <th rowspan="2">R<sub>y</sub>=2</th> <td></td><td>I</td>
      <td style=" border-left: 5px solid orange"></td><td>I</td>
      <td></td><td>I</td><td></td><td>I</td><td></td><td>I</td>
      <td style=" border-left: 5px solid orange"></td><td>I</td>
    </tr>
    <tr>
      <td>J</td><td></td> <td style=" border-left: 5px solid orange">J</td><td></td>
      <td>J</td><td></td><td>J</td><td></td>
      <td>J</td><td></td><td style=" border-left: 5px solid orange">J</td><td></td>
    </tr>
      <tr>
      <th rowspan="2">R<sub>y</sub>=3</th> <td></td><td>I</td>
      <td style=" border-left: 5px solid orange"></td><td style="background: #a45259">I<sub>3</sub></td>
      <td></td><td>I</td><td></td><td>I</td>
      <td></td><td style="background: #490f90">I<sub>4</sub></td>
      <td style=" border-left: 5px solid orange"></td><td>I</td>
    </tr>
    <tr>
      <td>J</td><td></td>
      <td style=" border-left: 5px solid orange; border-bottom: 5px solid orange">J</td><td style=" border-bottom: 5px solid orange"></td>
      <td style=" border-bottom: 5px solid orange">J</td><td style=" border-bottom: 5px solid orange"></td>
      <td style=" border-bottom: 5px solid orange">J</td><td style=" border-bottom: 5px solid orange"></td>
      <td style=" border-bottom: 5px solid orange">J</td><td style=" border-bottom: 5px solid orange"></td>
      <td style=" border-left: 5px solid orange">J</td><td></td>
    </tr>
      <tr>
      <td rowspan="2">R<sub>y</sub>=4</td> <td></td><td>I</td><td></td><td>I</td>
      <td></td><td>I</td><td></td><td>I</td><td></td><td>I</td><td></td><td>I</td>
    </tr>
    <tr>
      <td>J</td><td></td> <td>J</td><td></td><td>J</td><td></td><td>J</td><td></td>
      <td>J</td><td></td><td>J</td><td></td>
    </tr>
  </tbody>
</table>

虽然实际上$V(\mathbf{R}=\{3,0,0\})\neq V(\mathbf{R}=\{-1,0,0\})$，但当我们对实际空间的所有R傅里叶变换到4×4×1的k空间，再反傅里叶变换回R空间时，就会有
$$
\begin{aligned}
\widetilde V(\mathbf R)&=\frac 1 {N_k}\sum_{\mathbf k\in \text{BZ}}\sum_{\mathbf R'\in\text{all}} V(\mathbf R')\mathrm e^{i\mathbf k (\mathbf R'-\mathbf R)} \\
&= \sum_{\mathbf R'\in\text{all}} V(\mathbf R') \delta (\mathbf R'-\mathbf R-n \mathbf R_\text{BvK})\\
&=\displaystyle \sum_{n} V(\mathbf R+ n \mathbf R_\text{BvK})
\end{aligned}
$$
也就是出现了周期性，对于刚刚的例子就是$\widetilde V(\mathbf{R}=\{3,0,0\})=\widetilde V(\mathbf{R}=\{-1,0,0\})$。在图中，尽管实际上原子I1离原子I2有3个晶格常数，但周期边界条件会把它等价到镜像超胞的原子I2'上，最终的库仑势为所有等价原子的库伦积分之和。

同理，$V(\mathbf{R}=\{3,0,0\})=V(\mathbf{R}=\{0,-1,0\})$；$V(\mathbf{R}=\{3,3,0\})=V(\mathbf{R}=\{-1,-1,0\})$ 。从这个意义上来说，BvK超胞的最短尺寸应当大于库伦积分截断半径（基函数半径× rpa_ccp_rmesh_times）的2倍。

同样的，虽然原始的C并不具有周期性$C_{s(0)t(3,0,0)}^{\mu(0)}\neq C_{s(0)t(-1,0,0)}^{\mu(0)},C_{s(0)t(0,3,0)}^{\mu(0)}\neq C_{s(0)t(0,-1,0)}^{\mu(0)},C_{s(0)t(3,3,0)}^{\mu(0)}\neq C_{s(0)t(-1,-1,0)}^{\mu(0)}$ ，但最终参与计算的C将所有等价原胞折叠到一起$\widetilde C_{\mathrm{s}(0)t(-1,0,0)}^{\mu(0)}=C_{s(0)t(-1,0,0)}^{\mu(0)}+C_{s(0)t(3,0,0)}^{\mu(0)}+\cdots$ 
### 1.2k空间是R空间分块对角化的结果

在k=4×1×1的一个BvK超胞中，R空间的哈密顿量具有平移对称性，利用这一性质可以在原胞尺度上对哈密顿量做分块对角化，只剩下k的对角块
$$\begin{aligned}
&H_{st}(\mathbf R)=\langle\psi_{s}(\mathbf r-\mathbf \tau_{s})|\hat{H}|\psi_{t}(\mathbf r-\mathbf \tau_{t}-\mathbf R)\rangle \leftrightarrow \begin{bmatrix}H(0)&H(1)&H(2)&H(-1)\\H(-1)&H(0)&H(1)&H(2)\\H(2)&H(-1)&H(0)&H(1)\\H(1)&H(2)&H(-1)&H(0)\end{bmatrix} \\
&=\frac{1}{4}\begin{bmatrix}\mathrm{e}^{i0}&\mathrm{e}^{i0}&\mathrm{e}^{i0}&\mathrm{e}^{i0}\\\mathrm{e}^{i0}&\mathrm{e}^{i\pi/2}&\mathrm{e}^{i\pi}&\mathrm{e}^{i3\pi/2}\\\mathrm{e}^{i0}&\mathrm{e}^{i\pi}&\mathrm{e}^{i0}&\mathrm{e}^{i\pi}\\\mathrm{e}^{i0}&\mathrm{e}^{i3\pi/2}&\mathrm{e}^{i\pi}&\mathrm{e}^{i\pi/2}\end{bmatrix}\begin{bmatrix}H(\mathbf k=0) &0&0&0\\0&H(\mathbf k=1) &0&0\\0&0&H(\mathbf k=2)&0 \\0&0&0&H(\mathbf k=-1) \end{bmatrix}\begin{bmatrix}\mathrm{e}^{i0}&\mathrm{e}^{i0}&\mathrm{e}^{i0}&\mathrm{e}^{i0}\\\mathrm{e}^{i0}&\mathrm{e}^{-i\pi/2}&\mathrm{e}^{-i\pi}&\mathrm{e}^{-i3\pi/2}\\\mathrm{e}^{i0}&\mathrm{e}^{-i\pi}&\mathrm{e}^{i0}&\mathrm{e}^{-i\pi}\\\mathrm{e}^{i0}&\mathrm{e}^{-i3\pi/2}&\mathrm{e}^{-i\pi}&\mathrm{e}^{-i\pi/2}\end{bmatrix}
\end{aligned}$$

把矩阵乘回去可以验证$H(\mathbf k)=\sum_{\mathbf R}H(\mathbf R)\mathrm{e}^{i\mathbf k\mathbf R},\ H(\mathbf R)=\displaystyle\frac{1}{N_{k}}\sum_{\mathbf R}H(\mathbf k)\mathrm{e}^{-i\mathbf k\mathbf R}$ ，所以k空间相当于以不同的模式把R空间折叠起来，得到分块对角的哈密有量，这样得到Nk个降低了Nk倍维度的哈密顿矩阵，每一个矩阵的表象变成了$\psi(k)=\displaystyle \frac {1}{\sqrt{N_k}} \sum_{\mathbf R} \psi(R) e^{i\mathbf k \mathbf R}$(对称约定)，或者$\psi(k)=\displaystyle \sum_{\mathbf R}\psi(R) e^{i\mathbf k \mathbf R}$(不对称约定，和H的变换形式一致，但要注意这个约定的变换不么正，表象变换需要套相似变换而不等于合同变换）。下面两个公式说明了为什么H的变换形式不对称
$$\begin{aligned}
\langle\psi(k_{1})|\hat{H}|\psi(k_{2})\rangle & =\sum_{R_{1},R_{2}}\frac{1}{N_{k}}\mathrm{e}^{-ik_{1}R_{1}}\langle\psi(R_{1})|\hat{H}|\psi(R_{2})\rangle\mathrm{e}^{ik_{2}R_{2}} \\
_{R_{2}\leftrightarrow R_{1}+R} &=\sum_{R_{1},R}\frac{1}{N_{k}}\mathrm{e}^{i(k_{2}-k_{1})R_{1}}H(R)\mathrm{e}^{ik_{2}R} \\
&=\sum_{R}H(R)\mathrm{e}^{ik_{2}R}\delta_{k_{1},k_{2}} 
\end{aligned}
$$
$$
\begin{aligned}
\langle\psi(R_{1})|\hat{H}|\psi(R_{2})\rangle & =\sum_{k_{1},k_{2}}\frac{1}{N_{k}}\mathrm{e}^{ik_{1}R_{1}}\:\langle\psi(k_{1})|\hat{H}|\psi(k_{2})\rangle\mathrm{e}^{-ik_{2}R_{2}}  \\
_{R_{2}\leftrightarrow R_{1}+R}& =\sum_{k_{1},k_{2}}\frac{1}{N_{k}}\mathrm{e}^{-ik_{2}R}H(k_{1})\delta_{k_{1},k_{2}}\mathrm{e}^{i(k_{1}-k_{2})R_{1}}  \\
&=\frac{1}{N_{k}}\sum_{k}H(k)\mathrm{e}^{-ikR}
\end{aligned}
$$
另外值得注意的是，实空间的矩阵需要满足$H_{st}(R)=H_{ts}(-R)$（实数情况，对于复数还要多个复共轭），这样才能保证k空间矩阵的厄米性
$$H_{st}(k)=\sum_{R}H_{st}(R)\mathrm{e}^{ikR}=\sum_{R}H_{ts}(-R)\mathrm{e}^{ikR}\xlongequal{R\leftrightarrow -R}\sum_{R} H_{ts}(R)\mathrm{e}^{-ikR}=H_{ts}^{*}(k)$$

## 2. k空间和R空间的公式

采用以下记号

分子轨道记号：电子：ij；空穴：ab

原子轨道记号：stuv

辅助基： $\mu\nu$ 
### 2.1 V（$\mu\nu$ 标记辅助基）

间隔R的原胞之间实辅助基组的库伦积分组成库伦矩阵
$$V_{\mu\nu}^{\mathbf{R}}=\iint\frac{P_{\mu}(\mathbf{r}-\tau_{\mu})P_{\nu}(\mathbf{r}^{\prime}-\mathbf{R}-\tau_{\nu})}{|\mathbf{r}-\mathbf{r}^{\prime}|}\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}$$
现在将辅助基从单中心变成布洛赫波函数
$$P_{\mu}^{k}(\mathbf{r})=\sum_{R}P_{\mu}(\mathbf{r}-\mathbf{R}-\tau_{\mu})\mathrm{e}^{\mathrm{ik}\cdot\mathbf{R}}$$
$$\begin{aligned}
V_{\mu\nu}^{k'k}& =\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{P_{\mu}^{k^{\prime}*}(r)P_{\nu}^{k}(r^{\prime})}{|r-r^{\prime}|}\quad(\text{这个全空间积分是发散的,下面把R限制在BvK}) \\
&=\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{1}{|r-r^{\prime}|}\sum_{RR^{\prime}}P_{\mu}(r-R-\tau_{\mu})P_{\nu}(r^{\prime}-R^{\prime}-\tau_{\nu})\mathrm{e}^{i(kR^{\prime}-k^{\prime}R)} \\
_{R^{\prime}\leftrightarrow R+R''}& =\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{1}{|r-r^{\prime}|}\sum_{RR^{\prime\prime}}P_{\mu}(r-R-\tau_{\mu})P_{\nu}(r^{\prime}-R-R^{\prime\prime}-\tau_{\nu})\mathrm{e}^{i\left[(k-k^{\prime})R + kR''\right]} \\
^{r\leftrightarrow r''+R}_{r'\leftrightarrow r'''+R}& =\iint\mathrm{d}r^{\prime\prime}\mathrm{d}r^{\prime\prime\prime}\frac{1}{\left|r^{\prime\prime}-r^{\prime\prime\prime}\right|}\sum_{R''}P_{\mu}(r^{\prime\prime}-\tau_{\mu})P_{\nu}(r^{\prime\prime\prime}-R^{\prime\prime}-\tau_{\nu})\mathrm{e}^{ikR''}\sum_{R}\mathrm{e}^{i(k-k^{\prime})R} \\
&=\boxed{\sum_{R''}V_{\mu\nu}^{R''}\mathrm{e}^{ikR''}}N_{R}\delta_{k,k'}
\end{aligned}$$
可见只有相同k指标的布洛赫辅助基才有非零的库伦积分，下一节会看到，辅助基的k指标只和展开的一对原子基的布洛赫波矢之差有关，故统一用q标记这一准动量转移，并记作
$$V_{\mu\nu}(\mathbf{q})\equiv\sum_{R}V_{\mu\nu}(\mathbf{R})\mathrm{e}^{i\mathbf{q}\cdot\mathbf{R}}$$
实际计算中，R的范围与库伦积分截断半径（ccp_rmesh_times）有关。

### 2.2 C（st标记原子基）

关于C系数
$$\phi_{s}(r-R_{s}-\boldsymbol{\tau}_{s})\phi_{t}(r-R_{t}-\boldsymbol{\tau}_{t})=\sum_{\mu,R_{\mu}}C_{s(R_{s}),t(R_{t})}^{\mu(R_{\mu})}P_{\mu}(r-R_{\mu}-\boldsymbol{\tau}_{\mu})$$
其具有平移不变性
$$\begin{aligned}
C_{s(R_{s}),t(R_{t})}^{\mu(R_{\mu})}& =\langle\phi_{s}(r-R_{s}-\boldsymbol{\tau}_{s})\phi_{t}(r-R_{t}-\boldsymbol{\tau}_{t})|\hat{V}|P_{\nu}(r-R_{\nu}-\boldsymbol{\tau}_{\nu})\rangle \big[V_{\nu\mu}^{R}\big]^{-1} \\
&=\langle\phi_{s}(r-\tau_{s})\phi_{t}(r-R_{t}+R_{s}-\tau_{t})|\hat{V}|P_{\nu}(r-R_{\nu}+R_{s}-\tau_{\nu})\rangle\left[V_{\nu\mu}^{R}\right]^{-1} \\
&=C_{s(0),t(R_t-R_s)}^{\mu(R_{\mu}-R_{s})}
\end{aligned}$$
和st对换不变性
$$C_{s(R_s),t(R_t)}^{\mu(R_\mu)}=C_{t(R_t),s(R_s)}^{\mu(R_\mu)}$$
采用LocalRI，将辅助基中心$(R_{\mu}+\tau_{\mu})$ 限定在两个原子轨道中心上
$$C_{s(R_{s}),t(R_{t})}^{\mu(\mu\in S/T)}=\langle\phi_{s}(r-R_{s}-\tau_{s})\phi_{t}(r-R_{t}-\tau_{t})|\hat{V}|P_{\nu}(r-R_{\nu}-\tau_{\nu})\rangle\left[V_{\nu\mu}^{\mu\in S/T}\right]^{-1}$$
$$\begin{aligned}
\phi_{s}(r-R_{s}-\tau_{s})\phi_{t}(r-R_{t}-\tau_{t})& =\sum_{\mu\in S}C_{s(R_{s}),t(R_{t})}^{\mu(R_{s})}P_{\mu}(r-R_{s}-\tau_{s})+\sum_{\mu\in T}C_{s(R_{s}),t(R_{t})}^{\mu(R_{t})}P_{\mu}(r-R_{t}-\tau_{t}) \\
&=\sum_{\mu\in S}C_{s(0),t(R_{t}-R_{s})}^{\mu(0)}P_{\mu}(r-R_{s}-\boldsymbol{\tau}_{s})+\sum_{\mu\in T}C_{s(R_{s}-R_{t}),t(0)}^{\mu(0)}P_{\mu}(r-R_{t}-\boldsymbol{\tau}_{t})
\end{aligned}$$
其中$C_{s(R)t(0)}^{\mu(0)}=C_{t(0)s(R)}^{\mu(0)}$ 可以通过交换st指标，使得第一个原子基和辅助基中心再次相等。

现在考虑在布洛赫表象下写出原⼦轨道
$$\phi_{t}^{k}(r)=\sum_{R_{t}}\phi_{t}(r-R_{t}-\boldsymbol{\tau}_{t})\mathrm{e}^{ikR_{t}}$$
它被布洛赫辅助基展开的系数是
$$\begin{aligned}
&\phi_{s}^{k+q^{*}}(r)\phi_{t}^{k}(r) =\sum_{R_{s}R_{t}}\phi_{s}(r-R_{s}-\boldsymbol{\tau}_{s})\phi_{t}(r-R_{t}-\boldsymbol{\tau}_{t})\mathrm{e}^{i[kR_{t}-(k+q)R_{s}]} \\
&=\sum_{R_{s}R_{t}}\sum_{\mu\in S}C_{s(R_{s}),t(R_{t})}^{\mu(R_{s})}e^{i[kR_{t}-(k+q)R_{s}]}P_{\mu}(r-R_{s}-\tau_{s}) + \sum_{R_{s}R_{t}}\sum_{\mu\in T}C_{s(R_{s}),t(R_{t})}^{\mu(R_{t})}e^{i[kR_{t}-(k+q)R_{s}]}P_{\mu}(r-R_{t}-\tau_{t}) \\
&=\sum_{R_{s}R_{t}}\sum_{\mu\in S}C_{s(0),t(R_{t}-R_{s})}^{\mu(0)}\mathrm{e}^{i[kR_{t}-(k+q)R_{s}]}\frac{1}{N_{k}}\sum_{k^{\prime}}P_{\mu}^{k^{\prime}}(r)\mathrm{e}^{-ik^{\prime}R_{s}} + \sum_{R_{s}R_{t}}\sum_{\mu\in T}C_{t(0),s(R_{s}-R_{t})}^{\mu(0)}\mathrm{e}^{i[kR_{t}-(k+q)R_{s}]}\frac{1}{N_{k}}\sum_{k^{\prime}}P_{\mu}^{k^{\prime}}(r)\mathrm{e}^{-ik^{\prime}R_{t}} \\
&=\sum_{R_s R_{t}}\sum_{\mu\in S}C_{s(0),t(R_{t}-R_{s})}^{\mu(0)}\mathrm{e}^{ik(R_{t}-R_{s})}\frac{1}{N_{k}}\sum_{k^{\prime}}P_{\mu}^{k^{\prime}}(r)\mathrm{e}^{-i(q+k^{\prime})R_{s}} +\sum_{R_s R_{t}}\sum_{\mu\in T}C_{s(R_{s}-R_{t}),\beta(0)}^{\mu(0)}\mathrm{e}^{s(k+q)(R_{t}-R_{s})}\frac{1}{N_{k}}\sum_{k^{\prime}}P_{\mu}^{k^{\prime}}(r)\mathrm{e}^{-i(q+k^{\prime})R_{t}} \\
^{\text{第一项}R_t\leftrightarrow R_t^{\prime}+R_s}_{\text{第二项}R_s\leftrightarrow R_s^{\prime}+R_t} &=\sum_{\mu\in S}\boxed{\sum_{R_{t}^{\prime}}C_{s(0),t(R_{t}^{\prime})}^{\mu(0)}e^{ikR_{t}^{\prime}}}\frac{1}{N_{k}}\sum_{R_sk^{\prime}}P_{\mu}^{k^{\prime}}(r)\mathrm{e}^{-i(q+k^{\prime})R_{s}}+\sum_{\mu\in T}\boxed{\sum_{R_{s}^{\prime}}C_{t(0),s(R_{s}^{\prime})}^{\mu(0)}e^{-i(k+q)R_{s}^{\prime}}}\frac{1}{N_{k}}\sum_{R_tk^{\prime}}P_{\mu}^{k^{\prime}}(r)\mathrm{e}^{-i(q+k^{\prime})R_{t}} \\
&=\left[\sum_{\mu\in S}C_{s,t}^{\mu}(k)+\sum_{\mu\in T}C_{t,s}^{\mu}(-k-q) \right]P_{\mu}^{q*}(r)
\end{aligned} \tag{1}$$
其中定义了C的傅里叶变换
$$C_{i,j}^{\mu}(k)\equiv\sum_{R}C_{j(0),i(R)}^{\mu(0)}\mathrm{e}^{ikR}$$
这里R的范围可以超过一个BvK超胞，镜像超胞对应的Bloch相位相同，幅值叠加。

### 2.3 c（abij标记分子轨道）

关于c系数，分子轨道有Bloch表象和Wannier表象

$$\begin{aligned}
\psi_{a}^{k}(r)& =\sum_{s}\phi_{s}^{k}(r)c_{sa}^{k}=\sum_{s}c_{sa}^{k}\sum_{R^{\prime}}\phi_{s}(r-R^{\prime}-\tau_{s})\mathrm{e}^{ikR'}\equiv\sum_{R}\psi_{a}^{R}(r)\mathrm{e}^{ikR} \\
\psi_a^{R}(r)& \equiv\frac{1}{N_{k}}\sum_{k}\psi_{a}^{k}(r)\mathrm{e}^{-ikR}=\frac{1}{N_{k}}\sum_{k}\sum_{s}\boxed{c_{sa}^{k}\mathrm{e}^{-ikR}}\sum_{R^{\prime}}\phi_{s}(r-R^{\prime}-\tau_{s})\boxed{\mathrm{e}^{ikR^{\prime}}} \\
_{R^{\prime}\leftrightarrow R+R''}& =\sum_{s}\sum_{R''}\boxed{\frac{1}{N_{k}}\sum_{k}c_{sa}^{k}\mathrm{e}^{ikR''}} \phi_{s}(r-R-R^{\prime\prime}-\tau_s) \\
&=\sum_{sR''}c_{sa}^{-R''}\phi_{s}(r-R-R''-\tau_{s})=\sum_{sR''}c_{sa}^{R''}\phi_{s}(r-R+R^{\prime\prime}-\tau_{s})\textbf{【}c\text{和}\phi\text{的}R^{\prime\prime}\text{指标卷积求和】}
\end{aligned}$$
其中定义了
$$c_{j,a}^{k}\equiv\sum_{R}c_{j,a}^{R}\mathrm{e}^{ikR},\quad c_{j,a}^{R}=\frac{1}{N_{k}}\sum_{k}c_{j,a}^{k}\mathrm{e}^{-ikR}$$
上面的k指标的分子轨道具有布洛赫波函数的形式，下面的R指标分子轨道具有Wannier波函数的形式，其以R所处的原胞为中心。

Bloch波矢和能量对易，它是一个好量子数，所以分子轨道中只有相同k指标的原子Bloch基做线性组合。Wannier轨道则不具有这一点，所以分子轨道中包含对不同R指标的Wannier基做线性组合。

### 2.4 HF $H_{st}^{exx}$

原子基下exx的哈密顿量
$$\begin{aligned}
H_{st}^{exx}(R) =&\frac{1}{N_{k}}\sum_{ik_{2}}\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{\phi_{s}^{*}(r)\psi_{i}^{k_{2}}(r)\psi_{i}^{k_{2}*}(r^{\prime})\phi_{t}(r^{\prime}-R)}{|r-r^{\prime}|}  \\
=&\frac{1}{N_{k}}\sum_{ik_{2}uv}\sum_{R_{u}R_{v}}\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{\phi_{s}(r)\phi_{u}(r-R_{u})\mathrm{e}^{ik_{2}R_{u}}\phi_{v}(r^{\prime}-R_{v})\mathrm{e}^{-ik_{2}R_{v}}\phi_{t}(r^{\prime}-R)}{|r-r^{\prime}|}c_{ui}^{k_{2}}c_{vi}^{k_{2}*} \\
=&\sum_{uvR_{u}R_{u}}\iint\mathrm{d}r\mathrm{d}r^{\prime}\biggl[\sum_{\mu\in S}C_{s(0)u(R_{u})}^{\mu(0)}P_{\mu}(r-\tau_{s})+\sum_{\mu\in U}C_{u(0)s(-R_{u})}^{\mu(0)}P_{\mu}(r-R_{u}-\tau_{u})\biggr]\frac{1}{|r-r^{\prime}|} \\
&\left[\sum_{\nu\in V}C_{\nu(0)t(R-R_{\nu})}^{\nu(0)}P_{\nu}(r^{\prime}-R_{v}-\tau_{\nu})+\sum_{\nu\in T} C_{t(0)v(R_{\nu}-R)}^{\nu(0)}P_{\nu}(r^{\prime}-R_{t}-\tau_{t})\right]\frac{1}{N_{k}}\sum_{ik_{2}}c_{ui}^{k_{2}}c_{vi}^{k_{2}*}\mathrm{e}^{-ik_{2}(R_{v}-R_{u})} \\
=&\sum_{uvR_{u}R_{v}}\left[\sum_{\mu\in S,\nu\in V}C_{s(0)u(R_{u})}^{\mu(0)}V_{\mu\nu}(R_{v}) C_{v(0)t(R-R_{v})}^{\nu(0)}+\sum_{\mu\in S,\nu\in T}C_{s(0)u(R_{u})}^{\mu(0)}V_{\mu\nu}(R_{t})C_{t(0)v(R_{v}-R)}^{\nu(0)}\right] \\
&+\sum_{\mu\in U,\nu\in V}C_{u(0)s(-R_{u})}^{\mu(0)}V_{\mu\nu}(R_{v}-R_{u})C_{v(0)t(R-R_{v})}^{\nu(0)}+ \sum_{\mu\in U,\nu\in T}C_{u(0)s(-R_{u})}^{\mu(0)}V_{\mu\nu}(R_{t}-R_{v})C_{t(0)v(R_{v}-R)}^{\nu(0)}\biggr]D_{uv}(R_{v}-R_{u})
\end{aligned}$$
Ru和Rv原则上是可以超出BvK的，不过由于最终H(R)要变换到k空间，镜像原胞的Ru和Rv对H(k)的贡献是等价的，所以总可以先将C和V折叠到BvK中，再做张量缩并。另外，C和V在R空间下具有稀疏性，可加速计算。

k空间的Hexx只需要对Hexx(R)做正FT
$$\begin{aligned}
\langle\phi_{s}^{k_{1}}|H^{exx}|\phi_{t}^{k_{1}}\rangle & =\frac{1}{N_{k}^{2}}\sum_{ik_{2}}\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{\phi_{s}^{k_{1}*}(r)\psi_{i}^{k_{2}}(r)\psi_{i}^{k_{2}*}(r^{\prime})\phi_{t}^{k_{1}}(r^{\prime})}{|r-r^{\prime}|} \\
&=\frac{1}{N_{k}^{2}}\sum_{ik_{2}}\sum_{R_sR_{t}}\iint\mathrm{d}r\mathrm{d}r^{\prime}\frac{\phi_{s}^{*}(r-R_{s})\psi_{i}^{k_{2}}(r)\psi_{i}^{k_{2}*}(r^{\prime})\phi_{t}(r^{\prime}-R_{t})}{|r-r^{\prime}|}\mathrm{e}^{ik_{1}(R_{t}-R_{s})} \\
_{R_{t}\leftrightarrow R_{s}+R} & =\sum_{R}H_{st}(R)\mathrm{e}^{i\mathbf{k}_{1}R} 
\end{aligned}$$
### 2.5 RPA:响应函数：$\chi_{\mu\nu}(\mathbf R)$ 和$\chi_{\mu\nu}(\mathbf k)$

本节参考：Shi R, Lin P, Zhang M Y, et aL. PRB, 2024, 109(3):035103
一般的做法是将响应函数在k空间辅助基展开
$$\begin{aligned}
\chi^{0}(\mathbf{r},\mathbf{r}^{\prime},i\omega) =& \sum_{kq}\sum_{i,j\neq i}(f_{i}^k-f_j^{k+q}) \frac{\psi^{k*}_i(\mathbf r)\psi_j^{k+q}(\mathbf r)\psi_j^{k+q*}(\mathbf r')\psi_i^{k}(\mathbf r')}{\varepsilon_{ik}-\varepsilon_{j,k+q}-i\omega}\\
=&\sum_{\mu\nu q}\frac{1}{N_{q}}P_{\mu}^{q}(\mathbf{r})\chi_{\mu\nu}^{0}(\mathbf{q},i\omega)P_{\nu}^{q*}(\mathbf{r}^{\prime})
\end{aligned}
$$
代入式(1)可得q空间的响应函数
$$
\chi_{\mu\nu}^0(\mathbf q,i\omega) = \sum_{ij \mathbf k} \frac{(f^\mathbf k_i-f^\mathbf{k+q}_j)}{\varepsilon_{i\mathbf k}-\varepsilon_{j,\mathbf{k+q}}-i\omega}\left\{ \sum_{st}c^{\mathbf k*}_{si} c^\mathbf{k+q}_{tj} [C^\mu_{st}(\mathbf{k+q})+C^\mu_{ts}(-\mathbf k)] \sum_{uv}\left[ C^\nu_{uv}(\mathbf k)+C^{\nu}_{vu}(\mathbf {-k-q}) \right]c^\mathbf{k+q *}_{uj}c^\mathbf k_{vi}\right\}
$$
另一方面
$$
\begin{aligned}
\chi^{0}(\mathbf{r},\mathbf{r}^{\prime},i\omega)=&\sum_{\mu\nu\mathbf{R}_{\mu},\mathbf{R}_{\nu}}P_{\mu}(\mathbf{r}-\mathbf{R}_{\mu}-\tau_{\mu})P_{\nu}(\mathbf{r}^{\prime}-\mathbf{R}_{\nu}-\tau_{\nu})\boxed{\sum_{q}\frac{1}{N_{q}}\chi_{\mu\nu}^{0}(\mathbf{q},i\omega)\exp[-iq(\mathbf{R}_{\nu}-\mathbf{R}_{\mu})]}\\
=&\sum_{\mu\nu\mathbf{R}_{\mu},\mathbf{R}_{\nu}}P_{\mu}(\mathbf{r}-\mathbf{R}_{\mu}-\mathbf{\tau}_{\mu})P_{\nu}(\mathbf{r}^{\prime}-\mathbf{R}_{\nu}-\mathbf{\tau}_{\nu})\chi_{\mu\nu}^{0}(\mathbf{R}_{\nu}-\mathbf{R}_{\mu},i\omega) \\
\end{aligned}$$
它与格林函数的关系是（这里同时换到时域上）
$$
\begin{aligned}
\chi^{0}(\mathbf{r},\mathbf{r}^{\prime},i\tau) =& -i \sum_{\sigma} G^0_{\sigma}(\mathbf r, \mathbf r',i\tau)G^0_{\sigma}(\mathbf r',\mathbf r,-i\tau)\\
=& -i\sum_{\begin{aligned}\sigma st\mathbf{R}_{s}\mathbf{R}_{t}\\uv\mathbf{R}_{u}\mathbf{R}_{v} \end{aligned}}\phi_s(r-R_s-\tau_s)\phi_u(r-R_u-\tau_u) G^0_{\sigma, st} (R_t-R_s,i\tau) G^0_{\sigma,vu}(R_u-R_v,-i\tau)\phi_t(r'-R_t-\tau_t)\phi_v(r'-R_v-\tau_v) \\
=& -i\sum_{\begin{aligned}\sigma st\mathbf{R}_{s}\mathbf{R}_{t}\\uv\mathbf{R}_{u}\mathbf{R}_{v} \end{aligned}} \sum_{\mu\nu}\Big[C^\mu_{su}(R_u-R_s)P_\mu(r-R_s-\tau_s)+C^\mu_{us}(R_s-R_u)P_\mu(r-R_u-\tau_u)\Big] G^0_{\sigma, st} (R_t-R_s,i\tau)\\
&\quad \quad \quad \quad \quad \quad G^0_{\sigma,vu}(R_u-R_v,-i\tau) \Big[C^\nu_{tv}(R_v-R_t)P_\nu(r'-R_t-\tau_t)+C^\nu_{vt}(R_t-R_v)P_\nu(r'-R_v-\tau_v)\Big]
\end{aligned}
$$
由此可得R空间的响应函数
$$
\begin{aligned}
\chi^0_{\mu\nu}(R_\nu-R_\mu,i\tau)=-i\sum_{\sigma stuv\mathbf{R}_{1}\mathbf{R}_{2}} 
& C^\mu_{su}(R_1-R_\mu)G^0_{\sigma,st}(R_\nu-R_\mu,i\tau)G^0_{\sigma,vu}(R_1-R_2,-i\tau)C^\nu_{tv}(R_2-R_\nu) \\
+& C^\mu_{su}(R_1-R_\mu)G^0_{\sigma,st}(R_2-R_\mu,i\tau)G^0_{\sigma,vu}(R_1-R_\nu,-i\tau)C^\nu_{vt}(R_2-R_\nu)\\
+& C^\mu_{us}(R_1-R_\mu)G^0_{\sigma,st}(R_\nu-R_1,i\tau)G^0_{\sigma,vu}(R_\mu-R_2,-i\tau)C^\nu_{tv}(R_2-R_\nu)\\
+& C^\mu_{us}(R_1-R_\mu)G^0_{\sigma,st}(R_2-R_1,i\tau)G^0_{\sigma,vu}(R_\mu-R_\nu,-i\tau)C^\nu_{vt}(R_2-R_\nu)
\end{aligned}
$$
利用平移对称性，并交换一些哑指标，得到
$$\begin{aligned}
\chi_{\mu\nu}^{0}(R,i\tau)=-i\sum_{\sigma suR_{1}}C_{su}^{\mu}(R_{1})\Bigg[&\sum_{t}G_{\sigma,st}^{0}(R,i\tau)&& \sum_{vR_{2}}C_{tv}^{\nu}(R_{2}-R)G_{\sigma,vu}^{0}(R_{1}-R_{2},-i\tau) \\
_{(v\leftrightarrow t)}\ +&\sum_{t}G_{\sigma,tu}^{0}(R_{1}-R,-i\tau)&& \sum_{vR_{2}}C_{tv}^{\nu}(R_{2}-R)G_{\sigma,sv}^{0}(R_{2},i\tau) \\
_{(s\leftrightarrow u)}\ +&\sum_{t}G_{\sigma,tu}^{0*}(R_{1}-R,-i\tau)&& \sum_{vR_{2}}C_{tv}^{\nu}(R_{2}-R)G_{\sigma,sv}^{0*}(R_{2},i\tau) \\
^{(s\leftrightarrow u)}_{(v\leftrightarrow t)}\ +&\sum_{t}G_{\sigma,st}^{0*}(R,i\tau)&& \sum_{vR_{2}}C_{tv}^{\nu}(R_{2}-R)G_{\sigma,vu}^{0*}(R_{1}-R_{2},-i\tau)\Biggr] 
\end{aligned}$$
注意到$\chi(R)$最终要变换到$\chi(k)$来求RPA关联能，而镜像原胞的$\chi(R)$在FT时贡献到相同的相位，所以尽管C不具有周期性，但它可以事先折叠到BvK中。G(R)是从k空间反FT得到的，自身具有周期性
$$G_{\sigma}^{0}(\mathbf{r},\mathbf{r}',i\omega)=\sum_{i\mathbf{k}}\frac{1}{N_{\mathbf{k}}}\frac{\psi_{i\sigma}^{\mathbf{k}}(\mathbf{r})\psi_{i\sigma}^{\mathbf{k}*}(\mathbf{r}')}{i\omega+\mu-\epsilon_{i}^{\mathbf{k}}+i\eta\operatorname{sign}(\epsilon_{i\sigma}^{\mathbf{k}}-\mu)}=\sum_{stR_{s}R_{t}}\phi_{s}(r-R_{s}-\tau_{s})G_{\sigma,st}^{0}(R_{t}-R_{s})\phi_{t}(r'-R_{t}-\tau_{t})$$
$$G_{\sigma,st}^{0}(\mathbf R,i\omega)=\sum_{i\mathbf{k}}\frac{1}{N_{\mathbf{k}}}\frac{c_{si\sigma}^{\mathbf{k}}c_{ti\sigma}^{\mathbf{k}*}\mathrm{e}^{-i\mathbf{k}\mathbf R}}{i\omega+\mu-\epsilon_{i}^{\mathbf{k}}+i\eta\operatorname{sign}(\epsilon_{i\sigma}^{\mathbf{k}}-\mu)}$$
$$G_{\sigma,st}^{0}(R,i\tau)=i\sum_{i\mathbf{k}}\frac{1}{N_{\mathbf{k}}}c_{si\sigma}^{\mathbf{k}}c_{ti\sigma}^{\mathbf{k}*}\mathrm{e}^{-i\mathbf{k}R}\mathrm{e}^{-(c_{t\sigma}^{k}-\mu)\tau}\left[\theta(\tau)(1-f_{ik\sigma})-\theta(-\tau)f_{ik\sigma}\right]$$

### 2.6 BSE

V矩阵（exchange term，电子和空穴交换坐标）
第aik1行第bjk2列是
$$\begin{aligned}
(a^{*}\mathbf{k}_{1},i\mathbf{k}_{1}|V|j^{*}\mathbf{k}_{2},b\mathbf{k}_{2}) =&\frac{1}{N_{k}^{2}}\iint\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}\psi_{a\mathrm{k}_{1}}^{*}(\mathbf{r})\psi_{i\mathbf{k}_{1}}(\mathbf{r})V(\mathbf{r},\mathbf{r}^{\prime})\psi_{j\mathbf{k}_{2}}^{*}(\mathbf{r}^{\prime})\psi_{b\mathbf{k}_{2}}(\mathbf{r}^{\prime})  \\
=&\frac{1}{N_{k}^{2}}\iint\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}\sum_{stuv}c_{ua}^{k_{1}*}c_{si}^{k_{1}}c_{tj}^{k_{2}*}c_{vb}^{k_{2}}\sum_{\mathbf{R}_{s}\mathbf{R}_{t}\mathbf{R}_{u}\mathbf{R}_{v}}\exp[i\mathbf{k}_{1}(\mathbf{R}_{s}-\mathbf{R}_{u})-i\mathbf{k}_{2}(\mathbf{R}_{t}-\mathbf{R}_{v})] \\
&\phi_s(\mathbf{r}-\mathbf{R}_s-\tau_s)\phi_u(\mathbf{r}-\mathbf{R}_u-\tau_u) V(\mathbf{r},\mathbf{r}')\phi_t(\mathbf{r}^{\prime}-\mathbf{R}_t-\tau_t)\phi_v(\mathbf{r}^{\prime}-\mathbf{R}_v-\tau_v)\\
\text{代入式}(1)=& \frac{1}{N_{k}^{2}}\iint\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}\sum_{stuv}c_{uv}^{k_{1}*}c_{si}^{k_{2}}c_{tj}^{k_{2}*}c_{ub}^{k_{2}}\biggl[\sum_{\mu\in S}C_{s,u}^{\mu}(-\mathbf{k}_{1})P_{\mu}^{(q-0)}(\mathbf{r})+\sum_{\mu\in U}C_{u,s}^{\mu}(\mathbf{k}_{1})P_{\mu}^{(q-0)}(\mathbf{r})\biggr]  \\
&V(\mathbf{r},\mathbf{r}^{\prime})\left[\sum_{\mu\in T}C_{t,v}^{\mu}(\mathbf{k}_{2})P_{\mu}^{(q=0)}(\mathbf{r}^{\prime})+\sum_{\mu\in V}C_{v,t}^{\mu}(-\mathbf{k}_{2})P_{\mu}^{(q=0)}(\mathbf{r}^{\prime})\right]
\end{aligned}$$
互换行列指标后，$i\leftrightarrow j,a\leftrightarrow b,k_1\leftrightarrow k_2$ ，对第二个式子做这样的替换可以快速得到
$$(b^*\mathbf{k}_2,j\mathbf{k}_1|V|i\mathbf{k}_1,a\mathbf{k}_1)=\left[(a^*\mathbf{k}_1,i\mathbf{k}_1|V|j^*\mathbf{k}_2,b\mathbf{k}_2)\right]^*$$

W矩阵(direct term，电子同坐标，空穴同坐标)
第aik1行第bjk2列是
$$\begin{aligned}
(j^{*}\mathbf{k}_{2},i\mathbf{k}_{1}|W|a^{*}\mathbf{k}_{1},b\mathbf{k}_{2})=& \frac{1}{N_{k}^{2}}\iint\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}\psi_{j\mathbf{k}_{2}}^{*}(\mathbf{r})\psi_{i\mathbf{k}_{1}}(\mathbf{r})W(\mathbf{r},\mathbf{r}^{\prime})\psi_{a\mathbf{k}_{1}}^{*}(\mathbf{r}^{\prime})\psi_{b\mathbf{k}_{2}}(\mathbf{r}^{\prime}) \\
=&\frac{1}{N_{k}^{2}}\iint\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}\sum_{stav}c_{tj}^{k_{2}*}c_{si}^{k_{1}}c_{ua}^{k_{1}*}c_{vb}^{k_{2}}\sum_{\mathbf{R},\mathbf{R},\mathbf{R}_{v}}\exp[i\mathbf{k}_{1}(\mathbf{R}_{s}-\mathbf{R}_{u})-i\mathbf{k}_{2}(\mathbf{R}_{t}-\mathbf{R}_{v})]\\
&\phi_s(\mathbf{r}-\mathbf{R}_s-\tau_s)\phi_t(\mathbf{r}-\mathbf{R}_t-\tau_t)W(\mathbf{r},\mathbf{r}^{\prime})\phi_u(\mathbf{r}^{\prime}-\mathbf{R}_u-\tau_u)\phi_v(\mathbf{r}^{\prime}-\mathbf{R}_v-\tau_v)\\
\text{代入式}(1) = &\frac{1}{N_{k}^{2}}\iint\mathrm{d}\mathbf{r}\mathrm{d}\mathbf{r}^{\prime}\sum_{stav}c_{tj}^{k_{2}*}c_{si}^{k_{1}}c_{ua}^{k_{1}*}c_{vb}^{k_{2}}\left[\sum_{\mu\in S}C_{s,t}^{\mu}(-\mathbf{k}_{2})P_{\mu}^{(\mathbf{k}_{1}-\mathbf{k}_{2})}(\mathbf{r})+\sum_{\mu\in T}C_{t,s}^{\mu}(\mathbf{k}_{1})P_{\mu}^{(\mathbf{k}_{1}-\mathbf{k}_{2})}(\mathbf{r})\right] \\
&W(\mathbf{r},\mathbf{r}^{\prime})\left[\sum_{\mu\in U}C_{u,v}^{\mu}(\mathbf{k}_{2})P_{\mu}^{(\mathbf{k}_{2}-\mathbf{k}_{1})}(\mathbf{r})+\sum_{\mu\in V}C_{v,u}^{\mu}(-\mathbf{k}_{1})P_{\mu}^{(\mathbf{k}_{2}-\mathbf{k}_{1})}(\mathbf{r})\right]
\end{aligned}$$
互换行列指标后，$i\leftrightarrow j,a\leftrightarrow b,k_1\leftrightarrow k_2$ ，对第二个式子做这样的替换可以快速得到
$$(i^*\mathbf{k}_1,j\mathbf{k}_2|W|b^*\mathbf{k}_2,a\mathbf{k}_1)=[(j^*\mathbf{k}_2,i\mathbf{k}_1|W|a^*\mathbf{k}_1,b\mathbf{k}_2)]^*$$
这时V，W，c和C都在k空间上，不具有稀疏性。预期在R空间中可以利用稀疏性进行筛选来加速计算。

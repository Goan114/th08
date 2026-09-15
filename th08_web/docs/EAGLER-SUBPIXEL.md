# Eagler 子像素绘制修复（2026-09-15）

## 修复范围

共用 2D 精灵顶点保留小数位置：覆盖通过 ANM 绘制的自机、敌机、子弹、道具、特效和移动 UI。只取消绘制阶段的整数吸附，保留原有半像素偏移、深度、旋转路径及顶点提交顺序。TH10 还取消跟随自机的信仰条位置取整。

这不是高刷新率帧插值或模拟调度修改；没有修改逻辑坐标、碰撞、RNG、输入、录像或固定步长。真正由资源加载、GPU 或主线程阻塞引起的掉帧不是本补丁的修复声明。

## 回归证据

- TH10：579 个实际 C++ renderer 用例通过。
- TH08：769 个实际 C++ renderer 用例通过。
- 覆盖连续 1/8 像素移动、各锚点、正负缩放、尺寸和深度保持、旋转/非像素模式、重复绘制与 VM 字节不变。
- 使用修复前的 AnmRenderer 编译对象运行同一测试，两作均在小数坐标断言失败；新对象通过。
- 两作完整 SDL3/WebAssembly 构建通过。
- Windows Edge 无头浏览器（SwiftShader），标题进入第一关、射击和移动通过，无页面异常或游戏错误；采样约 60 FPS。
- 浏览器采用本地原 Portable 私有资源站点，仅替换本分支运行时。不是 eagler-touhou 新适配验收、手机实机验收或公开部署验收。

## 复跑

先设置 EMSDK，必要时设置 EM_CONFIG 指向现有 SDK 配置，然后运行：

```powershell
node portable/build.mjs # TH08 添加 --th08
node portable/check-subpixel.mjs # TH08 添加 --th08
```

浏览器测试设置：

- TH_GAME：th10 或 th08。
- TH_TEST_SITE：本地 Portable 完整 site 目录（包含私有 DATA、字体和音乐）。
- TH_PLAYWRIGHT：已安装的 playwright/index.mjs 绝对路径。
- TH_BROWSER：可选的 Edge/Chromium 可执行文件路径。

运行 `node portable/check-subpixel-browser.mjs`。本地报告和截图保存在对应游戏的 `artifacts/subpixel/`；这些资源和产物不进入 Git。

可用 TH_RENDERER_OBJECT 指向旧版 AnmRenderer 编译对象重现回归测试失败。正常测试请取消该变量。


# 永夜抄 3.4.0 / 风神录 3.5.1 完整开发源码

本包同时包含两款的 C++ 源码、共享 SDL3/WebGL2 平台、网页启动器与触控、原版对照工具、测试输入和验证记录，以及当前可玩网页版本。两款共享根目录 portable 和 tools，请保持目录结构完整。

## 直接游玩

- 永夜抄：运行 th08_web/启动永夜抄网页版.cmd，打开 http://127.0.0.1:8088。
- 风神录：运行 th10_web/启动风神录网页版.cmd，打开 http://127.0.0.1:8090。
- 游戏目录内 artifacts/sdl-release/site 是可部署的网站目录；玩家存档保存在各自浏览器。

## 继续开发

Windows x64 下已附带 Node、Emscripten、WASI SDK、TypeScript 和 npm 依赖。另需 Python 3.10 或更新版本，命令 python 应可用，也可设置 TH_PYTHON 为其可执行文件路径。解压到较短目录（例如 D:/TouhouDev）后先运行 准备开发环境.cmd，它会按当前目录生成 SDK 配置。

运行 重建两个游戏.cmd 可从源码重建两款并更新各自 artifacts/sdl-release。构建命令及对应原版测试见 handoff/BUILD-AND-TEST.md。浏览器测试使用 Playwright，需本机安装其 Chromium，或通过 PLAYWRIGHT_CHROMIUM_EXECUTABLE 指定浏览器路径。

- th08_web/cpp、th10_web/cpp：游戏与平台 C++ 源码。
- portable：共享渲染、输入、数值、构建、打包及回归测试。
- 两款的 scripts、tests、runtime/reference：原程序对照工具与测试支撑；保留了 machine.mjs、browser-world-oracle.test.mjs 等源码。
- artifacts/cpp/oracle、artifacts/cpp/campaign、artifacts/decomp 等：开发验证输入和原版对照记录。
- 各自 docs 与 handoff：架构、验证结果、原发布构建信息和交付清单。

交付源码在独立目录重新构建并执行原版对照与浏览器启动测试。handoff/verification.json 记录实际结果；handoff/files.sha256.json 提供逐文件校验。历史测试报告仍标明原测试版本，不表示每次改动都重新覆盖所有游戏路线或实体手机。

公开部署只使用 site。隧道账号、令牌及本机服务进程记录不属于本交付包。游戏原始资源和字体保留各自权利；第三方许可在对应 reference、licenses 和源码头中。

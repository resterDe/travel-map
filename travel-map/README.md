# 🗺️ Travel-Map

> 🚗 一款基于 Electron + Vue 3 的本地旅行地图相册桌面应用

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/resterDe/travel-map.svg)](https://github.com/resterDe/travel-map/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/resterDe/travel-map.svg)](https://github.com/resterDe/travel-map/issues)

![Travel-Map 界面预览](https://img-blog.csdnimg.cn/placeholder_map_main.png)

## 📖 项目简介

Travel-Map 是一款**本地优先**的旅行照片管理桌面应用，通过直观的地图界面管理你的旅行回忆。

**核心理念**：零云依赖，本地存储，保护隐私。

### ✨ 功能特性

- 🗺️ **地图可视化**：在中国地图上展示你去过的城市
- 📁 **目录管理**：按地级市自动分类照片
- ✈️ **轨迹动画**：支持飞机/高铁/箭头动画效果
- 🌐 **海外支持**：支持全球 50+ 城市
- 🎬 **轮播展示**：照片和视频轮播播放
- 🎵 **BGM 功能**：背景音乐播放

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 桌面端 | Electron 28 |
| 前端框架 | Vue 3 + TypeScript |
| 状态管理 | Pinia |
| 样式框架 | Tailwind CSS |
| 地图引擎 | Leaflet |
| 数据库 | SQLite (sql.js) |
| 构建工具 | Vite + electron-builder |

## 📥 安装

### 方式一：下载安装包

前往 [Releases](https://github.com/resterDe/travel-map/releases) 下载最新版本的安装包：

- Windows: `Travel-Map-1.0.0-Setup.exe`

### 方式二：源码运行

```bash
# 克隆项目
git clone https://github.com/resterDe/travel-map.git
cd travel-map

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建安装包
npm run electron:build
```

## 📂 数据目录结构

```
D:\travel-map-resource\
├── 湛江市/
│   ├── 雷州一日游_2024-03-15/
│   │   ├── IMG_001.jpg
│   │   └── VIDEO_001.mp4
│   └── 东海岛_2024-07-20/
│       └── ...
├── 广州市/
│   └── ...
└── 南昌市/
    └── 测试_2026-03-16/
        └── ...
```

## 🎨 使用指南

### 1. 创建旅行目录

1. 在地图上点击目标城市
2. 填写出发地点（支持搜索全国及海外城市）
3. 填写目录备注和旅行日期
4. 点击创建，自动生成目录结构

### 2. 查看轨迹

创建多个行程后，地图会自动绘制从出发地到目的地的轨迹动画。

### 3. 动画设置

在地图页面顶部可以设置：
- 动画类型：无动画 / 箭头 / 飞机 / 高铁
- 动画数量：1个 / 2个 / 3个 / 5个
- 线条样式：实线 / 虚线 / 点线

## 📱 界面预览

| 地图主页 | 城市相册 | 轨迹动画 |
|----------|----------|----------|
| ![](https://img-blog.csdnimg.cn/placeholder_map.png) | ![](https://img-blog.csdnimg.cn/placeholder_gallery.png) | ![](https://img-blog.csdnimg.cn/placeholder_travel_lines.png) |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🙏 感谢

- [cn-atlas](https://github.com/barbarossawang/cn-atlas) - 中国地级市边界数据
- [Leaflet](https://leafletjs.com/) - 开源地图库
- [高德地图](https://www.amap.com/) - 地图瓦片服务

---

<div align="center">
  <p>如果这个项目对你有帮助，请给个 ⭐️ 支持！</p>
  <p>Made with ❤️ by Travel-Map Team</p>
</div>
# Maroesl 的个人网站

以扑克牌为主题的个人网站：首页有可拖动旋转的黑桃 A，作品区有四种花色的牌组和可翻转的作品卡；另有可探索的 3D Room。

## 扑克牌预览

![黑桃 A 正面与 Maroesl 牌背预览](portfolio/dist/images/poker-preview.svg)

上图是 GitHub 可直接显示的静态预览。网页中的扑克牌可以拖动旋转；作品卡可以点击翻面。

## 本地打开网站

在仓库根目录运行：

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory portfolio/dist
```

打开 [首页](http://127.0.0.1:4173/) 查看交互扑克牌，或打开 [Room](http://127.0.0.1:4173/room.html) 探索房间。网站文件位于 [`portfolio/dist/`](portfolio/dist/)，更多说明见 [`portfolio/README.md`](portfolio/README.md)。

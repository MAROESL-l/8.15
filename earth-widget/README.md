# 可移植地球组件

`earth.js` 负责初始化地球并让它自动旋转，不再创建地点标记或弹窗。`locations.js` 保留原有地点数据供以后使用，当前页面不会加载它。

此文件夹尚缺少第三方运行文件 `miniature.earth.js`。把你已有的该文件放入此目录后，可通过静态服务器打开 `demo.html` 预览。

## 放进其他网站

```html
<div id="my-earth" style="width:min(500px,90vw);aspect-ratio:1"></div>

<script src="/earth-widget/miniature.earth.js"></script>
<script src="/earth-widget/earth.js"></script>
<script>createEarth('#my-earth');</script>
```

可通过第二个参数调整地球配置，例如：

```js
createEarth('#my-earth', {
  earth: { autoRotateSpeed: 1, mapLandColor: '#383838' }
});
```

`createEarth` 返回 Miniature Earth 实例。第三方脚本的授权条款请以你的原始文件为准。

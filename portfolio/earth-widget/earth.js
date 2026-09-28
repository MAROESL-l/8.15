(function (global) {
  'use strict';

  // element 可以是 DOM 节点或选择器。Earth 会自行创建 canvas。
  function createEarth(element, options) {
    var target = typeof element === 'string' ? document.querySelector(element) : element;
    if (!target) throw new Error('找不到地球容器');
    if (typeof global.Earth !== 'function') throw new Error('请先加载 miniature.earth.js');

    options = options || {};
    target.classList.add('earth-widget');

    var earth = new global.Earth(target, Object.assign({
      location: { lat: 18, lng: 50 },
      zoom: 1.05,
      light: 'none',
      transparent: true,
      mapSeaColor: 'RGBA(255,255,255,0.76)',
      mapLandColor: '#383838',
      mapBorderColor: '#5D5D5D',
      mapBorderWidth: 0.25,
      mapHitTest: false,
      autoRotate: true,
      autoRotateSpeed: 0.7,
      autoRotateDelay: 6000
    }, options.earth || {}));

    earth.addEventListener('ready', function () {
      earth.startAutoRotate();
    });
    return earth;
  }

  global.createEarth = createEarth;
})(window);

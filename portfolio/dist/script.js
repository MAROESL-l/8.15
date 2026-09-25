const projects = [
  { title: '留白笔记', body: '从舒适的阅读排版出发，让记录回归简单。探索笔记分类、灵感收集与沉浸式写作，将零散的想法整理成自己的知识空间。', type: '产品设计 / Web 开发' },
  { title: 'FORM 视觉实验', body: '用大胆的字体与鲜明的色彩建立视觉识别。围绕形状、留白和秩序，探索品牌在不同媒介中的表达方式。', type: '视觉设计 / 品牌探索' },
  { title: '日常仪表盘', body: '围绕专注时间与任务进展组织信息，把抽象数字转化为直观的反馈。在清晰的信息层级中，找到属于自己的日常节奏。', type: '交互设计 / 数据可视化' },
  { title: '未完待续', body: '为还在生长的想法留一个位置。记录小工具、创意编程与学习过程中意外的发现，让每一次尝试成为下一件作品的起点。', type: '个人探索 / 创意编程' }
];
const suits = ['♠', '♥', '♣', '♦'];
const ranks = ['A', 'K', 'Q', 'J'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-project]').forEach((button, index) => {
  const project = projects[index];
  const original = button.innerHTML;
  button.classList.add('poker-card');
  button.style.setProperty('--rest-angle', `${[-5, -2, 2, 5][index]}deg`);
  if (index % 2) button.classList.add('red-suit');
  const corner = `<span class="card-corner" aria-hidden="true">${ranks[index]}<span>${suits[index]}</span></span>`;
  button.innerHTML = `<span class="card-tilt"><span class="card-flipper"><span class="card-face card-front">${corner}<span class="card-content">${original}</span><span class="card-bottom" aria-hidden="true">${suits[index]} ${ranks[index]}</span><span class="flip-hint">点击翻牌 ↻</span></span><span class="card-face card-back" aria-hidden="true">${corner}<span class="back-content"><span class="back-label">作品手记 / ${String(index + 1).padStart(2, '0')}</span><strong>${project.title}</strong><span class="back-description">${project.body}</span><span class="back-type">${project.type}</span><span class="back-sample">示例作品 · 待替换为真实内容</span></span><span class="flip-hint">再次点击，回到正面 ↻</span></span></span></span>`;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', `翻牌查看${project.title}的介绍`);
  button.addEventListener('click', () => {
    const flipped = button.classList.toggle('is-flipped');
    button.setAttribute('aria-pressed', String(flipped));
    button.setAttribute('aria-label', flipped ? `${project.title}：${project.body} 再次点击返回正面` : `翻牌查看${project.title}的介绍`);
    button.querySelector('.card-front').setAttribute('aria-hidden', String(flipped));
    button.querySelector('.card-back').setAttribute('aria-hidden', String(!flipped));
  });
  button.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    const rect = button.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    button.style.setProperty('--rx', `${(0.5 - y) * 15}deg`);
    button.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
    button.style.setProperty('--shine-x', `${x * 100}%`);
    button.style.setProperty('--shine-y', `${y * 100}%`);
  });
  button.addEventListener('pointerleave', () => {
    button.style.setProperty('--rx', '0deg');
    button.style.setProperty('--ry', '0deg');
  });
});
document.querySelector('#detail')?.remove();
document.querySelector('#year').textContent = new Date().getFullYear();

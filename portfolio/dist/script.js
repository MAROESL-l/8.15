const projects = [
  {
    "title": "柒品家具",
    "body": "家具主题的静态网页作品。通过页面布局、图片展示与文字层级，呈现家居产品的视觉风格。",
    "type": "HTML / CSS"
  },
  {
    "title": "拼图",
    "body": "用 JavaScript 实现的拼图小游戏。在移动与组合之间寻找正确的位置，让网页交互变成一场轻松的挑战。",
    "type": "JavaScript / 游戏"
  },
  {
    "title": "茄子音乐",
    "body": "基于 Vue 2 的音乐主题应用。围绕音乐内容组织页面，探索组件化开发与音乐场景下的交互体验。",
    "type": "Vue 2 / 音乐应用"
  },
  {
    "title": "猫眼电影",
    "body": "基于 Vue 3 的电影主题应用。以电影内容展示为出发点，探索信息布局与组件化界面的实现。",
    "type": "Vue 3 / 电影应用"
  }
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
  button.innerHTML = `<span class="card-tilt"><span class="card-flipper"><span class="card-face card-front">${corner}<span class="card-content">${original}</span><span class="card-bottom" aria-hidden="true">${suits[index]} ${ranks[index]}</span><span class="flip-hint">点击翻牌 ↻</span></span><span class="card-face card-back" aria-hidden="true">${corner}<span class="back-content"><span class="back-label">作品手记 / ${String(index + 1).padStart(2, '0')}</span><strong>${project.title}</strong><span class="back-description">${project.body}</span><span class="back-type">${project.type}</span><span class="back-sample">Maroesl / 前端作品</span></span><span class="flip-hint">再次点击，回到正面 ↻</span></span></span></span>`;
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

// Pointer capture keeps a drag continuous even outside the card's bounds.
const pokerStage = document.querySelector('#poker-stage');
const pokerObject = document.querySelector('#poker-object');
let pitch = -12;
let yaw = -28;
let drag = null;
function renderPoker() {
  pokerObject.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg)`;
}
pokerStage.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY, pitch, yaw};
  pokerStage.setPointerCapture(event.pointerId);
  pokerStage.classList.add('is-dragging');
  pokerStage.focus({preventScroll: true});
});
pokerStage.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  yaw = drag.yaw + (event.clientX - drag.x) * .7;
  pitch = drag.pitch - (event.clientY - drag.y) * .7;
  renderPoker();
});
function endPokerDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  pokerStage.classList.remove('is-dragging');
  if (pokerStage.hasPointerCapture(event.pointerId)) pokerStage.releasePointerCapture(event.pointerId);
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => pokerStage.addEventListener(type, endPokerDrag));
pokerStage.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Home') {
    pitch = -12;
    yaw = -28;
    renderPoker();
    return;
  }
  const step = event.shiftKey ? 30 : 10;
  if (event.key === 'ArrowLeft') yaw -= step;
  if (event.key === 'ArrowRight') yaw += step;
  if (event.key === 'ArrowUp') pitch += step;
  if (event.key === 'ArrowDown') pitch -= step;
  renderPoker();
});
renderPoker();

// One full turn every 20 seconds. Resume from the user's chosen angle.
let lastRotationTime = null;
let rotationFrame = null;
function rotatePoker(time) {
  const elapsed = lastRotationTime === null ? 0 : Math.min(time - lastRotationTime, 64);
  lastRotationTime = time;
  if (!drag) {
    yaw = (yaw + elapsed * .018) % 360;
    renderPoker();
  }
  rotationFrame = requestAnimationFrame(rotatePoker);
}
function syncPokerRotation() {
  if (rotationFrame !== null) cancelAnimationFrame(rotationFrame);
  rotationFrame = null;
  lastRotationTime = null;
  const active = !document.hidden && !reducedMotion.matches;
  pokerStage.classList.toggle('is-auto-rotating', active);
  if (active) rotationFrame = requestAnimationFrame(rotatePoker);
}
document.addEventListener('visibilitychange', syncPokerRotation);
reducedMotion.addEventListener('change', syncPokerRotation);
syncPokerRotation();


const suitCollections = document.querySelector('#suit-collections');
const projectDialog = document.querySelector('#project-dialog');
const collectionRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suitNames = ['黑桃', '红桃', '梅花', '方块'];
let lastProjectTrigger = null;
suits.forEach((suit, suitIndex) => {
  const group = document.createElement('section');
  group.className = `suit-group${suitIndex % 2 ? ' red-group' : ''}`;
  group.innerHTML = `<button class="suit-toggle" type="button" aria-expanded="false" aria-controls="suit-fan-${suitIndex}"><span class="suit-symbol">${suit}</span><span>${suitNames[suitIndex]}<small>A — K / 13 张</small></span></button><div class="fan-scroll"><div class="suit-fan" id="suit-fan-${suitIndex}" aria-label="${suitNames[suitIndex]}牌组"></div></div>`;
  const toggle = group.querySelector('.suit-toggle');
  const fan = group.querySelector('.suit-fan');
  let pinned = false;
  let hovered = false;
  function expand(open) {
    group.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  collectionRanks.forEach((rank, rankIndex) => {
    const card = document.createElement(rankIndex === 0 ? 'button' : 'div');
    card.className = `fan-card${rankIndex === 0 ? ' is-project' : ''}`;
    card.style.setProperty('--i', rankIndex);
    card.style.setProperty('--fan-angle', `${(rankIndex - 6) * 6}deg`);
    card.style.setProperty('--fan-x', `${(rankIndex - 6) * 22}px`);
    card.style.setProperty('--fan-y', `${Math.abs(rankIndex - 6) ** 2 * 1.25}px`);
    card.style.zIndex = String(rankIndex + 1);
    card.setAttribute('aria-label', `${suitNames[suitIndex]} ${rank}${rankIndex === 0 ? `：${projects[suitIndex].title}` : ''}`);
    card.innerHTML = `<span class="collection-rank">${rank}<small>${suit}</small></span><span class="collection-pip">${suit}</span><span class="collection-rank collection-rank-bottom">${rank}<small>${suit}</small></span>${rankIndex === 0 ? '<span class="collection-project-mark">作品 ↗</span>' : ''}`;
    if (rankIndex === 0) {
      card.type = 'button';
      card.addEventListener('click', () => {
        lastProjectTrigger = card;
        projectDialog.querySelectorAll('.project').forEach((project, index) => { project.hidden = index !== suitIndex; });
        projectDialog.showModal();
      });
    }
    fan.append(card);
  });
  group.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    expand(true);
  });
  group.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    if (!pinned && !group.contains(document.activeElement)) expand(false);
  });
  toggle.addEventListener('click', () => { pinned = !pinned; expand(pinned); });
  group.addEventListener('focusin', () => expand(true));
  group.addEventListener('focusout', event => {
    if (!group.contains(event.relatedTarget) && !pinned && !hovered) expand(false);
  });
  suitCollections.append(group);
  const scroll = group.querySelector('.fan-scroll');
  scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;
});
projectDialog.querySelector('.dialog-close').addEventListener('click', () => projectDialog.close());
projectDialog.addEventListener('close', () => lastProjectTrigger?.focus({preventScroll:true}));

// Fit each complete fan into its grid cell without changing card proportions.
const fanSizer = new ResizeObserver(entries => {
  entries.forEach(({target, contentRect}) => {
    const scale = contentRect.width / 760;
    target.style.setProperty('--fan-scale', scale);
    target.style.setProperty('--fan-height', `${470 * scale}px`);
  });
});
document.querySelectorAll('.fan-scroll').forEach(scroll => fanSizer.observe(scroll));

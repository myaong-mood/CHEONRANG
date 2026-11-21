(() => {
  'use strict';
  const data = window.CHEONRANG;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset = (id, type) => `assets/${id}-${type}.${type === 'emblem' ? 'png' : (id === 'gijun' ? 'jpg' : 'webp')}`;
  const landing = $('landing'), video = $('teaser'), main = $('main'), header = $('site-header');
  const dialog = $('profile-dialog');
  const music = $('site-bgm');
  music.volume = 0.35;
  function syncMusicButton() {
    const playing = !music.paused;
    $('music-toggle').setAttribute('aria-pressed', String(playing));
    $('music-toggle').setAttribute('aria-label', playing ? '배경음악 일시정지' : '배경음악 재생');
    $('music-label').textContent = playing ? 'BGM ON' : 'BGM OFF';
  }
  function startMusic() { music.play().then(syncMusicButton).catch(syncMusicButton); }
  $('music-toggle').addEventListener('click', () => {
    if (music.paused) startMusic(); else music.pause();
  });
  music.addEventListener('play', syncMusicButton);
  music.addEventListener('pause', syncMusicButton);
  music.addEventListener('error', () => { music.pause(); syncMusicButton(); });
  syncMusicButton();
  let lastFocus = null, isEntering = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function videoUnavailable() { landing.classList.add('video-unavailable'); }
  video.addEventListener('error', videoUnavailable);
  video.querySelector('source').addEventListener('error', videoUnavailable);
  video.addEventListener('loadeddata', () => landing.classList.remove('video-unavailable'));
  function seekVideo(delta) {
    const duration = Number.isFinite(video.duration) ? video.duration : Number.POSITIVE_INFINITY;
    if (!video.readyState) return;
    video.currentTime = Math.max(0, Math.min(duration, (video.currentTime || 0) + delta));
  }
  $('video-back').addEventListener('click', () => seekVideo(-10));
  $('video-forward').addEventListener('click', () => seekVideo(10));
  $('video-fullscreen').addEventListener('click', () => {
    if (typeof video.requestFullscreen === 'function') video.requestFullscreen().catch(() => {});
    else if (typeof video.webkitEnterFullscreen === 'function') video.webkitEnterFullscreen();
  });
  if (reducedMotion) video.pause();

  function showMain({animate = true} = {}) {
    if (isEntering || landing.hidden) return;
    isEntering = true;
    video.pause();
    const finish = () => {
      video.pause(); landing.hidden = true; landing.classList.remove('landing-exit');
      main.hidden = false; header.hidden = false; isEntering = false;
      window.scrollTo(0, 0); $('home').setAttribute('tabindex', '-1'); $('home').focus({preventScroll:true});
      history.replaceState(null, '', '#home');
    };
    if (animate && !reducedMotion) { landing.classList.add('landing-exit'); setTimeout(finish, 450); } else finish();
  }
  $('enter-site').addEventListener('click', () => showMain());
  $('replay-teaser').addEventListener('click', () => {
    music.pause();
    if (dialog.open) dialog.close();
    main.hidden = true; header.hidden = true; landing.hidden = false;
    window.scrollTo(0, 0); history.replaceState(null, '', location.pathname + location.search);
    if (!reducedMotion) video.play().catch(() => {});
    $('enter-site').focus();
  });

  $('team-roster').innerHTML = data.members.map(m => `
    <button type="button" class="member-card${m.leader ? ' leader' : ''}" data-member="${escape(m.id)}" style="--accent:${m.accent}" aria-label="${escape(m.name)} · ${escape(m.codeKo)} 개인 프로필 열기">
      <span class="portrait-frame"><img class="member-portrait" src="${asset(m.id,'portrait')}" alt="${escape(m.name)}의 초상" loading="lazy" width="400" height="600">${m.leader || m.deputy || m.id === 'raon' ? `<span class="leader-badge">${m.leader ? '대장' : (m.deputy ? '부대장' : '가이드')}</span>` : ''}<span class="member-rank">天 · ${m.id === 'raon' ? '천율' : '천위'}</span><img class="member-emblem" src="${asset(m.id,'emblem')}" alt="${escape(m.name)}의 능력 문장" loading="lazy" width="640" height="640"></span>
      <span class="member-copy">
        <img class="nameplate-crest" src="assets/nameplate-crest.svg" alt="" aria-hidden="true" loading="lazy">
        <img class="member-watermark" src="${asset(m.id,'emblem')}" alt="" aria-hidden="true" loading="lazy">
        <span class="nameplate-register"><span class="member-role">${m.id === 'raon' ? '天律 · 천율' : '天衛 · 천위'}</span><span class="nameplate-grade" aria-label="천급">天</span></span>
        <span class="nameplate-identity"><strong class="member-name">${escape(m.name)}</strong>${m.hanja ? `<small class="member-hanja">${escape(m.hanja)}</small>` : ''}</span>
        <span class="codename-panel"><span class="codename-caption">CODE NAME <i aria-hidden="true"></i></span><span class="member-codename">${escape(m.codeEn)}</span><span class="codename-reading">${escape(m.codeKo)}${m.id === 'gyeom' || m.id === 'hyeonryun' ? ' · ' + escape(m.code) : ''}</span></span>
        <span class="nameplate-skill"><span class="ability-seal" aria-hidden="true">異能</span><span class="member-ability">${escape({gyeom:'동천',raon:'홍련',hyeonryun:'중력 조작',ungyeol:'광학 굴절',gijun:'영점 시차'}[m.id])}</span></span>
        <span class="nameplate-action">개인 기록 열람 <span aria-hidden="true">＋</span></span>
      </span>
    </button>`).join('');

  function openProfile(id, trigger) {
    const m = data.members.find(member => member.id === id);
    if (!m) return;
    lastFocus = trigger || document.activeElement;
    $('profile-content').innerHTML = `
      <div class="profile-layout dossier" style="--member-accent:${m.accent}">
        <div class="profile-visual">
          <img class="profile-photo" src="${asset(m.id,'portrait')}" alt="${escape(m.name)}의 초상">
          <div class="portrait-register"><span>天武 · 特任隊</span><span>천랑 소속</span></div>
          <div class="portrait-inscription"><span>${escape(m.codeKo)}</span><small>${escape(m.codeEn)}</small></div>
        </div>
        <div class="profile-record">
          <img class="profile-watermark" src="${asset(m.id,'emblem')}" alt="" aria-hidden="true">
          <header class="record-masthead"><span>天武</span><div>작전국 · 특임대 천랑<small>PERSONNEL ARCHIVE</small></div><span class="record-clearance">공개<br>기록</span></header>
          <div class="record-identity"><div><p class="record-role">${escape(m.role)}</p><h2 id="profile-name">${escape(m.name)}${m.hanja ? `<small>${escape(m.hanja)}</small>` : ''}</h2></div><div class="record-rank"><span>天</span><small>${m.id === 'raon' ? '천율' : '천위'}</small></div></div>
          <div class="record-codename"><span class="record-caption">CODE NAME</span><p class="profile-code">${escape(m.codeEn)}</p><span class="record-code-ko">${escape(m.codeKo)}${m.id === 'gyeom' || m.id === 'hyeonryun' ? ' · '+escape(m.code) : ''}</span><img src="assets/nameplate-crest.svg" alt="" aria-hidden="true"></div>
          <div class="profile-keywords">${m.keywords.map(k => `<span>${escape(k)}</span>`).join('')}</div>
          <blockquote class="profile-quote"><span aria-hidden="true">“</span><p>${escape(m.quote)}</p></blockquote>
          <dl class="profile-facts"><div><dt>나이</dt><dd>${m.age}세</dd></div><div><dt>체격</dt><dd>${escape(m.height)}</dd></div><div class="fact-ability"><dt>능력</dt><dd>${escape(m.ability)}</dd></div><div><dt>제작</dt><dd>${escape(m.creator)}</dd></div></dl>
          <div class="profile-description">${m.description.map((section,i) => `<section class="record-section"><div class="record-section-heading"><span class="record-section-seal" aria-hidden="true">${['能','性','錄'][i] || '錄'}</span><h3>${escape(section.title)}</h3><i aria-hidden="true"></i></div><p>${escape(section.text)}</p></section>`).join('')}</div>
          <footer class="record-footer"><img src="${asset(m.id,'emblem')}" alt="" aria-hidden="true"><div><small>천랑 · 개인 이야기</small><a class="story-link" href="https://tikita.ai/ko/story/${m.story}" target="_blank" rel="noopener noreferrer">${escape(m.name)}의 이야기 만나기 <span aria-hidden="true">＋</span></a></div></footer>
        </div>
      </div>`;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.scrollTop = 0;
    $('close-profile').focus({preventScroll:true});
  }
  $('team-roster').addEventListener('click', event => {
    const button = event.target.closest('[data-member]');
    if (button) openProfile(button.dataset.member, button);
  });
  $('close-profile').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); if (lastFocus && lastFocus.isConnected) lastFocus.focus({preventScroll:true}); });

  function riftMark(level) {
    const cuts = Array.from({length:level + 1}, (_,i) => { const x = 37 + i * 9 - level * 4.5; return `<path d="M${x + 10} 12 L${x - 1} 39 L${x + 6} 43 L${x - 4} 81 L${x + 15} 47 L${x + 8} 41 L${x + 16} 18" fill="currentColor" opacity="${1-i*.12}"/>`; }).join('');
    return `<svg class="rank-mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L91 50 L50 96 L9 50Z" fill="none" stroke="currentColor" stroke-width="${.7+level*.35}" opacity=".45"/><path d="M23 22 L12 50 L23 78 M77 22 L88 50 L77 78" fill="none" stroke="currentColor" opacity=".3"/>${cuts}</svg>`;
  }
  function beastMark(level) {
    const outerHorns = level > 1 ? '<path d="M21 38 L5 17 L10 48 L26 59 M79 38 L95 17 L90 48 L74 59" fill="currentColor"/>' : '';
    const crown = level === 3 ? '<path d="M34 28 L27 5 L46 23 L50 2 L54 23 L73 5 L66 28" fill="currentColor"/>' : '';
    const teeth = Array.from({length:level+2},(_,i) => `<path d="M${36+i*(28/(level+1))} 69 l3 ${8+level*2} l3 -${8+level*2}" fill="none" stroke="currentColor" stroke-width="2"/>`).join('');
    return `<svg class="rank-mark" viewBox="0 0 100 100" aria-hidden="true">${outerHorns}${crown}<path d="M27 39 Q${13-level*3} 24 18 8 L40 33 M73 39 Q${87+level*3} 24 82 8 L60 33" fill="none" stroke="currentColor" stroke-width="${3+level}"/><path d="M25 34 L39 26 L61 26 L75 34 L82 56 L67 81 L50 93 L33 81 L18 56Z" fill="currentColor" opacity=".22"/><path d="M25 34 L39 26 L61 26 L75 34 L82 56 L67 81 L50 93 L33 81 L18 56Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M29 47 L45 53 L35 58Z M71 47 L55 53 L65 58Z" fill="currentColor"/><path d="M50 56 L45 66 L55 66Z" fill="currentColor"/>${teeth}</svg>`;
  }
  function awakenedMark(level) {
    const petals = Array.from({length:4+level*2},(_,i) => `<path d="M50 49 Q29 24 50 ${14-level*2} Q71 24 50 49Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.3" transform="rotate(${i*360/(4+level*2)} 50 50)"/>`).join('');
    const crown = level === 3 ? '<path d="M30 17 L24 5 L43 12 L50 1 L57 12 L76 5 L70 17" fill="none" stroke="currentColor" stroke-width="1.5"/>' : '';
    return `<svg class="rank-mark" viewBox="0 0 100 100" aria-hidden="true">${level>0?'<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" opacity=".5"/>':''}${petals}<path d="M50 37 L63 50 L50 63 L37 50Z" fill="currentColor" fill-opacity=".3" stroke="currentColor"/><circle cx="50" cy="50" r="4" fill="currentColor"/>${crown}</svg>`;
  }
  const marks = {rift:riftMark,beast:beastMark,awakened:awakenedMark};
  Object.entries(data.ranks).forEach(([type,ranks]) => {
    $(`${type}-ranks`).innerHTML = ranks.map((r,i) => `<div class="rank-tile" style="--rank-color:${r.color}"><span class="rank-watermark" aria-hidden="true">${r.hanja}</span>${marks[type](i)}<h4><span>${r.hanja}</span>${r.name}</h4><p><strong>${r.summary}</strong><br>${r.description}</p></div>`).join('');
  });
  const bookNames = ['皇室','宮署','家門','山河','象徵','歲時'];
  $('archive-list').innerHTML = data.archives.map((a,i) => `<article class="archive-book"><button class="book-spine" type="button" data-book="${i}" aria-expanded="false" aria-controls="archive-page-${i}"><span class="spine-cap" aria-hidden="true">❖</span><span class="spine-hanja" aria-hidden="true">${bookNames[i]}</span><span class="spine-title">${escape(a.title)}</span><span class="spine-imprint" aria-hidden="true">天嵐</span></button><section id="archive-page-${i}" class="book-pages" hidden aria-label="${escape(a.title)}"><div class="book-paper"><div class="book-running-head"><span>天嵐 · 帝國記錄</span><span>${bookNames[i]}</span></div><h3>${escape(a.title)}</h3><div class="archive-body">${a.body}</div><p class="book-colophon">天嵐　／　천람의 기록</p></div></section></article>`).join('');
  $('archive-list').addEventListener('click', event => {
    const trigger = event.target.closest('[data-book]');
    if (!trigger) return;
    const index = Number(trigger.dataset.book);
    const shouldOpen = trigger.getAttribute('aria-expanded') !== 'true';
    data.archives.forEach((_, i) => {
      const spine = document.querySelector(`[data-book="${i}"]`);
      const panel = $(`archive-page-${i}`);
      const active = i === index && shouldOpen;
      spine.setAttribute('aria-expanded', String(active));
      spine.closest('.archive-book').classList.toggle('is-open', active);
      panel.hidden = !active;
    });
    $('archive-list').classList.toggle('has-open-book', shouldOpen);
  });
  if (['#home','#team','#world','#classification'].includes(location.hash)) {
    const targetHash = location.hash;
    showMain({animate:false});
    history.replaceState(null,'',targetHash);
    requestAnimationFrame(() => document.querySelector(targetHash)?.scrollIntoView());
  }
})();

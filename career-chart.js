// 히어로 경력 그래프: books.js 데이터로 연도별 출간 종수와 분야 분포를 그린다.
// 세트·시리즈는 1건이 아니라 count(포함된 도서 종수)만큼 센다.
// 출간연도를 덧붙이려면 books.js 항목에 "year": 2012 를 넣거나,
// 여러 해에 걸쳐 나왔으면 "yearCounts": {"2011": 10, "2012": 13} 처럼 넣는다.
(function(){
  const box = document.querySelector('#careerChart');
  if(!box) return;
  const books = window.BOOKS || [];
  const FROM = 2007, TO = 2026; // 아카이브 출간연도 기준

  const GROUPS = [
    {key:'kids',  label:'어린이·청소년', color:'#F08A65', cats:['어린이','전집','초등참고서','청소년']},
    {key:'baby',  label:'유아',          color:'#E9C65B', cats:['유아']},
    {key:'liber', label:'인문·예술·과학', color:'#69A9DC', cats:['인문','예술','자연과학','사회 정치','자기계발']},
    {key:'essay', label:'에세이',        color:'#B69ADB', cats:['에세이']},
    {key:'life',  label:'실용·취미',     color:'#61C4B2', cats:['가정 살림','건강 취미']}
  ];
  const groupOf = cat => GROUPS.find(g => g.cats.includes(cat)) || GROUPS[GROUPS.length-1];

  const years = [];
  for(let y = FROM; y <= TO; y++) years.push(y);
  const table = Object.fromEntries(years.map(y => [y, Object.fromEntries(GROUPS.map(g => [g.key, 0]))]));
  let undated = 0;
  const undatedBy = Object.fromEntries(GROUPS.map(g => [g.key, 0]));
  const titles = {}; // titles['2014|kids'] = Map(시리즈명 → 종수)
  const esc = v => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  // "용선생… 3권", "바이 스파이 1권", "WHAT? 초등과학 17권 — 유전" 같은 낱권은 시리즈 이름으로 묶는다
  const seriesName = t => String(t).replace(/\s*\d+\s*(~\s*\d+\s*)?권.*$/, '').replace(/\s+\d+$/, '').trim() || t;
  const addTitle = (y, g, title, n) => {
    const m = titles[y + '|' + g] ??= new Map();
    m.set(title, (m.get(title) || 0) + n);
  };

  books.forEach(book => {
    const count = Number(book.count) || 0;
    if(!count) return; // 미출간 기획 등
    const g = groupOf(book.category).key;
    let spread = null;
    if(book.yearCounts) spread = book.yearCounts;
    else if(book.year) spread = {[book.year]: count};
    else {
      const m = String(book.bibliography?.published || '').match(/(19|20)\d{2}/);
      if(m) spread = {[m[0]]: count};
    }
    if(!spread){ undated += count; undatedBy[g] += count; return; }
    Object.entries(spread).forEach(([y, n]) => {
      if(table[y]){ table[y][g] += Number(n) || 0; addTitle(y, g, seriesName(book.title), Number(n) || 0); }
      else { undated += Number(n) || 0; undatedBy[g] += Number(n) || 0; }
    });
  });

  const totals = years.map(y => GROUPS.reduce((s, g) => s + table[y][g.key], 0));
  const dated = totals.reduce((a, b) => a + b, 0);
  const groupTotals = GROUPS.map(g => years.reduce((s, y) => s + table[y][g.key], undatedBy[g.key]));
  const max = Math.max(...totals, 1);
  const axisMax = max; // 가장 높은 실제 막대를 세로축 상한으로 사용

  // SVG 레이아웃 (viewBox 기준, 컨테이너 폭에 맞춰 늘어남)
  const W = 400, H = 162, L = 26, R = 12, T = 20, B = 26;
  const plotW = W - L - R, plotH = H - T - B;
  const step = plotW / years.length, barW = step * 0.62;
  const yPos = v => T + plotH - (v / axisMax) * plotH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  for(let v = 0; v <= axisMax; v += 10){
    const y = yPos(v);
    svg += `<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" class="cc-grid${v===0?' base':''}"/>`;
    svg += `<text x="${L-6}" y="${y+3}" class="cc-tick" text-anchor="end">${v}</text>`;
  }
  svg += `<text x="${L-6}" y="10" class="cc-tick" text-anchor="end">(종)</text>`;
  years.forEach((y, i) => {
    const x = L + i*step + (step-barW)/2;
    let acc = 0;
    const parts = GROUPS.map(g => ({g, v: table[y][g.key]})).filter(p => p.v);
    parts.forEach((p, j) => {
      const y0 = yPos(acc + p.v), h = yPos(acc) - y0;
      svg += `<rect x="${x}" y="${y0}" width="${barW}" height="${Math.max(h-0.8,0.6)}" fill="${p.g.color}"${j===parts.length-1?' rx="1.5"':''} data-key="${y}|${p.g.key}"></rect>`;
      acc += p.v;
    });
    if(totals[i]) svg += `<text x="${x+barW/2}" y="${yPos(totals[i])-4}" class="cc-val" text-anchor="middle">${totals[i]}</text>`;
    if(i % 4 === 0 || i === years.length-1) svg += `<text x="${x+barW/2}" y="${H-B+15}" class="cc-tick" text-anchor="middle">${y}</text>`;
  });
  svg += `</svg>`;

  const legend = GROUPS.map((g, i) => groupTotals[i]
    ? `<li><i style="background:${g.color}"></i>${g.label}<b>${groupTotals[i]}</b></li>` : '').join('');

  box.innerHTML = `
    <div class="cc-head">
      <div><div class="cc-label">CAREER ${FROM}—${TO}</div><div class="cc-title">연도별 출간 종수와 분야</div></div>
      <div class="cc-total"><span>누적 출간 종수</span><div><b>${dated + undated}</b>종</div></div>
    </div>
    <div class="cc-body"><div class="cc-plot">${svg}<div class="cc-tip" hidden></div></div>
    <ul class="cc-legend">${legend}</ul></div>
    ${undated ? `<p class="cc-note">세트·시리즈는 포함 종수로 계산 · 출간연도 미확인 ${undated}종은 그래프에서 제외</p>` : `<p class="cc-note">세트·시리즈는 포함 종수로 계산</p>`}`;
  box.setAttribute('aria-label', `${FROM}년부터 ${TO}년까지 연도별 출간 종수 그래프. ` +
    years.map((y, i) => totals[i] ? `${y}년 ${totals[i]}종` : '').filter(Boolean).join(', '));

  // 막대에 커서를 올리면 그 해·분야의 도서명을 보여 준다
  const plot = box.querySelector('.cc-plot');
  const tip = plot.querySelector('.cc-tip');
  const LIMIT = 8;
  function show(rect, evt){
    const [y, g] = rect.dataset.key.split('|');
    const group = GROUPS.find(x => x.key === g);
    const list = [...(titles[y + '|' + g] || new Map())].sort((a, b) => b[1] - a[1]);
    const rows = list.slice(0, LIMIT).map(([t, n]) => `<li>${esc(t)}${n > 1 ? `<em>${n}종</em>` : ''}</li>`).join('');
    const more = list.length > LIMIT ? `<li class="more">외 ${list.length - LIMIT}건</li>` : '';
    tip.innerHTML = `<div class="cc-tip-head"><i style="background:${group.color}"></i>${y} · ${group.label}<b>${table[y][g]}종</b></div><ul>${rows}${more}</ul>`;
    tip.hidden = false;
    plot.querySelectorAll('rect.on').forEach(r => r.classList.remove('on'));
    rect.classList.add('on');
    move(evt, rect);
  }
  function move(evt, rect){
    const pr = plot.getBoundingClientRect();
    let x, y;
    if(evt && evt.clientX != null){ x = evt.clientX - pr.left; y = evt.clientY - pr.top; }
    else { const rr = rect.getBoundingClientRect(); x = rr.left + rr.width/2 - pr.left; y = rr.top - pr.top; }
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    // 커서 옆에 띄우고, 오른쪽 공간이 부족하면 왼쪽으로 넘긴다. 세로는 그래프 영역 안에 맞춘다
    let left = x + 16; if(left + tw > pr.width) left = x - tw - 16; if(left < 0) left = Math.max(0, pr.width - tw);
    const top = Math.min(Math.max(y - th/2, 0), Math.max(pr.height - th, 0));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hide(){ tip.hidden = true; plot.querySelectorAll('rect.on').forEach(r => r.classList.remove('on')); }
  plot.addEventListener('pointerover', e => { const r = e.target.closest('rect[data-key]'); if(r) show(r, e); });
  plot.addEventListener('pointermove', e => { if(!tip.hidden && e.target.closest('rect[data-key]')) move(e); });
  plot.addEventListener('pointerout', e => { if(e.target.closest('rect[data-key]') && !e.relatedTarget?.closest?.('rect[data-key]')) hide(); });
  document.addEventListener('pointerdown', e => { if(!e.target.closest('#careerChart rect[data-key]')) hide(); });
})();

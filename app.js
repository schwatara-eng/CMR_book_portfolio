const books = window.BOOKS || [];
const grid = document.querySelector('#bookGrid');
const search = document.querySelector('#searchInput');
const companyFilter = document.querySelector('#companyFilter');
const categoryFilter = document.querySelector('#categoryFilter');
const typeFilter = document.querySelector('#typeFilter');
const resultCount = document.querySelector('#resultCount');
const emptyState = document.querySelector('#emptyState');
const dialog = document.querySelector('#bookDialog');
const modalBody = document.querySelector('#modalBody');

document.querySelector('#archiveCount').textContent = books.length;

function unique(key){return [...new Set(books.map(b=>b[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));}
unique('company').forEach(v=>companyFilter.insertAdjacentHTML('beforeend',`<option>${escapeHtml(v)}</option>`));
unique('category').forEach(v=>categoryFilter.insertAdjacentHTML('beforeend',`<option>${escapeHtml(v)}</option>`));

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function placeholder(book){return `<div class="placeholder"><span>${escapeHtml(book.company)}</span><b>${escapeHtml(book.title.slice(0,18))}</b><span>EDITORIAL ARCHIVE</span></div>`;}
function cover(book){
  const covers = Array.isArray(book.covers) ? book.covers.filter(Boolean) : [];
  if(book.count > 1 && covers.length >= 2){
    const shown = covers.slice(0,4);
    return `<div class="series-collage series-count-${shown.length}" data-book-id="${book.id}">${shown.map((_,i)=>`<img class="series-cover-img" data-book-id="${book.id}" data-cover-index="${i}" alt="${escapeHtml(book.title)} 시리즈 표지 ${i+1}" loading="lazy" referrerpolicy="no-referrer">`).join('')}<span class="series-badge">${book.count}종</span></div>`;
  }
  if(book.cover){
    return `<div class="single-series-wrap"><img class="book-cover-img" data-book-id="${book.id}" alt="${escapeHtml(book.title)} 표지" loading="lazy" referrerpolicy="no-referrer">${book.count>1?`<span class="series-badge">${book.count}종</span>`:''}</div>`;
  }
  return placeholder(book).replace('</div>', book.count>1?`<span class="series-badge">${book.count}종</span></div>`:'</div>');
}

function bindCoverImages(root=document){
  root.querySelectorAll('.series-cover-img').forEach(img=>{
    const book=books.find(b=>b.id===Number(img.dataset.bookId));
    const src=book?.covers?.[Number(img.dataset.coverIndex)];
    if(!src) return;
    img.addEventListener('error',()=>{ img.style.display='none'; },{once:true});
    img.src=src;
  });
  root.querySelectorAll('.book-cover-img').forEach(img=>{
    const book=books.find(b=>b.id===Number(img.dataset.bookId));
    if(!book || !book.cover) return;
    img.addEventListener('error',()=>{
      const box=img.closest('.cover');
      if(box) box.innerHTML=placeholder(book);
    },{once:true});
    img.src=book.cover;
  });
}

function card(book){
  const metric = book.metric || book.availability || '';
  return `<article class="book-card" tabindex="0" data-id="${book.id}" aria-label="${escapeHtml(book.title)} 상세보기">
    <div class="cover">${cover(book)}</div>
    <div class="card-meta"><span>${escapeHtml(book.company)}</span></div>
    <h3>${escapeHtml(book.title)}</h3>
    <div class="card-note">${escapeHtml(metric)}</div>
  </article>`;
}

function render(){
  const q=search.value.trim().toLowerCase();
  const list=books.filter(b=>(!q || `${b.title} ${b.company} ${b.category} ${b.note} ${b.metric}`.toLowerCase().includes(q)) && (!companyFilter.value||b.company===companyFilter.value) && (!categoryFilter.value||b.category===categoryFilter.value) && (!typeFilter.value||b.type===typeFilter.value));
  grid.innerHTML=list.map(card).join('');
  bindCoverImages(grid);
  resultCount.textContent=`${list.length} / ${books.length}`;
  emptyState.hidden=list.length!==0;
  preparePrintLayout();
}

// 담당한 권 목록 (books.js의 volumes: [{no, title}]) — 상세창 '작업 내용' 칸 안에 표시
function volumesMarkup(book){
  const list = Array.isArray(book.volumes) ? book.volumes : [];
  if (!list.length) return '';
  return `<ol class="volume-list" aria-label="담당 도서 목록" style="--vol-rows:${Math.ceil(list.length / 2)}">${list.map(v => `<li><b>${escapeHtml(v.no)}</b><span>${escapeHtml(v.title)}</span></li>`).join('')}</ol>`;
}

function bibliographyMarkup(book){
  const info = book.bibliography || {};
  const formatPrice = value => {
    if (value === null || value === undefined || String(value).trim() === '') return '';
    const raw = String(value).trim();
    const numeric = raw.replace(/[,\s원₩]/g, '');
    return /^\d+$/.test(numeric) ? Number(numeric).toLocaleString('ko-KR') + '원' : raw;
  };
  const fields = [
    ['글', info.author],
    ['그림', info.illustrator],
    ['번역', info.translator],
    ['출판사', info.publisher],
    ['출간일', info.published],
    ['제본', info.binding],
    ['판형', info.dimensions],
    ['쪽수', info.pages],
    ['ISBN', info.isbn13],
    ['정가', formatPrice(info.price)]
  ];
  const rows = fields.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');
  if (!rows.length) return '';
  return `<section class="bibliography" aria-label="도서 서지정보">
    <h3>도서 정보</h3>
    <dl class="bibliography-list">${rows.map(([label, value]) =>
      `<div class="bibliography-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    ).join('')}</dl>
  </section>`;
}

function openBook(book){
  const image = book.cover
    ? `<img class="modal-cover-img" alt="${escapeHtml(book.title)} 표지" referrerpolicy="no-referrer">`
    : placeholder(book);

  modalBody.innerHTML=`<div class="modal-grid"><div class="modal-cover">${image}</div><div class="modal-copy">
    <div class="modal-kicker">${escapeHtml(book.type)} · ${book.count ? escapeHtml(book.count)+'종' : '기획 프로젝트'}</div>
    <h2>${escapeHtml(book.title)}</h2><div class="modal-company">${escapeHtml(book.company)}</div>
    <dl class="detail-list">
      <div class="detail-row"><dt>분야</dt><dd>${escapeHtml(book.category||'—')}</dd></div>
      ${book.availability?`<div class="detail-row"><dt>상태</dt><dd>${escapeHtml(book.availability)}</dd></div>`:''}
      <div class="detail-row"><dt>작업 내용</dt><dd>${escapeHtml(book.metric||'추가 조사 중')}${volumesMarkup(book)}</dd></div>
      <div class="detail-row"><dt>코멘트</dt><dd>${escapeHtml(book.note||'—')}</dd></div>
    </dl>
    ${bibliographyMarkup(book)}
    ${book.url?`<a class="store-link" href="${escapeHtml(book.url)}" target="_blank" rel="noopener noreferrer">서점 / 출처 페이지 보기 ↗</a>`:''}
  </div></div>`;

  const modalImg=modalBody.querySelector('.modal-cover-img');
  if(modalImg){
    modalImg.addEventListener('error',()=>{
      const box=modalImg.closest('.modal-cover');
      if(box) box.innerHTML=placeholder(book);
    },{once:true});
    modalImg.src=book.cover;
  }
  dialog.showModal();
}

grid.addEventListener('click',e=>{const card=e.target.closest('.book-card');if(card)openBook(books.find(b=>b.id===Number(card.dataset.id)));});
grid.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.book-card')){e.preventDefault();openBook(books.find(b=>b.id===Number(e.target.dataset.id)));}});
[search,companyFilter,categoryFilter,typeFilter].forEach(el=>el.addEventListener(el===search?'input':'change',render));
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
[dialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
render();

// Representative projects reuse the archive detail dialog and its source data.
document.querySelectorAll('[data-feature-book]').forEach(button => {
  button.addEventListener('click', () => {
    const book = books.find(item => item.id === Number(button.dataset.featureBook));
    if (book) openBook(book);
  });
});
// 포트폴리오 PDF: 브라우저 인쇄 창을 열어 'PDF로 저장'으로 내려받게 한다 (인쇄용 스타일은 style.css의 @media print).
// 지연 로딩 중인 표지 이미지가 PDF에서 빠지지 않도록, 인쇄 전에 모든 이미지를 불러온다.
function loadAllImages(timeout = 4000){
  const imgs = [...document.images];
  imgs.forEach(img => { img.loading = 'eager'; });
  const pending = imgs.filter(img => !img.complete).map(img => new Promise(done => {
    img.addEventListener('load', done, {once:true});
    img.addEventListener('error', done, {once:true});
  }));
  return Promise.race([Promise.all(pending), new Promise(done => setTimeout(done, timeout))]);
}
document.querySelectorAll('[data-print-pdf]').forEach(button => {
  button.addEventListener('click', async () => {
    const label = button.textContent;
    button.disabled = true; button.textContent = 'PDF 준비 중…';
    await loadAllImages();
    preparePrintLayout();
    button.disabled = false; button.textContent = label;
    window.print();
  });
});
// 인쇄 시 소개 박스와 푸터를 마지막 쪽 하단에 붙인다.
// 아카이브는 새 쪽에서 시작하고 카드 높이가 고정이라(style.css 인쇄 레이아웃) 쪽 나눔을 계산할 수 있다.
function preparePrintLayout(){
  const about = document.querySelector('#about');
  if (!about) return;
  const mm = 96 / 25.4;
  const PAGE = 186 * mm;            // A4 가로 297×210mm, 여백 12mm → 내용 높이 186mm
  const HEAD = 20 + 60 + 20;        // 아카이브 위 여백 + 제목 영역 + 아래 여백
  const CARD = 140, GAP = 10, COLS = 9;
  const ABOUT = 200, FOOTER = 30, SAFE = 6;
  const rows = Math.ceil(grid.querySelectorAll('.book-card').length / COLS);
  const firstFit = Math.floor((PAGE - HEAD + GAP) / (CARD + GAP));
  const nextFit = Math.floor((PAGE + GAP) / (CARD + GAP));
  let used;
  if (rows <= firstFit) used = HEAD + rows * (CARD + GAP);
  else {
    const rest = rows - firstFit;
    const lastRows = rest % nextFit || nextFit;
    used = lastRows * (CARD + GAP);
  }
  let gap = PAGE - used - ABOUT - FOOTER - SAFE;
  const spacer = document.querySelector('.print-spacer');
  if (spacer) spacer.classList.toggle('print-new-page', gap < 16);
  if (gap < 16) gap = PAGE - ABOUT - FOOTER - SAFE;
  document.documentElement.style.setProperty('--print-about-gap', Math.max(0, Math.floor(gap)) + 'px');
}
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  preparePrintLayout();
});
// 인쇄 창을 어떤 방법으로 열어도 값이 준비돼 있도록, 처음 열 때와 아카이브가 다시 그려질 때마다 미리 계산해 둔다.
preparePrintLayout();

// 전체 도서 아카이브 펼치기/접기 (기본: 접힘). 인쇄할 때는 style.css에서 항상 펼쳐 보인다.
const archiveToggle = document.querySelector('.archive-toggle');
const archiveBody = document.querySelector('#archiveBody');
function setArchiveOpen(open){
  if (!archiveToggle || !archiveBody) return;
  archiveBody.hidden = !open;
  archiveToggle.setAttribute('aria-expanded', String(open));
  archiveToggle.textContent = open ? '▼ 접기' : '▶ 펼치기';
}
archiveToggle?.addEventListener('click', () => setArchiveOpen(archiveBody.hidden));
// 메뉴의 '도서 아카이브'로 이동하면 펼쳐서 보여 준다
document.querySelectorAll('a[href="#archive"]').forEach(link => link.addEventListener('click', () => setArchiveOpen(true)));
if (location.hash === '#archive') setArchiveOpen(true);

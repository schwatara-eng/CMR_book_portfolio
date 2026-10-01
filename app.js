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
const aboutDialog = document.querySelector('#aboutDialog');

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
    return `<div class="series-collage" data-book-id="${book.id}">${shown.map((_,i)=>`<img class="series-cover-img" data-book-id="${book.id}" data-cover-index="${i}" alt="${escapeHtml(book.title)} 시리즈 표지 ${i+1}" loading="lazy" referrerpolicy="no-referrer">`).join('')}<span class="series-badge">${book.count}종</span></div>`;
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
  const metric = book.metric || book.availability || '시장지표 조사 중';
  return `<article class="book-card status-${escapeHtml(book.status)}" tabindex="0" data-id="${book.id}" aria-label="${escapeHtml(book.title)} 상세보기">
    <div class="cover">${cover(book)}</div>
    <div class="card-meta"><span>${escapeHtml(book.company)}</span><span><i class="status-dot"></i>${escapeHtml(book.status)}</span></div>
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
}

function openBook(book){
  // 모달도 먼저 안전한 텍스트 마크업만 만든 뒤 이미지 src를 DOM으로 주입한다.
  // 외부 이미지 주소 때문에 modalBody.innerHTML 구조가 깨지는 것을 원천적으로 차단한다.
  const image = book.cover
    ? `<img class="modal-cover-img" alt="${escapeHtml(book.title)} 표지" referrerpolicy="no-referrer">`
    : placeholder(book);

  modalBody.innerHTML=`<div class="modal-grid"><div class="modal-cover">${image}</div><div class="modal-copy">
    <div class="modal-kicker">${escapeHtml(book.type)} · ${book.count ? escapeHtml(book.count)+'종' : '기획 프로젝트'}</div>
    <h2>${escapeHtml(book.title)}</h2><div class="modal-company">${escapeHtml(book.company)}</div>
    <dl class="detail-list">
      <div class="detail-row"><dt>분야</dt><dd>${escapeHtml(book.category||'—')}</dd></div>
      <div class="detail-row"><dt>공개 상태</dt><dd>${escapeHtml(book.availability||'—')}</dd></div>
      <div class="detail-row"><dt>시장 지표</dt><dd>${escapeHtml(book.metric||'추가 조사 중')}</dd></div>
      <div class="detail-row"><dt>성과 메모</dt><dd>${escapeHtml(book.note||'—')}</dd></div>
      <div class="detail-row"><dt>조사 상태</dt><dd>${escapeHtml(book.status||'—')}</dd></div>
    </dl>
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
document.querySelector('#aboutBtn').addEventListener('click',()=>aboutDialog.showModal());
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
[dialog,aboutDialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
render();

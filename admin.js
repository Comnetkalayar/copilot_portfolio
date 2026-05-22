// Admin UI behaviors: sidebar, drag-drop, toast, live preview
(function(){
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}

  function showToast(msg, timeout=2600){
    let t = qs('.toast');
    if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h);
    t._h = setTimeout(()=> t.classList.remove('show'), timeout);
  }

  function initSidebar(){
    const items = qsa('.nav-item');
    items.forEach(it=>{
      it.addEventListener('click', (e)=>{
        items.forEach(i=>i.classList.remove('active'));
        it.classList.add('active');
        const target = it.dataset.target;
        if(!target) return;

        // If a dedicated panel exists (panel-section), show it
        const panel = document.getElementById(target);
        if(panel && panel.classList && panel.classList.contains('panel-section')){
          document.querySelectorAll('.panel-section').forEach(s=>s.style.display='none');
          panel.style.display = 'block';
          window.scrollTo({top: panel.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth'});
          return;
        }

        // Fallback: try mapping panel-foo -> section-foo inside main content and scroll to it
        const sectionId = target.replace(/^panel-/,'section-');
        const sec = document.getElementById(sectionId);
        if(sec){
          // ensure main overview panel is visible
          document.querySelectorAll('.panel-section').forEach(s=>s.style.display='none');
          const main = document.getElementById('panel-general');
          if(main) main.style.display = 'block';
          sec.scrollIntoView({behavior:'smooth', block:'start'});
          return;
        }
      });

      // keyboard accessibility: activate on Enter / Space
      it.addEventListener('keydown', (ev)=>{
        if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); it.click(); }
      });
    });
  }

  function initDragDrop(){
    const drop = document.querySelector('.drag-drop');
    const fileInput = document.getElementById('avatarFile');
    const preview = document.getElementById('avatarPreview');
    if(!drop || !fileInput) return;

    ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault();drop.classList.add('dragover');}));
    ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault();drop.classList.remove('dragover');}));

    drop.addEventListener('drop',(e)=>{
      const f = e.dataTransfer.files[0]; if(!f) return; fileInput.files = e.dataTransfer.files; showPreview(f, preview);
    });

    fileInput.addEventListener('change',()=>{ const f = fileInput.files && fileInput.files[0]; if(f) showPreview(f, preview); });

    function showPreview(file, preview){ const fr=new FileReader(); fr.onload=()=>{ preview.src=fr.result; preview.style.display='block'; showToast('Image ready'); }; fr.readAsDataURL(file); }
  }

  function initLivePreview(){
    const inputs = document.querySelectorAll('#name,#eyebrow,#headline,#intro,#aboutHeadline,#aboutText');
    const preview = document.querySelector('.preview-frame');
    if(!preview) return;
    inputs.forEach(inp=>inp.addEventListener('input',()=>{
      preview.querySelector('.pv-name')?.textContent = document.getElementById('name').value || 'Kalayar Moe Myint';
      preview.querySelector('.pv-headline')?.textContent = document.getElementById('headline').value || 'Building delightful interfaces';
      preview.querySelector('.pv-intro')?.textContent = document.getElementById('intro').value || '';
    }));
  }

  function initCollapsible(){
    document.querySelectorAll('.collapsible-toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{ const target = document.getElementById(btn.dataset.target); if(!target) return; const open = target.style.display !== 'none'; target.style.display = open ? 'none' : 'block'; });
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{ try{ initSidebar(); initDragDrop(); initLivePreview(); initCollapsible(); }catch(e){} });

  // If the script is executed after DOMContentLoaded, initialize immediately
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    try{ initSidebar(); initDragDrop(); initLivePreview(); initCollapsible(); }catch(e){}
  }

  // Event delegation fallback: ensure clicks on nav items are handled even if elements changed
  const _navList = qs('.nav-list');
  if(_navList){
    _navList.addEventListener('click', (e)=>{
      const it = e.target.closest('.nav-item');
      if(it) it.click();
    });
  }
})();
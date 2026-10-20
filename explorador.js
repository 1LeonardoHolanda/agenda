/* Explorador de Planilha - Leo (versão celular / favorito)
   Roda DENTRO da página da planilha. Só LÊ a estrutura da tela e gera um relatório.
   Não altera nada e não envia nada para fora do aparelho. */
(function () {
  if (window.__EXP) { window.__EXP.toggle(); return; }

  const $ = (s, r = document) => r.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let ULT = '', FRAMES = [];

  const semQuery = u => { try { const x = new URL(u, location.href); return x.host + x.pathname; } catch (e) { return String(u).slice(0, 80); } };

  // esconde nomes: letras viram x/X, números viram 9 (a estrutura continua visível)
  const mascara = (t, ligado) => ligado ? String(t).replace(/\p{Lu}/gu, 'X').replace(/\p{Ll}/gu, 'x').replace(/\d/g, '9') : String(t);

  function mapa(doc, rot, L, mask, prof) {
    const M = t => mascara(t, mask);
    const q = s => { try { return Array.from(doc.querySelectorAll(s)); } catch (e) { return []; } };
    const vis = e => e.getClientRects().length > 0;
    const txt = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
    const desc = e => {
      const r = e.getBoundingClientRect();
      const at = [];
      ['role', 'aria-label', 'aria-rowindex', 'aria-colindex', 'title', 'placeholder', 'contenteditable', 'data-id', 'data-row', 'data-col'].forEach(a => {
        const v = e.getAttribute && e.getAttribute(a);
        if (v) at.push(a + '=' + M(v).slice(0, 40));
      });
      const cl = (e.getAttribute('class') || '').trim().split(/\s+/).slice(0, 3).join('.');
      return e.tagName.toLowerCase() + (e.id ? '#' + e.id.slice(0, 30) : '') + (cl ? '.' + cl : '') +
        (at.length ? ' [' + at.join(' ') + ']' : '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) +
        (txt(e) ? ' "' + M(txt(e)).slice(0, 40) + '"' : '');
    };
    const ln = s => L.push(s);
    const ident = '  '.repeat(prof);

    ln(ident + '=== ' + rot + ' ===');
    let local = '';
    try { local = doc.defaultView.location.host + doc.defaultView.location.pathname; } catch (e) { }
    ln(ident + 'endereço: ' + local + ' | título: ' + M(doc.title || '').slice(0, 50));

    const todos = q('body *');
    ln(ident + 'elementos na página: ' + todos.length);

    // canvas
    const cv = q('canvas').filter(vis);
    ln(ident + 'canvas visíveis: ' + cv.length + (cv.length ? ' -> ' + cv.slice(0, 5).map(c => Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height)).join(', ') : ''));

    // roles de grade/tabela
    const roles = ['grid', 'treegrid', 'table', 'row', 'gridcell', 'cell', 'columnheader', 'rowheader', 'tab', 'textbox'];
    ln(ident + 'roles: ' + roles.map(r => r + '=' + q('[role="' + r + '"]').length).join(' '));

    // tabelas HTML
    const tb = q('table').filter(vis);
    ln(ident + 'tabelas HTML visíveis: ' + tb.length);
    tb.slice(0, 3).forEach(t => ln(ident + '  tabela: ' + t.rows.length + ' linhas, ' + (t.rows[0] ? t.rows[0].cells.length : 0) + ' colunas | ' + desc(t)));

    // amostra de células
    const cel = q('[role="gridcell"],[role="cell"],td').filter(vis);
    ln(ident + 'células visíveis (gridcell/cell/td): ' + cel.length);
    cel.filter(c => txt(c)).slice(0, 12).forEach(c => ln(ident + '  ' + desc(c)));

    // divs que parecem células (muitos irmãos com mesmo tamanho e texto curto)
    const cand = todos.filter(e => vis(e) && !e.children.length && txt(e) && txt(e).length < 80);
    ln(ident + 'elementos-folha com texto curto: ' + cand.length);
    const cont = {};
    cand.forEach(e => { const k = e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || '').trim().split(/\s+/).slice(0, 2).join('.'); cont[k] = (cont[k] || 0) + 1; });
    Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => ln(ident + '  ' + v + 'x ' + k));

    // barra de fórmulas / caixa de nome
    const fx = todos.filter(e => /f[óo]rmula|name box|caixa de nome|formula bar/i.test((e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + (e.getAttribute('placeholder') || '') + ' ' + (e.id || '')));
    ln(ident + 'candidatos a barra de fórmulas/caixa de nome: ' + fx.length);
    fx.slice(0, 6).forEach(e => ln(ident + '  ' + desc(e)));

    // campos editáveis
    const ed = q('input,textarea,[contenteditable="true"],[contenteditable=""]').filter(vis);
    ln(ident + 'campos editáveis visíveis: ' + ed.length);
    ed.slice(0, 8).forEach(e => ln(ident + '  ' + desc(e)));

    // abas de planilha (Plan1, Plan2...) e botões
    const ab = q('[role="tab"],[class*="sheet" i][class*="tab" i]').filter(vis);
    ln(ident + 'abas: ' + ab.length);
    ab.slice(0, 8).forEach(e => ln(ident + '  ' + desc(e)));
    const bt = q('button,[role="button"],[role="menuitem"]').filter(vis).map(b => M((b.getAttribute('aria-label') || txt(b)).slice(0, 25))).filter(Boolean);
    ln(ident + 'botões visíveis (' + bt.length + '): ' + Array.from(new Set(bt)).slice(0, 40).join(' | '));

    // shadow roots
    const sh = todos.filter(e => e.shadowRoot).length;
    ln(ident + 'shadow roots: ' + sh);

    // texto da tela
    ln(ident + '--- texto visível (início) ---');
    ln(M((doc.body.innerText || '').replace(/\n{3,}/g, '\n\n')).slice(0, 1500).split('\n').map(x => ident + x).join('\n'));

    // iframes
    const fr = q('iframe,frame');
    ln(ident + 'iframes: ' + fr.length);
    fr.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      let acessa = false, d = null;
      try { d = f.contentDocument; acessa = !!(d && d.body); } catch (e) { }
      const src = f.getAttribute('src') || f.src || '';
      ln(ident + '  [' + i + '] ' + semQuery(src) + ' | ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' | ' + (vis(f) ? 'visível' : 'oculto') + ' | ' + (acessa ? 'ACESSÍVEL' : 'BLOQUEADO (outro domínio)'));
      if (!acessa && vis(f) && r.width > 200 && src) FRAMES.push({ src: f.src || src, nome: semQuery(src) });
      if (acessa && prof < 3) mapa(d, rot + ' > iframe[' + i + ']', L, mask, prof + 1);
    });
  }

  function executar() {
    FRAMES = [];
    const mask = $('#exp-m').checked;
    const L = [];
    L.push('RELATÓRIO DO EXPLORADOR (' + new Date().toLocaleString('pt-BR') + ')');
    L.push('navegador: ' + navigator.userAgent.slice(0, 110));
    L.push('tela: ' + innerWidth + 'x' + innerHeight + ' | esta janela é ' + (window.top === window ? 'a principal' : 'um quadro interno'));
    L.push('nomes escondidos: ' + (mask ? 'SIM' : 'NÃO'));
    L.push('');
    // não mapeia o próprio painel
    const p = $('#exp-p'), pill = $('#exp-pill'), ps = p.style.display;
    p.style.display = 'none'; pill.style.display = 'none';
    try { mapa(document, 'PÁGINA', L, mask, 0); } catch (e) { L.push('ERRO ao mapear: ' + e.message); }
    p.style.display = ps;
    L.push('');
    const bloq = FRAMES.length;
    L.push(bloq ? 'CONCLUSÃO: há ' + bloq + ' quadro(s) grande(s) bloqueado(s) (outro domínio). A planilha provavelmente está DENTRO dele; o favorito precisa rodar lá dentro.' :
      'CONCLUSÃO: nenhum quadro grande bloqueado.');
    ULT = L.join('\n');
    $('#exp-t').value = ULT; $('#exp-t').style.display = 'block';
    $('#exp-fr').innerHTML = FRAMES.map((f, i) => '<button data-f="' + i + '">Abrir quadro ' + (i + 1) + ' em nova aba<br><small>' + esc(f.nome.slice(0, 50)) + '</small></button>').join('');
    $('#exp-cp').style.display = 'inline-block';
    log('Mapa pronto (' + ULT.length + ' caracteres). Toque em Copiar e cole no chat.');
  }

  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { }
    try { const ta = $('#exp-t'); ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length); return document.execCommand('copy'); } catch (e) { return false; }
  }

  /* ---------------- interface ---------------- */
  const css = document.createElement('style');
  css.textContent = `
  #exp-p{position:fixed;z-index:2147483647;left:0;right:0;bottom:0;display:flex;flex-direction:column;max-height:80vh;max-height:80dvh;background:#eef3fa;color:#1b2a3a;font:14px system-ui,sans-serif;box-shadow:0 -4px 18px #0004;border-top:1px solid #8fb0d6}
  #exp-p *{box-sizing:border-box;font-family:inherit}
  #exp-p .h{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:linear-gradient(#e0edfb,#b6cfec);border-bottom:1px solid #8fb0d6;color:#1d3a5f;font-size:15px;flex:none}
  #exp-p .b{padding:10px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-height:0;-webkit-overflow-scrolling:touch}
  #exp-p .b>*{flex:none}
  #exp-p button{background:linear-gradient(#fbfbfb 50%,#e1e1e1 50%);border:1px solid #8a8f98;border-radius:7px;padding:9px 12px;font-size:14px;font-weight:600;color:#1b2a3a;min-height:40px;text-align:center}
  #exp-p button.ok{background:linear-gradient(#8be39a 50%,#2fa244 50%);border-color:#1d6b2c;color:#fff}
  #exp-p textarea{width:100%;height:30vh;border:1px solid #a9bfd8;border-radius:6px;padding:8px;font:11px Consolas,monospace;background:#fff;color:#1b2a3a}
  #exp-p .r{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  #exp-p small{color:#4b6a8f}
  #exp-log{margin:0;font:11px Consolas,monospace;white-space:pre-wrap;color:#1b2a3a}
  #exp-pill{position:fixed;z-index:2147483647;right:12px;bottom:12px;background:linear-gradient(#e0edfb,#b6cfec);border:1px solid #8fb0d6;border-radius:20px;padding:10px 14px;font:600 14px system-ui,sans-serif;color:#1d3a5f;box-shadow:0 2px 10px #0004;display:none}`;
  document.head.appendChild(css);

  const P = document.createElement('div');
  P.id = 'exp-p';
  P.innerHTML = `
  <div class="h"><b>Explorador de Planilha - Leo</b><button data-a="min">▾</button></div>
  <div class="b">
    <small>Só lê a estrutura da tela. Não altera a planilha. Deixe a planilha aberta e visível antes de mapear.</small>
    <label class="r"><input type="checkbox" id="exp-m" checked> <span>Esconder nomes (recomendado)</span></label>
    <div class="r"><button class="ok" data-a="map">🔎 Mapear esta página</button><button id="exp-cp" data-a="cp" style="display:none">Copiar relatório</button></div>
    <div id="exp-fr" class="r"></div>
    <textarea id="exp-t" readonly style="display:none"></textarea>
    <pre id="exp-log"></pre>
  </div>`;
  const pill = document.createElement('div');
  pill.id = 'exp-pill'; pill.textContent = '🔎 Explorador';
  document.body.append(P, pill);

  const log = m => { const d = new Date(); $('#exp-log').textContent += pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '  ' + m + '\n'; };
  const mostrar = v => { P.style.display = v ? 'flex' : 'none'; pill.style.display = v ? 'none' : 'block'; };

  P.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'), f = e.target.closest('[data-f]');
    if (f) { const x = FRAMES[+f.dataset.f]; if (x) { window.open(x.src, '_blank'); log('Abri o quadro em nova aba. Lá, ative o favorito de novo e mapeie.'); } return; }
    if (!a) return;
    if (a.dataset.a === 'min') mostrar(false);
    else if (a.dataset.a === 'map') { log('Mapeando...'); await sleep(50); try { executar(); } catch (er) { log('ERRO: ' + er.message); } }
    else if (a.dataset.a === 'cp') { const ok = await copiar(ULT); log(ok ? 'Copiado! Cole no chat.' : 'Não consegui copiar: segure o texto da caixa e copie manualmente.'); }
  });
  pill.addEventListener('click', () => mostrar(true));
  window.__EXP = { toggle: () => mostrar(P.style.display === 'none') };
})();

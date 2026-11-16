/* Fio da História — comportamento compartilhado (sem dependências). */
(function () {
  var d = document, R = d.documentElement;
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function hoje(o) { var x = new Date(); x.setDate(x.getDate() - (o || 0)); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function dias() { try { return JSON.parse(ler('biblia-dias') || '[]'); } catch (e) { return []; } }
  function sequencia() {
    var s = dias(), n = 0, i = s.indexOf(hoje()) >= 0 ? 0 : 1;
    while (s.indexOf(hoje(i)) >= 0) { n++; i++; }
    return n;
  }
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = d.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); d.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }
  function lido(id) { return ler('biblia-lido-' + id) === '1'; }

  /* tema claro/escuro */
  var bt = d.getElementById('tema');
  if (bt) bt.addEventListener('click', function () {
    var escuro = R.getAttribute('data-tema') === 'dark' || (!R.getAttribute('data-tema') && matchMedia('(prefers-color-scheme: dark)').matches);
    var novo = escuro ? 'light' : 'dark'; R.setAttribute('data-tema', novo); gravar('biblia-tema', novo);
  });

  /* barra de progresso de leitura */
  var barra = d.getElementById('leitura');
  if (barra) {
    var tick = false;
    var atualiza = function () {
      var h = R.scrollHeight - R.clientHeight;
      barra.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, R.scrollTop / h) : 0) + ')'; tick = false;
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(atualiza); } }, { passive: true });
    atualiza();
  }

  /* atalhos: rolagem suave só ao clicar (nunca durante o toque) */
  d.querySelectorAll('.chips a').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var s = d.querySelector(a.getAttribute('href')); if (!s) return;
      ev.preventDefault();
      var y = s.getBoundingClientRect().top + R.scrollTop - 64;
      var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: y, behavior: reduz ? 'auto' : 'smooth' });
    });
  });

  /* atalhos: destaca a seção visível */
  var chips = d.querySelectorAll('.chips a');
  if (chips.length && 'IntersectionObserver' in window) {
    var mapa = {};
    chips.forEach(function (a) { var s = d.querySelector(a.getAttribute('href')); if (s) mapa[s.id] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && mapa[e.target.id]) {
          chips.forEach(function (c) { c.removeAttribute('aria-current'); });
          mapa[e.target.id].setAttribute('aria-current', 'true');
          var ch=mapa[e.target.id], bx=ch.parentNode;
          bx.scrollLeft = ch.offsetLeft - (bx.clientWidth - ch.offsetWidth) / 2;
        }
      });
    }, { rootMargin: '-20% 0px -65% 0px' });
    Object.keys(mapa).forEach(function (id) { io.observe(d.getElementById(id)); });
  }

  /* episódio: teste, trava suave, marcar como lido e anotações */
  var ep = d.body.getAttribute('data-ep');
  if (ep) {
    var pad = function (n) { return ('00' + n).slice(-3); };
    var num = parseInt(ep, 10);
    var sec = d.getElementById('teste');
    var total = sec ? parseInt(sec.getAttribute('data-total') || '0', 10) : 0;
    var minimo = sec ? parseInt(sec.getAttribute('data-min') || '0', 10) : 0;
    var qk = 'biblia-quiz-' + ep;
    var respostas = function () { try { return JSON.parse(ler(qk) || '[]'); } catch (e) { return []; } };
    var acertos = function () { return respostas().filter(function (x) { return x === 1; }).length; };
    var quizOk = function () { return total === 0 || acertos() >= minimo; };
    var itensQ = sec ? sec.querySelectorAll('.quiz>li') : [];
    var pintaQuiz = function () {
      var r = respostas();
      itensQ.forEach(function (li, i) {
        li.querySelectorAll('[data-ac]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(r[i]) === b.getAttribute('data-ac') ? 'true' : 'false');
        });
      });
      var st = d.getElementById('quiz-estado');
      if (st) st.textContent = acertos() + ' de ' + total + ' marcadas como acerto' + (quizOk() ? ' — teste concluído.' : '.');
    };
    itensQ.forEach(function (li, i) {
      li.querySelectorAll('[data-ac]').forEach(function (b) {
        b.addEventListener('click', function () {
          var r = respostas(), ja = quizOk();
          r[i] = parseInt(b.getAttribute('data-ac'), 10);
          gravar(qk, JSON.stringify(r));
          pintaQuiz();
          if (!ja && quizOk()) toast('Teste concluído! Agora marque o episódio como lido.');
        });
      });
    });
    pintaQuiz();

    var bs = d.querySelectorAll('[data-lido]');
    var pinta = function () {
      var on = lido(ep);
      bs.forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Lido (toque para desmarcar)' : 'Marcar como lido'; });
    };
    bs.forEach(function (b) {
      b.addEventListener('click', function () {
        var on = !lido(ep);
        if (on && !quizOk()) {
          toast('Antes de concluir, faça o teste: acerte ao menos ' + minimo + ' de ' + total + '.');
          sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
          return;
        }
        gravar('biblia-lido-' + ep, on ? '1' : '0');
        if (on) {
          var s = dias(); if (s.indexOf(hoje()) < 0) { s.push(hoje()); gravar('biblia-dias', JSON.stringify(s.slice(-400))); }
          var n = sequencia();
          toast('Episódio concluído! ' + (n > 1 ? n + ' dias seguidos' : 'Primeiro dia da sequência'));
        } else { toast('Desmarcado.'); }
        pinta();
      });
    });
    pinta();

    /* trava suave: avisa, mas não bloqueia */
    var faltam = [];
    for (var j = 1; j < num; j++) if (!lido(pad(j))) faltam.push(pad(j));
    if (faltam.length && !lido(ep)) {
      var av = d.createElement('p'); av.className = 'aviso trava'; av.setAttribute('role', 'note');
      av.innerHTML = 'Este episódio está adiante na trilha: ' + (faltam.length === 1 ? 'falta 1 episódio' : 'faltam ' + faltam.length + ' episódios') +
        ' antes dele. Você pode ler assim mesmo, ou <a href="' + faltam[0] + '.html">continuar do ' + faltam[0] + '</a>.';
      var cp = d.querySelector('.chips'); if (cp) cp.parentNode.insertBefore(av, cp);
    }

    /* anotações privadas (só neste aparelho) */
    var ta = d.getElementById('nota-txt'), ne = d.getElementById('nota-estado');
    if (ta) {
      var nk = 'biblia-nota-' + ep; ta.value = ler(nk) || '';
      var tm;
      ta.addEventListener('input', function () {
        clearTimeout(tm); if (ne) ne.textContent = 'Salvando…';
        tm = setTimeout(function () { gravar(nk, ta.value); if (ne) ne.textContent = 'Salvo neste aparelho.'; }, 500);
      });
    }
  }

  /* índice: progresso, continuar, sequência */
  var itens = d.querySelectorAll('[data-id]');
  if (itens.length && d.getElementById('prog-bar')) {
    var feitos = 0, prox = null;
    var porEra = {};
    itens.forEach(function (li) {
      var id = li.getAttribute('data-id'), era = li.getAttribute('data-e');
      porEra[era] = porEra[era] || [0, 0]; porEra[era][1]++;
      if (lido(id)) { li.classList.add('lido'); feitos++; porEra[era][0]++; }
      else if (!prox) { prox = li; }
      else { li.classList.add('adiante'); var t = li.querySelector('.tags'); if (t) { var sp = d.createElement('span'); sp.className = 'adiante-tag'; sp.textContent = 'adiante na trilha'; t.appendChild(sp); } }
    });
    d.getElementById('prog-bar').style.width = (feitos / itens.length * 100) + '%';
    d.getElementById('prog-txt').textContent = feitos + ' de ' + itens.length + ' episódios lidos';
    Object.keys(porEra).forEach(function (e) { var c = d.getElementById('cont-' + e); if (c) c.textContent = porEra[e][0] + '/' + porEra[e][1]; });
    var bc = d.getElementById('continuar');
    if (prox) {
      bc.href = prox.getAttribute('data-id') + '.html';
      bc.textContent = feitos ? 'Continuar: ' + prox.getAttribute('data-t') + ' →' : 'Começar pelo primeiro episódio →';
    } else { bc.textContent = 'Tudo lido! Reler do começo'; bc.href = '001.html'; }
    var n = sequencia(), sq = d.getElementById('seq');
    if (n > 0) { sq.hidden = false; sq.textContent = n + (n > 1 ? ' dias seguidos' : ' dia') + ' estudando'; }
  }

  /* seletor de tradução */
  var raiz = d.getElementById('texto');
  if (raiz) {
    var btns = raiz.querySelectorAll('.vbtn');
    if (btns.length) {
      var set = function (v) {
        raiz.setAttribute('data-versao', v);
        btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); });
        gravar('biblia-versao', v);
      };
      var v = btns[0].dataset.v, s = ler('biblia-versao');
      if (s && raiz.querySelector('.vers-' + s)) v = s;
      btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.v); }); });
      set(v);
    }
  }

  /* mapa interativo */
  var el = d.getElementById('mapa-vivo');
  if (el) {
    var fallback = function () { el.style.display = 'none'; var f = d.querySelector('.mapa-fallback'); if (f) f.hidden = false; };
    if (typeof L === 'undefined') { fallback(); return; }
    var dados = JSON.parse(el.getAttribute('data-mapa'));
    var toque = matchMedia('(pointer:coarse)').matches;
    var map = L.map(el, { scrollWheelZoom: false, dragging: !toque, tap: !toque });
    var topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: 'Mapa: © OpenTopoMap (CC-BY-SA) · dados © colaboradores do OpenStreetMap' });
    var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© colaboradores do OpenStreetMap' });
    topo.addTo(map);
    L.control.layers({ 'Relevo': topo, 'Ruas': osm }, null, { collapsed: toque }).addTo(map);
    var carregou = 0;[topo, osm].forEach(function (t) { t.on('tileload', function () { carregou++; }); });
    setTimeout(function () { if (!carregou) fallback(); }, 7000);
    if (toque) {
      var trava = d.createElement('button');
      trava.type = 'button'; trava.className = 'mapa-trava'; trava.innerHTML = '<span>Toque para explorar o mapa</span>';
      el.appendChild(trava);
      var solta = d.createElement('button');
      solta.type = 'button'; solta.className = 'mapa-solta'; solta.textContent = 'Voltar a rolar a página'; solta.hidden = true;
      el.appendChild(solta);
      trava.addEventListener('click', function () { map.dragging.enable(); trava.hidden = true; solta.hidden = false; });
      solta.addEventListener('click', function () { map.dragging.disable(); trava.hidden = false; solta.hidden = true; });
    } else {
      map.on('click', function () { map.scrollWheelZoom.enable(); });
    }
    var cores = { inicio: '#2f6f5e', fim: '#b0501a', cidade: '#6b6357', debatido: '#7a4fb3' }, pts = [];
    var ndeb = (dados.lugares || []).filter(function (x) { return x.tipo === 'debatido'; }).length;
    (dados.rotas || []).forEach(function (r) {
      L.polyline(r.pontos, { color: '#ffffff', weight: 9, opacity: .9, interactive: false }).addTo(map);
      var pl = L.polyline(r.pontos, { color: '#c2410c', weight: 5, opacity: 1, dashArray: r.tracejada ? '10 10' : null }).addTo(map);
      pl.bindPopup('<strong>' + r.nome + '</strong><br>' + (r.nota || '')); r.pontos.forEach(function (p) { pts.push(p); });
    });
    (dados.lugares || []).forEach(function (p) {
      var principal = (p.tipo === 'inicio' || p.tipo === 'fim' || (p.tipo === 'debatido' && ndeb <= 5));
      var m = L.circleMarker([p.lat, p.lon], { radius: principal ? 10 : 7, color: '#fff', weight: 2, fillColor: cores[p.tipo] || '#6b6357', fillOpacity: 1 }).addTo(map);
      m.bindTooltip(p.nome, { permanent: principal, direction: 'right', offset: [8, 0], className: 'rotulo' });
      m.bindPopup('<strong>' + p.nome + '</strong><br>' + (p.nota || '')); pts.push([p.lat, p.lon]);
    });
    map.fitBounds(pts, { padding: [30, 30] });
  }
})();

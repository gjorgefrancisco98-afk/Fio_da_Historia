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
      barra.style.width = (h > 0 ? Math.min(100, R.scrollTop / h * 100) : 0) + '%'; tick = false;
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(atualiza); } }, { passive: true });
    atualiza();
  }

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
          mapa[e.target.id].scrollIntoView({ block: 'nearest', inline: 'center' });
        }
      });
    }, { rootMargin: '-20% 0px -65% 0px' });
    Object.keys(mapa).forEach(function (id) { io.observe(d.getElementById(id)); });
  }

  /* marcar como lido (página do episódio) */
  var ep = d.body.getAttribute('data-ep');
  if (ep) {
    var bs = d.querySelectorAll('[data-lido]');
    var pinta = function () {
      var on = lido(ep);
      bs.forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '✓ Lido' : '✓ Marcar como lido'; });
    };
    bs.forEach(function (b) {
      b.addEventListener('click', function () {
        var on = !lido(ep); gravar('biblia-lido-' + ep, on ? '1' : '0');
        if (on) {
          var s = dias(); if (s.indexOf(hoje()) < 0) { s.push(hoje()); gravar('biblia-dias', JSON.stringify(s.slice(-400))); }
          var n = sequencia();
          toast('Episódio concluído! ' + (n > 1 ? '🔥 ' + n + ' dias seguidos' : 'Primeiro dia da sequência 🔥'));
        } else { toast('Desmarcado.'); }
        pinta();
      });
    });
    pinta();
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
    if (n > 0) { sq.hidden = false; sq.textContent = '🔥 ' + n + (n > 1 ? ' dias seguidos' : ' dia') + ' estudando'; }
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
      trava.addEventListener('click', function () { map.dragging.enable(); trava.remove(); });
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

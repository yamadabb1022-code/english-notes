// ユニットページ共通
// 1) <section class="panel" data-tab="a" data-label="Section A"> からタブを自動生成する
// 2) <div class="quiz" data-unit="27" data-section="A" data-next="B"><script type="application/json">[...]</script></div> を確認テストにする
(function () {
  /* ---------------- tabs ---------------- */
  const panels = Array.from(document.querySelectorAll('section.panel[data-tab]'));
  const bar = document.querySelector('.tabs .wrap');
  if (panels.length && bar) {
    bar.setAttribute('role', 'tablist');
    const tabs = panels.map((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      p.id = 'panel-' + p.dataset.tab; b.id = 'tab-' + p.dataset.tab;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', p.id);
      b.textContent = p.dataset.label || p.dataset.tab;
      b.addEventListener('click', () => { show(p.dataset.tab); history.replaceState(null, '', '#' + p.dataset.tab); window.scrollTo(0, 0); });
      bar.appendChild(b);
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', b.id);
      return b;
    });
    bar.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[j].focus();
      tabs[j].click();
    });
    function show(id) {
      // ハッシュがなければ、最初のタブ（概要）を開く
      if (!panels.some((p) => p.dataset.tab === id)) id = panels[0].dataset.tab;
      panels.forEach((p, i) => {
        const on = p.dataset.tab === id;
        p.hidden = !on;
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[i].tabIndex = on ? 0 : -1;
        if (on) { // タブ列だけを横にスクロールして、選択中のタブを見せる（ページは縦に動かさない）
          const t = tabs[i];
          if (t.offsetLeft < bar.scrollLeft || t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = t.offsetLeft - 16;
        }
      });
    }
    // ハッシュ（#a など）と同じ id の要素は置かないので、ブラウザは勝手にスクロールしない
    show(location.hash.slice(1));
    window.addEventListener('hashchange', () => { show(location.hash.slice(1)); window.scrollTo(0, 0); });
  }

  /* ---------------- quiz ---------------- */
  // 打ち込み問題の照合: 大文字小文字・短縮形・句読点・余分な空白の揺れを許す。's は is / has の両方に展開する
  function variants(s) {
    let t = s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[.!?,]+$/g, '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\bcan't\b/g, 'cannot').replace(/\bcan not\b/g, 'cannot')
      .replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not')
      .replace(/n't\b/g, ' not').replace(/'ve\b/g, ' have').replace(/'re\b/g, ' are')
      .replace(/'m\b/g, ' am').replace(/'ll\b/g, ' will').replace(/'d\b/g, ' would');
    let out = [t];
    if (/'s\b/.test(t)) out = [t.replace(/'s\b/g, ' is'), t.replace(/'s\b/g, ' has'), t];
    return out.map((x) => x.replace(/\s+/g, ' ').trim());
  }
  function matches(input, answers) {
    const a = new Set(answers.flatMap(variants));
    return variants(input).some((v) => a.has(v));
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function comment(n, total) {
    if (n === total) return '全問正解です。このまま次のセクションへ進めます。';
    if (n >= total - 2) return 'おおむね理解できています。間違えた問題の解説を読み直してから進みましょう。';
    if (n >= Math.ceil(total / 2) - 1) return '半分ほどの理解です。基本ルールと教科書の例文をもう一度確認してください。';
    return 'まだ定着していません。このセクションを読み直してから、もう一度解いてください。';
  }

  document.querySelectorAll('.quiz').forEach((root) => {
    const src = root.querySelector('script[type="application/json"]');
    let qs;
    try { qs = JSON.parse(src.textContent); } catch (e) { root.textContent = 'テストのデータを読み込めませんでした。'; return; }
    const unit = root.dataset.unit, sec = root.dataset.section, next = root.dataset.next;
    const body = el('div');
    root.appendChild(body);
    let i, score, wrong;

    function start() { i = 0; score = 0; wrong = []; render(); }

    function header() {
      const h = el('div', 'head');
      const b = el('div', 'bar'); const fill = el('i'); fill.style.width = (i / qs.length * 100) + '%'; b.appendChild(fill);
      h.append(b, el('span', 'badge', score + ' / ' + qs.length));
      return h;
    }

    function render() {
      body.replaceChildren();
      if (i >= qs.length) return finish();
      const q = qs[i];
      body.appendChild(header());
      body.appendChild(el('div', 'qno', '問' + (i + 1) + (q.review ? '（復習）' : '')));
      body.appendChild(el('div', 'qtext', q.q));
      if (q.hint) body.appendChild(el('div', 'hint', q.hint));
      const after = el('div');

      if (q.type === 'choice') {
        const opts = el('div', 'opts');
        const btns = q.choices.map((c, k) => {
          const b = el('button', 'opt', ['a', 'b', 'c', 'd'][k] + '. ' + c);
          b.type = 'button';
          b.addEventListener('click', () => {
            const ok = k === q.answer;
            btns.forEach((x) => { x.disabled = true; });
            b.classList.add(ok ? 'ok' : 'ng');
            if (!ok) btns[q.answer].classList.add('ok');
            done(ok, after);
          });
          opts.appendChild(b);
          return b;
        });
        body.append(opts, after);
        if (i > 0) btns[0].focus({ preventScroll: true });
      } else {
        const row = el('form', 'row');
        const inp = el('input'); inp.type = 'text'; inp.id = 'quiz-' + sec + '-' + i; inp.autocomplete = 'off';
        inp.setAttribute('autocapitalize', 'off'); inp.spellcheck = false; inp.setAttribute('aria-label', '答え');
        const send = el('button', 'primary', '答える'); send.type = 'submit';
        const warn = el('div', 'warn'); warn.hidden = true;
        row.append(inp, send);
        row.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!inp.value.trim()) { warn.textContent = '答えを入力してください'; warn.hidden = false; inp.focus(); return; }
          warn.hidden = true;
          const ok = matches(inp.value, q.answers);
          inp.readOnly = true; send.disabled = true;
          inp.classList.add(ok ? 'ok' : 'ng');
          done(ok, after, ok ? null : '正解: ' + q.answers[0]);
        });
        body.append(row, warn, after);
        if (i > 0) inp.focus({ preventScroll: true });
      }
    }

    function done(ok, after, extra) {
      if (ok) score++; else wrong.push(i + 1);
      body.querySelector('.badge').textContent = score + ' / ' + qs.length;
      body.querySelector('.bar i').style.width = ((i + 1) / qs.length * 100) + '%';
      const r = el('div', 'result');
      r.appendChild(el('span', 'verdict ' + (ok ? 'ok' : 'ng'), ok ? '正解' : '不正解'));
      if (extra) r.appendChild(el('span', null, extra)), r.appendChild(document.createElement('br'));
      r.appendChild(document.createTextNode(qs[i].explain));
      const nav = el('div', 'nav');
      const nx = el('button', 'primary', i + 1 < qs.length ? '次へ' : '結果を見る'); nx.type = 'button';
      nx.addEventListener('click', () => { i++; render(); });
      nav.appendChild(nx);
      after.append(r, nav);
      nx.focus({ preventScroll: true });
    }

    function finish() {
      body.appendChild(header());
      body.appendChild(el('div', 'score', score + ' / ' + qs.length));
      body.appendChild(el('p', null, comment(score, qs.length)));
      const tail = next ? 'Section ' + next + ' に進んでください。' : '次のユニットに進んでください。';
      let text = 'Unit ' + unit + ' の Section ' + sec + ' のテスト結果は ' + score + ' / ' + qs.length + ' でした。' + tail;
      if (wrong.length) text += '\n間違えた問題: ' + wrong.map((n) => '問' + n).join('、');
      const msg = el('div', 'msg'); msg.style.whiteSpace = 'pre-line'; msg.textContent = text;
      const note = el('div', 'copied', '下のボタンでコピーして、会話に貼り付けて送ってください。');
      const nav = el('div', 'nav');
      const again = el('button', 'secondary', 'もう一度解く'); again.type = 'button'; again.addEventListener('click', start);
      const copy = el('button', 'primary', '結果をコピー'); copy.type = 'button';
      copy.addEventListener('click', () => {
        const fallback = () => {
          const r = document.createRange(); r.selectNodeContents(msg);
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
          note.textContent = '文章を選択しました。コピーして会話に貼り付けてください。';
        };
        try {
          navigator.clipboard.writeText(text).then(() => { note.textContent = 'コピーしました。会話に貼り付けて送ってください。'; }, fallback);
        } catch (e) { fallback(); }
      });
      nav.append(again, copy);
      body.append(msg, note, nav);
    }

    start();
  });
})();

// ページ上部へ戻るボタン（一覧ページでも使う。index.html からも読み込む）
(function () {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'to-top';
  b.setAttribute('aria-label', 'ページの上部へ戻る');
  b.textContent = '↑';
  b.hidden = true;
  b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(b);
  function sync() { b.hidden = window.scrollY < 400; }
  window.addEventListener('scroll', sync, { passive: true });
  sync();
})();

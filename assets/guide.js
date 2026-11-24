// Study guide: 章ごとに問題を並べ、章ごとに採点する（正解が複数ある問題あり）
(function () {
  const data = JSON.parse(document.getElementById('sgdata').textContent);
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const pad = (n) => ('00' + n).slice(-3);
  const KEY = (no) => 'giu:sg:' + no;
  function load(no) { try { return JSON.parse(localStorage.getItem(KEY(no)) || 'null') || { sel: {}, graded: false }; } catch (e) { return { sel: {}, graded: false }; } }
  function save(no, st) { try { localStorage.setItem(KEY(no), JSON.stringify(st)); } catch (e) {} }
  data.forEach((ch) => {
    const root = document.querySelector('.sg[data-ch="' + ch.no + '"]');
    if (!root) return;
    root.classList.add('quiz', 'all');
    const items = [];
    const st = load(ch.no);
    ch.q.forEach((q) => {
      const card = el('div', 'qcard');
      card.appendChild(el('div', 'qno', q.id + (q.ans.length > 1 ? '（正解は複数）' : '')));
      card.appendChild(el('div', 'qtext', q.text));
      const sel = new Set(st.sel[q.id] || []);
      const opts = el('div', 'opts');
      const btns = q.options.map((o) => {
        const b = el('button', 'opt', o[0] + '. ' + o[1]); b.type = 'button';
        b.addEventListener('click', () => { if (sel.has(o[0])) sel.delete(o[0]); else sel.add(o[0]); b.classList.toggle('sel', sel.has(o[0])); st.sel[q.id] = Array.from(sel); save(ch.no, st); });
        if (sel.has(o[0])) b.classList.add('sel');
        opts.appendChild(b); return b;
      });
      card.appendChild(opts);
      const res = el('div', 'result'); res.hidden = true; card.appendChild(res);
      root.appendChild(card);
      items.push({ q, sel, btns, res });
    });
    const out = el('div', 'final'), nav = el('div', 'nav');
    const grade = el('button', 'primary', '採点する'); grade.type = 'button';
    const again = el('button', 'secondary', 'やり直す'); again.type = 'button'; again.hidden = true;
    nav.append(again, grade); root.append(nav, out);
    function doGrade() {
      let score = 0; const wrong = [];
      items.forEach((it) => {
        const ans = it.q.ans, ok = ans.length === it.sel.size && ans.every((a) => it.sel.has(a));
        if (ok) score++; else wrong.push(it.q);
        it.btns.forEach((b, k) => {
          const L = it.q.options[k][0]; b.disabled = true;
          if (ans.includes(L)) b.classList.add('ok'); else if (it.sel.has(L)) b.classList.add('ng');
        });
        it.res.hidden = false; it.res.replaceChildren();
        it.res.appendChild(el('span', 'verdict ' + (ok ? 'ok' : 'ng'), ok ? '正解' : '不正解'));
        const first = it.q.options.find((o) => o[0] === ans[0]);
        it.res.appendChild(el('div', null, '正解: ' + ans.join(', ')));
        if (first) it.res.appendChild(el('div', null, it.q.text.replace('＿＿＿', first[1])));
        const r = el('div', null, '勉強するユニット: ');
        it.q.units.forEach((u, i) => {
          if (i) r.appendChild(document.createTextNode('、'));
          const a = el('a', null, 'Unit ' + u); a.href = 'units/unit-' + pad(u) + '.html'; r.appendChild(a);
        });
        it.res.appendChild(r);
      });
      grade.hidden = true; again.hidden = false;
      let text = 'Study guide ' + ch.no + '章（' + ch.en + '）の結果は ' + score + ' / ' + items.length + ' でした。';
      if (wrong.length) text += '\n間違えた問題: ' + wrong.map((q) => q.id).join('、');
      const need = []; wrong.forEach((q) => { const u = q.units[0]; if (!need.includes(u)) need.push(u); });
      if (need.length) text += '\n復習するユニット: ' + need.map((u) => 'Unit ' + u).join('、');
      const msg = el('div', 'msg', text); msg.style.whiteSpace = 'pre-line';
      out.replaceChildren(el('div', 'score', score + ' / ' + items.length + ' 点'), msg);
      st.graded = true; save(ch.no, st);
    }
    grade.addEventListener('click', () => { doGrade(); out.scrollIntoView({ block: 'center' }); });
    again.addEventListener('click', () => {
      items.forEach((it) => { it.sel.clear(); it.btns.forEach((b) => { b.disabled = false; b.className = 'opt'; }); it.res.hidden = true; });
      out.replaceChildren(); grade.hidden = false; again.hidden = true; window.scrollTo(0, 0);
      st.sel = {}; st.graded = false; save(ch.no, st);
    });
    if (st.graded) doGrade();
  });
})();

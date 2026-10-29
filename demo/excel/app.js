// 엑셀 자동화 시연: 쇼핑몰 3곳의 서로 다른 주문 파일을 하나로 정리한다.
// 모든 처리는 브라우저 안에서만 한다(파일이 서버로 가지 않음). 엑셀 읽기·쓰기는 SheetJS.
(function () {
  var PRODUCTS = [
    { id: 'fig', name: '무화과잼 250g', price: 9800, keys: ['무화과', 'fig'] },
    { id: 'straw', name: '딸기잼 250g', price: 8900, keys: ['딸기', 'straw'] },
    { id: 'apple', name: '사과잼 250g', price: 8500, keys: ['사과', 'apple'] },
    { id: 'set', name: '잼 3종 선물세트', price: 26000, keys: ['세트', '선물', 'set'] }
  ];
  var CHANNELS = {
    A: { name: 'A몰', fee: 0.055, file: 'A몰_주문내역.xlsx' },
    B: { name: 'B몰', fee: 0.108, file: 'B몰_주문목록.xlsx' },
    C: { name: '자사몰', fee: 0.033, file: '자사몰_주문.xlsx' }
  };

  // ---------- 예시 파일 만들기 (일부러 형식이 제각각) ----------
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  var LAST = '김이박최정강조윤장임한오서신권황안송류홍';
  var FIRST = ['민지', '서연', '지훈', '하늘', '도윤', '수현', '예린', '준호', '다은', '태희', '지민', '서준', '유진', '채원', '현우', '은비', '시우', '나연'];
  var ROADS = ['하늘로', '구름길', '바람로', '노을길', '새벽로', '별빛길', '숲속로', '물결길'];
  var GU = ['서울 마포구', '서울 송파구', '경기 성남시 분당구', '부산 해운대구', '대전 유성구', '인천 연수구', '광주 북구', '경기 고양시 일산동구'];

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  function makeSamples() {
    var r = rng(20261029), base = new Date(2026, 9, 27);
    var people = [];
    for (var i = 0; i < 400; i++) {
      people.push({
        name: LAST[Math.floor(r() * LAST.length)] + FIRST[Math.floor(r() * FIRST.length)],
        phone: '0100000' + pad(1000 + Math.floor(r() * 9000), 4),
        addr: GU[Math.floor(r() * GU.length)] + ' ' + ROADS[Math.floor(r() * ROADS.length)] + ' ' + (1 + Math.floor(r() * 180)) + ', ' + (101 + Math.floor(r() * 12)) + '동 ' + (100 + Math.floor(r() * 1500)) + '호'
      });
    }
    var pickN = 0;
    function pick() { return people[(pickN++ * 37 + 11) % people.length]; } // 겹치지 않게 차례로 뽑는다
    function prod() { var x = r(); return PRODUCTS[x < 0.35 ? 0 : x < 0.65 ? 1 : x < 0.85 ? 2 : 3]; }
    function when() { var d = new Date(base); d.setDate(d.getDate() + Math.floor(r() * 3)); d.setHours(8 + Math.floor(r() * 14), Math.floor(r() * 60)); return d; }

    // A몰: 깔끔한 편. 옵션 칸이 따로 있고 연락처에 하이픈이 없다.
    var A = [['주문번호', '주문일시', '상품명', '옵션', '수량', '결제금액', '수취인', '연락처', '배송지']];
    for (i = 0; i < 46; i++) {
      var p = pick(), pr = prod(), q = r() < 0.75 ? 1 : 2, d = when();
      A.push(['A' + (2610270000 + i * 7), d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
        pr.id === 'set' ? '수제잼 선물세트' : '수제 ' + pr.name.split(' ')[0], pr.id === 'set' ? '3종 구성' : '250g', q, pr.price * q, p.name, p.phone, p.addr]);
    }
    // B몰: 상품명에 옵션이 섞여 있고, 전화번호가 띄어쓰기, 같은 주문이 두 번 들어간 줄이 있다.
    var B = [['주문ID', '주문일', '상품명', '구매수량', '판매가', '받는분', '전화', '주소', '우편번호']];
    for (i = 0; i < 52; i++) {
      p = pick(); pr = prod(); q = r() < 0.7 ? 1 : (r() < 0.6 ? 2 : 3); d = when();
      var ph = p.phone.slice(0, 3) + ' ' + p.phone.slice(3, 7) + ' ' + p.phone.slice(7);
      var nm = pr.id === 'set' ? '[선물용] 잼 3종 세트 (무화과+딸기+사과)' : '[' + pr.name.split(' ')[0].replace('잼', '') + '] 수제잼 250g x ' + q;
      var row = ['B-' + (88120 + i * 3), d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), nm, q, pr.price * q, p.name, ph,
        r() < 0.3 ? '  ' + p.addr.replace(' ', '  ') + ' ' : p.addr, pad(10000 + Math.floor(r() * 50000), 5)];
      B.push(row);
      if (i % 17 === 5) B.push(row.slice()); // 중복으로 두 번 내려받힌 줄
    }
    // 자사몰: 손으로 만든 장부. 금액이 "19,600원" 글자, 날짜가 "10월 27일", 국가번호 붙은 번호, 취소·빈 줄 섞임.
    var C = [['번호', '날짜', '품목', '개수', '금액', '고객명', '핸드폰', '주소', '상태']];
    var nick = { fig: ['무화과', '무화과 잼', '무화과잼(250)'], straw: ['딸기', '딸기 잼', '딸기잼 큰거'], apple: ['사과', '사과잼'], set: ['선물세트', '3종세트'] };
    for (i = 0; i < 40; i++) {
      p = pick(); pr = prod(); q = r() < 0.8 ? 1 : 2; d = when();
      var nn = nick[pr.id][Math.floor(r() * nick[pr.id].length)];
      var phone = r() < 0.35 ? '+82 10-' + p.phone.slice(3, 7) + '-' + p.phone.slice(7) : p.phone.slice(0, 3) + '-' + p.phone.slice(3, 7) + '-' + p.phone.slice(7);
      C.push([i + 1, (d.getMonth() + 1) + '월 ' + d.getDate() + '일', nn, q + '개', (pr.price * q).toLocaleString('ko-KR') + '원', p.name, phone, p.addr, i % 11 === 4 ? '취소' : (r() < 0.5 ? '입금확인' : '')]);
      if (i % 13 === 8) C.push(['', '', '', '', '', '', '', '', '']);
    }
    // 자동으로 알 수 없는 상품 한 건: 사람이 확인하도록 남긴다.
    p = pick(); B.push(['B-88999', '2026-10-28', '[이벤트] 랜덤 맛 수제잼 1개', 1, 8000, p.name, p.phone.slice(0, 3) + ' ' + p.phone.slice(3, 7) + ' ' + p.phone.slice(7), p.addr, '04123']);
    // 같은 사람이 두 곳에서 주문한 경우를 몇 건 만든다(합포장 대상).
    for (i = 0; i < 5; i++) {
      p = people[i * 9]; pr = prod(); d = when();
      A.push(['A' + (2610279000 + i), '2026.10.28 ' + pad(10 + i) + ':1' + i, pr.id === 'set' ? '수제잼 선물세트' : '수제 ' + pr.name.split(' ')[0], pr.id === 'set' ? '3종 구성' : '250g', 1, pr.price, p.name, p.phone, p.addr]);
      C.push([41 + i, '10월 28일', nick[pr.id][0], '1개', pr.price.toLocaleString('ko-KR') + '원', p.name, '010-' + p.phone.slice(3, 7) + '-' + p.phone.slice(7), p.addr, '']);
    }
    return { A: A, B: B, C: C };
  }

  // ---------- 정리 규칙 ----------
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  // 휴대폰 번호만 받는다(010·011·016~019). 숫자 칸에 저장돼 앞 0이 빠진 10자리(1012345678)도 되살린다.
  function phoneOf(s) {
    var d = digits(s);
    if (d.indexOf('82') === 0 && d.length >= 11) d = '0' + d.slice(2);
    if (/^1[016789]\d{7,8}$/.test(d)) d = '0' + d;
    if (!/^01[016789]\d{7,8}$/.test(d)) return null;
    return d.length === 11 ? d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7) : d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  }
  // 세트는 '세트'라는 말로만 판단한다. 단품 맛이 둘 이상 적혀 있으면 사람이 확인하게 남긴다.
  function productOf(s) {
    var t = String(s || '').toLowerCase();
    if (t.indexOf('세트') >= 0 || t.indexOf('set') >= 0) return PRODUCTS[3];
    var hits = PRODUCTS.slice(0, 3).filter(function (p) {
      return p.keys.some(function (k) { return t.indexOf(k) >= 0; });
    });
    return hits.length === 1 ? hits[0] : null;
  }
  function validYmd(y, m, d) {
    var x = new Date(y, m - 1, d);
    return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d ? y + '-' + pad(m) + '-' + pad(d) : null;
  }
  // 연도가 없는 날짜("10월 27일")는 파일 안 다른 날짜의 연도, 없으면 올해로 본다.
  function dateOf(s, year, date1904) {
    if (typeof s === 'number' && isFinite(s)) {
      var d = new Date(Math.round((s - 25569 + (date1904 ? 1462 : 0)) * 864e5));
      return validYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    var t = String(s || ''), m;
    if ((m = t.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/))) return validYmd(+m[1], +m[2], +m[3]);
    if ((m = t.match(/(\d{1,2})월\s*(\d{1,2})일/))) return validYmd(year || new Date().getFullYear(), +m[1], +m[2]);
    return null;
  }
  // 수량: 양의 정수만("2", "2개"). 금액: 0 이상 정수만("19,600원", 19600). 그 밖은 확인 필요.
  function qtyOf(v) {
    if (typeof v === 'number') return v > 0 && Math.floor(v) === v ? v : null;
    var m = String(v || '').trim().match(/^(\d{1,4})\s*개?$/);
    return m && +m[1] > 0 ? +m[1] : null;
  }
  function amountOf(v) {
    if (typeof v === 'number') return isFinite(v) && v >= 0 && Math.floor(v) === v ? v : null;
    var m = String(v || '').trim().match(/^(\d{1,3}(,\d{3})*|\d+)\s*원?$/);
    return m ? +m[1].replace(/,/g, '') : null;
  }

  var MAP = {
    A: { no: '주문번호', date: '주문일시', item: '상품명', opt: '옵션', qty: '수량', amt: '결제금액', name: '수취인', phone: '연락처', addr: '배송지' },
    B: { no: '주문ID', date: '주문일', item: '상품명', qty: '구매수량', amt: '판매가', name: '받는분', phone: '전화', addr: '주소' },
    C: { no: '번호', date: '날짜', item: '품목', qty: '개수', amt: '금액', name: '고객명', phone: '핸드폰', addr: '주소', status: '상태' }
  };

  // 필요한 칸이 전부 있어야 그 쇼핑몰 형식으로 본다.
  function detect(header) {
    var h = (header || []).map(function (x) { return String(x == null ? '' : x).trim(); });
    for (var ch in MAP) {
      var m = MAP[ch], ok = Object.keys(m).every(function (k) { return h.indexOf(m[k]) >= 0; });
      if (ok) return ch;
    }
    return null;
  }

  // files: [{ fileName, rows, date1904 }], fixes: { 줄키: 상품id } 사람이 직접 고른 상품
  function process(files, fixes) {
    fixes = fixes || {};
    var out = [], st = { raw: 0, blank: 0, dup: 0, cancel: 0, phone: 0, item: 0, amount: 0, addr: 0, check: 0, manual: 0 }, used = {};
    files.forEach(function (f) {
      var ch = detect(f.rows[0]);
      if (!ch || used[ch]) return;
      used[ch] = 1;
      var head = f.rows[0].map(function (x) { return String(x == null ? '' : x).trim(); }), m = MAP[ch];
      var col = {}; Object.keys(m).forEach(function (k) { col[k] = head.indexOf(m[k]); });
      var year = null, seen = {};
      f.rows.slice(1).some(function (row) { var t = String(row[col.date] || '').match(/(\d{4})[.\-\/]/); if (t) { year = +t[1]; return true; } return false; });
      f.rows.slice(1).forEach(function (row, idx) {
        st.raw++;
        var g = function (k) { return col[k] >= 0 && row[col[k]] != null ? row[col[k]] : ''; };
        if (row.every(function (v) { return String(v == null ? '' : v).trim() === ''; })) { st.blank++; return; }
        if (String(g('status')).indexOf('취소') >= 0) { st.cancel++; return; }
        // 완전히 같은 줄만 중복으로 본다(같은 주문번호에 상품이 여러 줄인 경우는 살린다)
        var sig = JSON.stringify(row.map(function (v) { return String(v == null ? '' : v).trim(); }));
        if (seen[sig]) { st.dup++; return; }
        seen[sig] = 1;
        var key = ch + ':' + (idx + 2), fix = [], check = [];
        var no = String(g('no')).trim();
        if (!no) check.push('주문번호 없음');
        else if (ch === 'C') no = 'C-' + pad(no, 4);
        var rawItem = (String(g('item')) + (g('opt') !== '' ? ' ' + g('opt') : '')).trim();
        var p = fixes[key] ? PRODUCTS.filter(function (x) { return x.id === fixes[key]; })[0] : productOf(rawItem);
        if (fixes[key]) { st.manual++; fix.push('직접 고름'); }
        else if (!p) check.push('상품');
        else if (rawItem !== p.name) { st.item++; fix.push('상품명'); }
        var qty = qtyOf(g('qty')); if (qty == null) check.push('수량');
        var amt = amountOf(g('amt'));
        if (amt == null) check.push('금액');
        else if (typeof g('amt') !== 'number') { st.amount++; fix.push('금액'); }
        var date = dateOf(g('date'), year, f.date1904); if (!date) check.push('날짜');
        var ph = phoneOf(g('phone'));
        if (!ph) check.push('전화번호');
        else if (String(g('phone')) !== ph) { st.phone++; fix.push('전화번호'); }
        var rawAddr = String(g('addr')), addr = rawAddr.replace(/\s+/g, ' ').trim();
        if (!addr) check.push('주소');
        else if (addr !== rawAddr) { st.addr++; fix.push('주소 공백'); }
        var name = String(g('name')).trim(); if (!name) check.push('받는 분');
        if (check.length) st.check++;
        out.push({ key: key, ch: ch, chName: CHANNELS[ch].name, no: no || '(없음)', date: date || String(g('date')), product: p ? p.name : rawItem, pid: p ? p.id : null,
          qty: qty || 0, amount: amt || 0, name: name, phone: ph || String(g('phone')), addr: addr, fix: fix, check: check,
          raw: { item: rawItem, phone: String(g('phone')), amt: String(g('amt')), addr: rawAddr, date: String(g('date')) } });
      });
    });
    out.sort(function (a, b) { return (a.date + a.ch + a.no).localeCompare(b.date + b.ch + b.no); });
    var ok = out.filter(function (o) { return !o.check.length; }); // 확인할 줄은 합계·발송에서 뺀다

    var byProduct = PRODUCTS.map(function (p) {
      var q = 0, s = 0; ok.forEach(function (o) { if (o.pid === p.id) { q += o.qty; s += o.amount; } });
      return { name: p.name, qty: q, sales: s };
    });
    var settle = Object.keys(CHANNELS).filter(function (k) { return used[k]; }).map(function (k) {
      var c = CHANNELS[k], nos = {}, s = 0; ok.forEach(function (o) { if (o.ch === k) { nos[o.no] = 1; s += o.amount; } });
      var fee = Math.round(s * c.fee);
      return { name: c.name, orders: Object.keys(nos).length, sales: s, rate: c.fee, fee: fee, net: s - fee };
    });
    var groups = {}, ship = [];
    ok.forEach(function (o) {
      var k = o.name + '|' + digits(o.phone) + '|' + o.addr.replace(/\s/g, '');
      if (!groups[k]) { groups[k] = { name: o.name, phone: o.phone, addr: o.addr, items: {}, orders: [], chs: {} }; ship.push(groups[k]); }
      var g = groups[k]; g.items[o.product] = (g.items[o.product] || 0) + o.qty;
      if (g.orders.indexOf(o.no) < 0) g.orders.push(o.no);
      g.chs[o.chName] = 1;
    });
    ship.forEach(function (g) {
      g.summary = Object.keys(g.items).map(function (k) { return k.replace(' 250g', '') + ' ' + g.items[k]; }).join(', ');
      g.merged = g.orders.length > 1;
    });
    st.merged = ship.filter(function (g) { return g.merged; }).length;
    st.orders = ok.length;
    return { orders: out, byProduct: byProduct, settle: settle, ship: ship, stats: st };
  }

  window.XDEMO = { PRODUCTS: PRODUCTS, CHANNELS: CHANNELS, makeSamples: makeSamples, process: process, detect: detect };
})();

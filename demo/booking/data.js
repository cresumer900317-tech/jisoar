// 시연용 데이터. 서버 없이 브라우저 저장소(localStorage)에만 저장한다.
// 손님 화면(index.html)과 관리자 화면(admin.html)이 같은 키를 함께 쓴다.
(function () {
  var KEY = 'ohu-demo-v1';

  var CLASSES = [
    { id: 'cup', name: '물레로 만드는 나만의 컵', short: '물레 컵', mins: 120, price: 55000, cap: 6,
      desc: '물레를 돌려 손잡이 있는 컵 하나를 만듭니다. 처음이어도 괜찮습니다.', img: 'img/cup.jpg' },
    { id: 'vase', name: '손으로 빚는 작은 화병', short: '핸드빌딩 화병', mins: 120, price: 45000, cap: 6,
      desc: '흙을 말아 올려 한 뼘 크기 화병을 빚습니다.', img: 'img/vase.jpg' },
    { id: 'plate', name: '나만의 접시 만들기', short: '접시', mins: 90, price: 40000, cap: 8,
      desc: '판을 밀어 지름 20cm 접시를 만들고 무늬를 넣습니다.', img: 'img/plate.jpg' }
  ];
  var TIMES = ['10:00', '13:00', '16:00', '19:00'];
  var STATUSES = ['확정', '방문완료', '취소', '노쇼'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isClosed(d) { return d.getDay() === 1; } // 월요일 휴무
  var WD = ['일', '월', '화', '수', '목', '금', '토'];

  function cls(id) { for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].id === id) return CLASSES[i]; return null; }

  // 예시 예약: 날마다 같은 결과가 나오도록 날짜로 시드를 잡는다.
  var LAST = '김이박최정강조윤장임한오서신권황안송류홍';
  var FIRST = ['민지', '서연', '지훈', '하늘', '도윤', '수현', '예린', '준호', '다은', '태희',
    '지민', '서준', '유진', '채원', '현우', '은비', '시우', '나연', '건우', '소율'];
  var MEMOS = ['', '', '', '', '친구와 같이 갑니다', '왼손잡이입니다', '조금 늦을 수 있어요', '선물용으로 만들고 싶어요', '아이와 함께 갑니다(초6)'];

  function rng(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  }

  function seed() {
    var list = [], t = today(), counter = {};
    for (var off = -4; off <= 13; off++) {
      var d = addDays(t, off);
      if (isClosed(d)) continue;
      var day = ymd(d), r = rng(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate());
      var weekend = d.getDay() === 0 || d.getDay() === 6;
      TIMES.forEach(function (time) {
        CLASSES.forEach(function (c) {
          var fill = weekend ? 0.75 : 0.4;
          if (off > 7) fill *= 0.5;
          var left = c.cap;
          while (left > 0 && r() < fill) {
            var people = Math.min(left, r() < 0.6 ? 1 : (r() < 0.7 ? 2 : 3));
            left -= people;
            var st = '확정';
            if (off < 0 || (off === 0 && +time.slice(0, 2) < new Date().getHours())) { var x = r(); st = x < 0.82 ? '방문완료' : (x < 0.92 ? '취소' : '노쇼'); }
            else if (r() < 0.06) st = '취소';
            var key = day.slice(5).replace('-', '');
            counter[key] = (counter[key] || 0) + 1;
            list.push({
              id: 'OH' + key + '-' + String(counter[key]).padStart(3, '0'),
              classId: c.id, date: day, time: time,
              name: LAST[Math.floor(r() * LAST.length)] + FIRST[Math.floor(r() * FIRST.length)],
              phone: '010-****-' + String(1000 + Math.floor(r() * 9000)),
              people: people, memo: MEMOS[Math.floor(r() * MEMOS.length)],
              status: st, note: '', createdAt: addDays(d, -1 - Math.floor(r() * 10)).toISOString(), source: 'seed'
            });
            fill *= 0.85;
          }
        });
      });
    }
    return { seededFor: ymd(t), bookings: list };
  }

  function load() {
    var db = null;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !Array.isArray(db.bookings)) { db = seed(); save(db); }
    else if (db.seededFor !== ymd(today())) {
      // 하루가 지나면 예시 예약만 새 날짜 기준으로 다시 만들고, 손님이 넣은 예약은 그대로 둔다
      var web = db.bookings.filter(function (b) { return b.source === 'web'; });
      var fresh = seed(); fresh.bookings = fresh.bookings.concat(web);
      db = fresh; save(db);
    }
    return db;
  }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 시크릿 창 등 */ } }
  function reset() { var db = seed(); save(db); return db; }

  function used(db, date, time, classId) {
    var n = 0;
    db.bookings.forEach(function (b) {
      if (b.date === date && b.time === time && b.classId === classId && b.status !== '취소') n += b.people;
    });
    return n;
  }

  function add(db, b) {
    var key = b.date.slice(5).replace('-', ''), max = 0;
    db.bookings.forEach(function (x) {
      if (x.id.indexOf('OH' + key + '-') === 0) max = Math.max(max, parseInt(x.id.split('-')[1], 10));
    });
    b.id = 'OH' + key + '-' + String(max + 1).padStart(3, '0');
    b.status = '확정'; b.note = ''; b.createdAt = new Date().toISOString(); b.source = 'web';
    db.bookings.push(b); save(db);
    return b;
  }

  // 엑셀이 수식으로 읽지 않도록 =, +, -, @ 로 시작하는 글자 앞에 ' 를 붙인다
  function cell(v) {
    var s = String(v == null ? '' : v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function won(n) { return n.toLocaleString('ko-KR') + '원'; }

  window.OHU = {
    KEY: KEY, CLASSES: CLASSES, TIMES: TIMES, STATUSES: STATUSES, WD: WD,
    ymd: ymd, parse: parse, addDays: addDays, today: today, isClosed: isClosed, cls: cls,
    load: load, save: save, cell: cell, reset: reset, used: used, add: add, won: won
  };
})();

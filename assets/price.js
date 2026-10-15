/* 서비스 페이지 업무 시스템 가격 계산기. 단가(만원)는 HTML의 value 에 있다. */
(() => {
  const f = document.getElementById('calc');
  if (!f) return;
  const $ = (id) => document.getElementById(id);
  const won = (n) => n.toLocaleString('ko-KR');
  const scr = $('c-scr');

  function calc() {
    let total = 100;
    let from = false;
    const items = ['기본 틀 100만원'];

    const role = f.querySelector('input[name="role"]:checked');
    if (role && +role.value) {
      total += +role.value;
      items.push(`${role.dataset.name} ${role.value}만원`);
    }

    const n = Math.max(1, Math.min(20, parseInt(scr.value, 10) || 1));
    total += n * +scr.dataset.unit;
    items.push(`데이터 관리 화면 ${n}종 ${n * +scr.dataset.unit}만원`);

    f.querySelectorAll('input[type="checkbox"]:checked').forEach((c) => {
      total += +c.value;
      if (c.dataset.from) from = true;
      items.push(`${c.dataset.name} ${c.value}만원${c.dataset.from ? '부터' : ''}`);
    });

    $('c-total').textContent = won(total);
    $('c-from').hidden = !from;
    $('c-vat').textContent = `부가세 포함 ${won(Math.round(total * 11) / 10)}만원${from ? '부터' : ''}`;
    $('c-note').hidden = !from;

    const body = `[가격 계산기 구성]\n${items.join('\n')}\n합계 ${won(total)}만원${from ? '부터' : ''} (부가세 별도)\n\n만들고 싶은 것:\n`;
    $('c-mail').href = 'mailto:hello@jisoar.com?subject=' + encodeURIComponent('[jisoar] 업무 시스템 문의') +
      '&body=' + encodeURIComponent(body);
  }

  f.addEventListener('input', calc);
  f.addEventListener('change', calc);
  // 입력을 마치면 화면에 보이는 값도 계산에 쓴 값(1~20 정수)으로 맞춘다
  scr.addEventListener('change', () => {
    scr.value = Math.max(1, Math.min(20, parseInt(scr.value, 10) || 1));
    calc();
  });
  f.addEventListener('submit', (e) => e.preventDefault());
  calc();
})();

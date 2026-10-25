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

    const costs = '월 유지보수 선택: 월 15만원 (부가세 별도).' + (from ? ' 자동 수집 운영: 수집처 1곳당 월 30만원 추가 (부가세 별도).' : '') + '\n외부 비용은 실비 별도. 납품 후 3개월 무상 하자보수는 유지보수 가입과 별개. 착수 50%, 납품 후 50%.';
    const body = `[가격 계산기 구성]\n${items.join('\n')}\n합계 ${won(total)}만원${from ? '부터' : ''} (부가세 별도)\n\n[운영 비용 안내]\n${costs}\n\n만들고 싶은 것:\n`;
    $('c-mail').href = 'mailto:hello@jisoar.com?subject=' + encodeURIComponent('[jisoar] 업무 시스템 문의') +
      '&body=' + encodeURIComponent(body);
  }

  const presets = {
    basic: { role: '0', screens: 1, features: [] },
    team: { role: '30', screens: 1, features: ['excel'] },
    orders: { role: '30', screens: 2, features: ['excel', 'settlement', 'stats'] },
  };
  const presetButtons = $('calc-presets');
  presetButtons.hidden = false;
  presetButtons.addEventListener('click', event => {
    const button = event.target.closest('[data-preset]');
    const preset = presets[button?.dataset.preset];
    if (!preset) return;
    f.reset();
    scr.value = preset.screens;
    f.querySelector(`input[name="role"][value="${preset.role}"]`).checked = true;
    preset.features.forEach(feature => { f.querySelector(`[data-feature="${feature}"]`).checked = true; });
    calc();
    $('preset-status').textContent = button.textContent + ' 구성을 적용했습니다. 필요한 기능을 바꿔 보세요.';
  });
  f.addEventListener('input', () => { $('preset-status').textContent = '직접 변경한 구성입니다.'; });
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

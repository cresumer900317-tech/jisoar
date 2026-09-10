'use strict';
(() => {
  const bar = document.getElementById('bar');
  const updateBar = () => bar?.classList.toggle('scrolled', window.scrollY > 16);
  updateBar();
  window.addEventListener('scroll', updateBar, {passive:true});
  document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
  const form = document.getElementById('project-brief');
  if (!form) return;
  const output = document.getElementById('brief-result');
  const status = document.getElementById('brief-status');
  const text = document.getElementById('brief-text');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const goal = form.elements.namedItem('goal');
    if (!goal.value.trim()) { goal.setCustomValidity('해결하고 싶은 문제를 입력해 주세요.'); goal.reportValidity(); return; }
    const data = new FormData(form);
    const body = ['[JISOAR 프로젝트 문의]', '', '제작 분야: ' + data.get('service'), '해결하고 싶은 문제: ' + data.get('goal'), '희망 일정: ' + (data.get('schedule') || '상담 후 결정'), '예산 범위: ' + (data.get('budget') || '상담 후 결정'), '참고 링크: ' + (data.get('reference') || '없음')].join('\n');
    text.value = body;
    const email = document.getElementById('brief-email');
    const subject = 'mailto:hello@jisoar.com?subject=' + encodeURIComponent('[JISOAR] ' + data.get('service') + ' 문의');
    const mailto = subject + '&body=' + encodeURIComponent(body);
    const longMessage = mailto.length > 1800;
    email.href = longMessage ? subject : mailto;
    output.hidden = false;
    status.textContent = longMessage
      ? '초안이 길어 이메일에 자동 입력하지 않습니다. 아래 내용을 복사한 뒤 이메일 또는 카카오톡에 붙여넣어 주세요.'
      : '문의 초안을 만들었습니다. 내용을 확인한 뒤 이메일이나 카카오톡으로 보내주세요.';
    text.focus();
  });
  form.addEventListener('input', () => { form.elements.namedItem('goal').setCustomValidity(''); output.hidden = true; status.textContent = ''; });
  document.getElementById('brief-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text.value); status.textContent = '복사했습니다. 카카오톡 대화창에 붙여넣어 주세요.'; }
    catch { text.focus(); text.select(); status.textContent = '자동 복사를 사용할 수 없습니다. 선택된 내용을 직접 복사해 주세요.'; }
  });
})();

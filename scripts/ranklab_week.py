"""RANKLAB 성적을 홈과 /ranklab/ 에 넣는다. 주 1회 실행: python -X utf8 scripts/ranklab_week.py

msim-dash KV 'dash' 를 wrangler 로 읽어(이 PC wrangler 로그인 필요) Claude·Codex 계좌 3개씩의
평가액 합계를 시작 금액 합계와 비교한 수익률을 구한다. 둘이 함께 판단하는 team 계좌는 넣지 않는다.
보유 종목·매매 내역은 쓰지 않는다. 주간 기록은 scripts/ranklab_weeks.json 에 쌓인다.
"""
import json, re, subprocess, sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEKS = ROOT / 'scripts' / 'ranklab_weeks.json'
KV_NS = '9634c7adfd14445682bb9447c76120ea'
START = date(2026, 10, 14)   # 첫 계좌 시작일
SIDES = {'claude': 'Claude', 'codex': 'Codex'}

def load_state():
    if len(sys.argv) > 1:   # 저장해 둔 dash.json 으로 실행할 때
        return json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    out = subprocess.run(f'npx wrangler kv key get dash --namespace-id {KV_NS} --remote',
                         shell=True, capture_output=True, text=True, encoding='utf-8')
    if out.returncode: raise SystemExit(out.stderr[-2000:])
    return json.loads(out.stdout)

def totals(d):
    res = {}
    for side in SIDES:
        eq = [a['equity'] for k, a in d['accounts'].items() if k.startswith(side + '_') and a.get('equity') is not None]
        if len(eq) != 3: raise SystemExit(f'{side} 계좌가 3개가 아님: {len(eq)}')
        res[side] = round((sum(eq) / (d['capital'] * len(eq)) - 1) * 100, 2)   # 평가액 합 ÷ 시작 금액 합
    return res

def pct(v): return f'{v:+.2f}%'.replace('+0.00%', '0.00%')

def put(text, key, value):
    pat = re.compile(rf'(<!--rl:{key}-->).*?(<!--/rl:{key}-->)', re.S)
    if not pat.search(text): raise SystemExit(f'표시 자리 없음: {key}')
    return pat.sub(lambda m: m.group(1) + value + m.group(2), text)

def main():
    d = load_state()
    asof = datetime.fromisoformat(d['updated_kst']).date()
    t = totals(d)
    weeks = json.loads(WEEKS.read_text(encoding='utf-8')) if WEEKS.exists() else []
    n = (asof - START).days // 7 + 1
    row = {'week': n, 'asof': asof.isoformat(), **t}
    weeks = [w for w in weeks if w['week'] != n] + [row]
    weeks.sort(key=lambda w: w['week'])
    WEEKS.write_text(json.dumps(weeks, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    label = f'계좌당 1,000만 원 · {START.year}년 {START.month}월 {START.day}일 시작 · {asof.month}월 {asof.day}일 기준'
    rows = []
    for w in reversed(weeks):
        a = date.fromisoformat(w['asof'])
        lead = ('<span class="lead-c">Claude</span>' if w['claude'] > w['codex'] else
                '<span class="lead-x">Codex</span>' if w['codex'] > w['claude'] else '같음')
        rows.append(f'<tr><td>{w["week"]}주차</td><td>{a.month}월 {a.day}일</td><td class="n">{pct(w["claude"])}</td><td class="n">{pct(w["codex"])}</td><td>{lead}</td></tr>')
    for rel in ('index.html', 'ranklab/index.html'):
        p = ROOT / rel; s = p.read_text(encoding='utf-8')
        s = put(s, 'claude', pct(t['claude'])); s = put(s, 'codex', pct(t['codex'])); s = put(s, 'asof', label)
        if '<!--rl:weeks-->' in s: s = put(s, 'weeks', '\n' + '\n'.join(rows) + '\n')
        p.write_text(s, encoding='utf-8')
    print(f'{n}주차 {asof}: Claude {pct(t["claude"])} / Codex {pct(t["codex"])}')

if __name__ == '__main__': main()

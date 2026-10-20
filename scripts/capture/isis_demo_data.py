"""사이트 캡처용: 로컬에 띄운 이시스(127.0.0.1:8000)에 가짜 광고를 채운다.

이시스 코드는 건드리지 않고 HTTP API 만 쓴다(이시스 저장소의 dev_seed 로 만든 로컬 DB 전제).
실제 고객 데이터는 쓰지 않는다. 상품·몰·순위는 전부 지어낸 예시.

  python -X utf8 scripts/capture/isis_demo_data.py
"""
import http.cookiejar
import json
import random
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

API = "http://127.0.0.1:8000"
WORKER = {"X-Worker-Key": "dev-worker", "Content-Type": "application/json"}

# (광고주, 키워드, 상품명, 몰, 순위 또는 None=범위 밖, 수량)
ADS = [
    ("adv1", "블루투스 스피커", "디젤트 블루투스 스피커 USB C타입", "정진몰", 18, 2),
    ("adv1", "에어프라이어", "보라 에어프라이어 5.5L 대용량", "올리다몰", 47, 1),
    ("adv2", "텀블러", "대용량 텀블러 손잡이 스텐 900ml", "리빙샵", 7, 3),
    ("adv2", "캠핑의자", "초경량 캠핑의자 릴렉스 체어", "아웃도어몰", 23, 1),
    ("adv1", "고양이 장난감", "쥐돌이 낚싯대 고양이 장난감 세트", "냥상점", 11, 1),
    ("adv2", "보리굴비", "파인밀 보리굴비 10미 선물세트", "파인밀", 5, 2),
    ("adv1", "무선 청소기", "코드리스 무선 청소기 V12", "클린가전", 32, 1),
    ("adv2", "여성 가디건", "울 니트 가디건 루즈핏", "모노클로젯", 64, 1),
    ("adv1", "강아지 사료", "그레인프리 강아지 사료 6kg", "펫마켓", 9, 2),
    ("adv2", "원목 선반", "원목 창틀 선반 판자 80cm", "우드하우스", None, 1),
    ("adv1", "차량용 방향제", "차량용 송풍구 방향제 우드", "카라이프", 15, 1),
    ("adv2", "수납 바구니", "라탄 수납 바구니 대형", "홈데코", 28, 1),
    ("adv1", "주방 저울", "디지털 주방 저울 0.1g", "쿡앤", 3, 1),
    ("adv2", "등산 양말", "쿨맥스 등산 양말 5켤레", "트레킹샵", 41, 1),
    ("adv1", "LED 스탠드", "눈편한 LED 스탠드 무선", "라이트룸", 12, 2),
    ("adv2", "요가 매트", "TPE 요가 매트 8mm", "핏라이프", 19, 1),
    ("adv1", "실리콘 도마", "항균 실리콘 도마 2종", "쿡앤", 56, 1),
    ("adv2", "가습기", "초음파 미니 가습기 3L", "에어홈", None, 1),
]

jar = http.cookiejar.CookieJar()
web = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def call(method, path, body=None, headers=None, opener=None):
    req = urllib.request.Request(API + path, method=method, headers=headers or {"Content-Type": "application/json", "X-RL": "1"},
                                 data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None)
    try:
        with (opener or web).open(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} → {e.code} {e.read().decode(errors='ignore')[:300]}")


call("POST", "/api/auth/login", {"login_id": "root", "password": "admin1234"})
today = date.today()
rows = []
for i, (owner, kw, *_rest) in enumerate(ADS):
    start = today - timedelta(days=3 + i)
    days = 30
    rows.append({"owner_login": owner, "keyword": kw, "url": f"https://smartstore.naver.com/demo/products/{9100000000 + i * 7919}",
                 "qty": ADS[i][5], "days": days, "start_date": start.isoformat(),
                 "end_date": (start + timedelta(days=days - 1)).isoformat()})
res = call("POST", "/api/slots/bulk", {"rows": rows, "range_max": 1000})
print("bulk:", {k: v for k, v in res.items() if k != "created"} if isinstance(res, dict) else res)

# 가짜 수집기: 쌓인 조회 작업에 지어낸 결과를 돌려준다
by_kw = {a[1]: a for a in ADS}
random.seed(7)
plain = urllib.request.build_opener()
n = 0
while True:
    job = call("GET", "/api/worker/claim", headers=WORKER, opener=plain)
    if not job:
        break
    a = by_kw.get(job.get("keyword"), ("", job.get("keyword"), "예시 상품", "예시몰", 20, 1))
    rank = a[4]
    if job.get("kind") == "daily":
        result = {"results": [{"key": t["key"], "found": bool(rank), "rank": rank, "title": a[2], "mall": a[3]} for t in job["targets"]],
                  "rangeMax": 1000, "searchedPages": 13}
    else:
        result = {"name": a[2], "pid": job.get("pid"), "nvMid": str(87000000000 + n), "mall": a[3],
                  "price": random.randint(9, 89) * 1000, "review": random.randint(12, 2400),
                  "found": bool(rank), "rank": rank, "rangeMax": 1000, "searchedPages": 13 if not rank else 1 + (rank or 0) // 80}
    call("POST", "/api/worker/result", {"id": job["id"], "ok": True, "result": result}, headers=WORKER, opener=plain)
    n += 1
print("worker results:", n)

# 제품 화면 다시 찍기

사이트에 쓰는 제품 화면을 최신 UI로 다시 찍는 도구입니다. 결과는 `assets/work/live/`에 저장됩니다.

## 이시스(Toprise) 화면

실제 고객 데이터는 쓰지 않습니다. 이시스 저장소(`../ranklab`)를 로컬에서 가짜 데이터로 띄워 찍습니다.
이시스 코드는 고치지 않고, 이시스 저장소에 있는 개발용 도구와 HTTP API만 씁니다.

1. 로컬 DB: `cd ../ranklab/tools/pgtest && node start.mjs`
2. 기본 예시 데이터: `cd ../ranklab/api && DATABASE_URL=postgresql://postgres:test@127.0.0.1:54329/ranklab_dev ../.venv/Scripts/python -m scripts.dev_seed`
3. API: 같은 폴더에서 `DATABASE_URL=… COOKIE_SECURE=0 WORKER_TOKEN=dev-worker ../.venv/Scripts/python -m uvicorn app.main:app --port 8000`
4. 화면: `cd ../ranklab/web && npx vite --port 5173`
5. 가짜 광고 채우기: `python -X utf8 scripts/capture/isis_demo_data.py`
6. 찍기: `node scripts/capture/capture.mjs isis`

왼쪽 메뉴(서비스 이름·계정 정보)는 잘라 내고 본문만 찍습니다. 폰 화면은 통째로 찍습니다.

## RANKLAB 화면

대시보드는 로그인이 필요해서 아직 자동으로 찍지 않습니다. 방법을 정한 뒤 `capture.mjs`의 `ranklab` 항목을 씁니다.

## 준비물

- Edge(설치된 것 사용), playwright(`../ranklab-collector/node_modules` 것을 빌려 씀. 다른 곳이면 `PW_DIR`).

# JISOAR 로고 작업 인계 (2026-10-14, mac → home)

## 확정된 것
- 상호 표기 JISOAR, 컨셉 JI = 志(뜻 지) + SOAR, 모토 "상상한 것을 구현한다"
- 색: Night #101A33(주), Sky #3366E8(강조), 바탕 Dawn Paper #F7F5F0 (Sunrise #F2A541 은 로고에 안 씀)
- 구조: 심볼 + 워드마크(사용자가 스타일 B 선택), A 는 반드시 가로획 있는 A(Λ 금지)
- 사용자 선호 방향(18:23): 굵은 남색 J + 파란 상승 획/날개 (bakeoff_board.jpg 의 GPT Image 2.5·Nano Banana Pro 열)

## 현재 후보 (round3, 참고 이미지 기반 32장)
- 내 추천·Codex(0ca268cd, 이미지 직접 열람) 1위 R2_1(각진 J + 파란 날개 2장), 2위 R3_6, 3위 R2_3
- 사용자가 R3_5(새/불사조 J)도 괜찮다고 함 → 내 의견: 새 머리·부리 너무 직접적, 16px 무너짐, A 이상 → 비추천
- 사용자에게 남긴 선택지: A) R2_1 확정 → 벡터 정본 / B) R3_5 곡선 날개 + 새 머리 없는 J 절충안 10장 더 → R2_1 과 비교
- R2_1 정본 시 고칠 점: J 왼쪽 아래 발 줄이기, 날개 2장 각도·곡률·간격 통일(JF/J= 로 안 읽히게 끝 둥글게), 16px용 아이콘 별도, 2색 단색, 자간 보정

## 지나온 길(반려된 것)
폰트 끝처리 워드마크 → "그냥 폰트" / 사선 워드마크 → "유행적" / 志 도장·3단 사각 → "세련미 없음" / 점+호 J → "점점 구려짐" / Ideogram 가는 워드마크(O 안 수평선) → 사용자 반응 없이 굵은 J 방향 선택
교훈: 의미를 그림으로 직접 지시하면 촌스러움, 참고 이미지 넣으면 품질↑, 모델은 GPT Image 2(구) 대신 2.5·Nano Banana Pro·Ideogram 비교 필요.

## 도구
- Higgsfield CLI(로그인 필요), 1장 비용: GPT Image 2 medium 1k ≈1, high 2k ≈16, 2.5/NBP/Ideogram 2k ≈3~4
- 생성 스크립트: round3/gen.py (참고 이미지 경로는 bakeoff/out — 원본 PNG 는 맥에만 있으므로 home 에서는 handoff JPG 를 --image-references 로 쓰면 됨)
- Codex 검토: bridge.py submit --project jisoar (이미지 경로 주면 Codex 가 직접 열어 봄)
- 사이트 적용은 로고 확정 후. 사례 5개 이름·실명 제거 원칙은 메모리 jisoar-rebrand-2026-10 참고

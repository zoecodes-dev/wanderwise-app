# WanderWise Frontend — 프로젝트 컨텍스트

## 앱 컨셉
"Designed Serendipity" 여행 앱. 목적지 이름을 도착 전까지 숨기고, 무드 선택 → 하루 동선(이름 숨김, 힌트·방향·시간만) → 도착 시 이름 공개(reveal). reveal 순간이 앱의 감정적 핵심.

## 이 레포
React Native / Expo 프론트엔드. 기존에 무드 선택 화면, 힌트/일정 화면이 있음.
백엔드(별도 레포 wanderwise-pipeline)의 일정 생성 API를 호출해 동선을 받아 표시한다.

## 백엔드 API
- 베이스 URL: `https://wanderwise-wanderwise.up.railway.app`  (Railway 배포 완료 — peaceful-enchantment/wanderwise)
  - 로컬 테스트 시: 시뮬레이터는 `http://localhost:8000`, 실기기는 맥의 LAN IP 또는 배포 URL 사용
- 핵심 엔드포인트: `POST /itinerary`

### 요청/응답 명세
<!-- api_plan.md 1번의 요청·응답 JSON 형태를 여기에 붙여넣기 -->


### 연결 시 핵심 규칙 (서버 설계와 일치시킬 것)
- **이름 숨김은 서버가 보장한다.** 응답의 `stops[]`에는 hint·direction·시간만 있고 가게 이름이 없다. 실명(`display_name`)·`reveal_text`·좌표는 `reveal` 블록에만 있다.
- **숨기는 건 "이름·정체"이지 "위치"가 아니다** (제품 결정, 2026-06-21). 길찾기 실효성 때문에 접근 단계에서 좌표는 보여준다:
  - 접근 화면 지도엔 목적지 **좌표(익명 `?` 핀) + 경로**를 표시하되, 앱 내 지도에 `showsPointsOfInterest={false}`로 상호(POI) 라벨을 꺼 이름이 새지 않게 한다. (애플/구글 지도 핸드오프는 상호를 자동 라벨링하므로 reveal 전엔 쓰지 않음)
  - **`display_name`·`reveal_text`는 도착 판정 전까지 렌더 금지.** 도착(GPS 반경 100m 또는 수동 버튼) 시에만 공개 연출 + "지도 앱으로 열기" 제공.
- `place_id`로 추후 상세 조회 가능.

## 작업 규칙
- API 키·시크릿은 프론트 코드에 절대 넣지 말 것. 프론트는 공개 백엔드 URL만 호출한다.
- 큰 변경 전엔 무엇을 왜 바꾸는지 먼저 설명할 것. 한 번에 한 화면씩.
- 변경 후 Expo에서 실제로 렌더되는지 확인하고 보고할 것. (완료 보고 전 실제 동작 확인)

## 다음 작업 (3일차)
무드 선택 화면 → POST /itinerary 호출 → 받은 동선을 일정 화면에 표시. 데이터가 끝까지 흐르는 것 먼저 확인. reveal 화면(4일차)은 그 다음.

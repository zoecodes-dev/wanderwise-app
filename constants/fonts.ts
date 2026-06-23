// 앱 전역 폰트 패밀리 토큰. assets/fonts 의 ttf 파일명과 일치해야 함.
// 로드는 app/_layout.tsx 의 useFonts 에서 한 번만.
export const F = {
  title: 'GowunBatang-Bold',     // 큰 제목 (고운바탕 Bold)
  body: 'GowunDodum-Regular',    // 본문·힌트 (고운돋움)
  label: 'Pretendard-Medium',    // 라벨·캡션·숫자
  labelBold: 'Pretendard-Bold',  // 강조 라벨
  num: 'Pretendard-Medium',      // 시각·순번 숫자
} as const;

// useFonts 에 넘길 맵 (require 는 _layout 에서 직접 — 메트로 정적 분석 때문에 인라인 필요)

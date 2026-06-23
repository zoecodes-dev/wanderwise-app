import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/constants/api';
import { F } from '@/constants/fonts';

// 밝은 배경 + 차콜 액센트 팔레트 (mood 화면과 통일)
const C = {
  bg: '#ecebf0',
  card: '#f6f5f9',
  cardBorder: '#dad8e2',
  line: '#cbc6d8',
  accent: '#3a3848',      // 차콜 — 노드/순번/카테고리/버튼 (보라 폐기)
  accentDeep: '#2d2b38',  // 스트립 숫자 (더 진한 차콜)
  title: '#2d2b38',
  bodyMuted: '#6a6878',
  label: '#a3a0b3',
  caption: '#9b99a8',
  meta: '#8b88a0',
  tap: '#2596a6',         // "탭하면 길안내" — 청록 포인트 (원복)
  // 점심(밥) 코드 — 따뜻한 톤 (밝은 배경용)
  lunchNode: '#c0603a',
  lunchCard: '#f8f1ec',
  lunchCardBorder: '#e6d6cc',
  lunchAccent: '#c0603a',
  lunchTime: '#bb9484',
  lunchHint: '#3a2a22',
  lunchMeta: '#a8826e',
};

// 끼니로 분류되는 카테고리 — 백엔드 _MEAL_CATEGORIES 와 일치
const FOOD_CATEGORIES = ['노포', '베이커리', '시장'];
const isLunch = (category?: string) => !!category && FOOD_CATEGORIES.includes(category);

const MODE_KO: Record<string, string> = { walk: '도보', transit: '대중교통', subway: '지하철', bus: '버스' };
const modeKo = (mode?: string) => (mode ? MODE_KO[mode] ?? '이동' : '이동');

// 카테고리별 색 포인트 — mood 아이콘 색과 같은 계열 (보라·초록 등)
const CATEGORY_COLOR: Record<string, string> = {
  카페: '#c07a4a',
  독립서점: '#4a8ac0',
  갤러리: '#b86fb0',
  전망: '#3d8a7d',
  시장: '#d8a020',
  공원: '#4d8a60',
  바: '#a85a6e',
  공방: '#7a6fb8',
  베이커리: '#cd5c84',
  노포: '#c0603a',
};
const catColor = (category?: string) => (category && CATEGORY_COLOR[category]) || '#6b5fa8';

// 응답에 시간대 라벨 필드가 없어 arrive_time(HH:MM)으로 직접 산출
const toMinutes = (hhmm?: string) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const timeLabel = (arrive?: string, lunch?: boolean) => {
  if (!arrive) return '';
  const t = toMinutes(arrive);
  if (t < 11 * 60) return '아침';
  if (t < 13 * 60 + 30) return lunch ? '점심' : '낮';
  if (t < 17 * 60) return '오후';
  return '저녁';
};

// mood 라벨 → 제목. 관형사형이 아닌 4개만 보정, 나머지는 `${mood} 하루`.
const MOOD_TITLE: Record<string, string> = {
  로맨틱: '로맨틱한 하루',
  호기심: '호기심 가득한 하루',
  현지인처럼: '현지인처럼 보내는 하루',
  여유롭게: '여유로운 하루',
};
const moodToTitle = (mood?: string) =>
  mood ? (MOOD_TITLE[mood] ?? `${mood} 하루`) : '오늘의 하루';

// 3분할 스트립의 '이동' 요약 — 전부 도보면 "도보", 교통 섞이면 "도보·교통"
const moveSummary = (stops: any[]) => {
  const modes = stops.slice(1).map((s) => s.transport?.mode);
  return modes.every((m) => !m || m === 'walk') ? '도보' : '도보·교통';
};

export default function ItineraryScreen() {
  const { mood } = useLocalSearchParams<{ mood: string }>();
  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocationAndFetch();
  }, []);

  const getLocationAndFetch = async () => {
    setLoading(true);
    setError(null);
    setItinerary(null);
    try {
      // 1. 위치 권한
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('위치 권한이 필요해요');
        return;
      }

      // 2. 현재 위치
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      // 3. 동선 생성 (POST /itinerary) — 이름 숨김은 서버가 보장(stops엔 reveal 없이 hint만)
      const response = await fetch(`${API_BASE_URL}/itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, lat, lng, stops: 4 }),
      });

      if (response.status === 404) {
        setError('이 근처엔 아직 추천이 없어요 😢');
        return;
      }
      if (!response.ok) {
        setError(`동선을 불러오지 못했어요 (${response.status})`);
        return;
      }

      const data = await response.json();
      if (!data?.stops?.length) {
        setError('이 근처엔 아직 추천이 없어요 😢');
        return;
      }
      setItinerary(data);
    } catch (e) {
      console.error('에러:', e);
      setError('동선을 가져올 수 없어요');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>오늘의 우연을 엮는 중...</Text>
        <Text style={styles.loadingHint}>동선을 그리는 데 15초쯤 걸려요</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={getLocationAndFetch}>
          <Text style={styles.buttonText}>다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>무드 다시 선택</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 헤더 — 에디토리얼 타이틀 */}
        <Text style={styles.headerLabel}>오늘의 동선</Text>
        <Text style={styles.headerTitle}>{moodToTitle(mood)}</Text>
        {itinerary.summary ? <Text style={styles.summary}>{itinerary.summary}</Text> : null}

        {/* 3분할 스트립: 들를 곳 · 시간 · 이동 */}
        <View style={styles.strip}>
          <View style={styles.stripCell}>
            <Text style={styles.stripNum}>{itinerary.stops.length}</Text>
            <Text style={styles.stripLabel}>들를 곳</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={[styles.stripCell, { flex: 1.4 }]}>
            <Text style={styles.stripNum}>
              {itinerary.stops[0]?.arrive_time}–{itinerary.stops[itinerary.stops.length - 1]?.depart_time}
            </Text>
            <Text style={styles.stripLabel}>시간</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripCell}>
            <Text style={styles.stripNum}>{moveSummary(itinerary.stops)}</Text>
            <Text style={styles.stripLabel}>이동</Text>
          </View>
        </View>

        {/* 타임라인 — 왼쪽 세로축 + 노드, 카드는 힌트 중심 */}
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {itinerary.stops.map((stop: any) => {
            const moved = stop.transport?.mode && stop.transport.mode !== 'start';
            const lunch = isLunch(stop.category);
            const accent = catColor(stop.category);
            return (
              <View key={stop.order}>
                {/* 카드 사이 이동 표시 (첫 스톱 위엔 없음) */}
                {moved ? (
                  <View style={styles.moveRow}>
                    <MaterialCommunityIcons name="walk" size={13} color={C.caption} />
                    <Text style={styles.moveText}>
                      {modeKo(stop.transport.mode)} {stop.transport.minutes}분
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.stop}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/stop', params: { stop: JSON.stringify(stop) } })}
                >
                  <View style={[styles.node, { backgroundColor: accent }]} />

                  <View style={styles.stopHeader}>
                    <Text style={[styles.order, { color: accent }]}>
                      {String(stop.order).padStart(2, '0')} · {timeLabel(stop.arrive_time, lunch)}
                    </Text>
                    <Text style={styles.time}>{stop.arrive_time}</Text>
                  </View>

                  {/* 시적 힌트가 주인공 — 이름·좌표는 도착 전까지 숨김 */}
                  <Text style={styles.hintText}>&ldquo;{stop.hint}&rdquo;</Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                      <Text style={[styles.category, { color: accent }]}>{stop.category}</Text>
                      {stop.neighborhood ? <Text style={styles.dot}>·</Text> : null}
                      {stop.neighborhood ? <Text style={styles.neighborhood}>{stop.neighborhood}</Text> : null}
                    </View>
                    <Text style={styles.tapHint}>탭하면 길안내 →</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={getLocationAndFetch}>
          <Text style={styles.buttonText}>다른 동선 보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>무드 다시 선택</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: F.body,
    color: C.accent,
    fontSize: 17,
    marginTop: 20,
  },
  loadingHint: {
    fontFamily: F.label,
    color: C.caption,
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    fontFamily: F.body,
    color: C.title,
    fontSize: 17,
    marginBottom: 20,
    textAlign: 'center',
  },
  headerLabel: {
    fontFamily: F.label,
    color: C.label,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: F.title,
    color: C.title,
    fontSize: 23,
    marginBottom: 12,
  },
  summary: {
    fontFamily: F.body,
    color: C.bodyMuted,
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 20,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stripDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: C.cardBorder,
  },
  stripNum: {
    fontFamily: F.num,
    fontSize: 16,
    fontWeight: '600',
    color: C.accentDeep,
    marginBottom: 3,
  },
  stripLabel: {
    fontFamily: F.label,
    fontSize: 10,
    color: C.caption,
  },
  // --- 타임라인 축 ---
  timeline: {
    position: 'relative',
    paddingLeft: 28,
    marginBottom: 18,
  },
  timelineLine: {
    position: 'absolute',
    left: 6,
    top: 24,
    bottom: 24,
    width: 1.5,
    backgroundColor: C.line,
  },
  node: {
    position: 'absolute',
    left: -28,
    top: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.accent,
    borderWidth: 2.5,
    borderColor: C.bg,
  },
  // --- 카드 사이 이동 표시 ---
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 2,
    paddingVertical: 9,
  },
  moveText: {
    fontFamily: F.label,
    fontSize: 11,
    color: C.caption,
  },
  // --- stop 카드 ---
  stop: {
    position: 'relative',
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 17,
    marginBottom: 6,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  order: {
    fontFamily: F.labelBold,
    fontSize: 11,
    letterSpacing: 1,
    color: C.accent,
  },
  time: {
    fontFamily: F.label,
    fontSize: 12,
    color: C.caption,
  },
  hintText: {
    fontFamily: F.body,
    fontSize: 15,
    color: C.title,
    lineHeight: 26,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  category: {
    fontFamily: F.label,
    fontSize: 11,
    fontWeight: '500',
    color: C.accent,
  },
  dot: {
    fontSize: 11,
    color: C.meta,
  },
  neighborhood: {
    fontFamily: F.label,
    fontSize: 11,
    color: C.meta,
  },
  tapHint: {
    fontFamily: F.label,
    fontSize: 11,
    color: C.tap,
  },
  button: {
    backgroundColor: C.accent,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 26,
    marginTop: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: F.label,
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  backButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: F.label,
    fontSize: 14,
    color: C.caption,
  },
});

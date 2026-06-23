import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Animated, Platform, Linking, Easing, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { PlaceReviews } from '@/components/place-reviews';
import { F } from '@/constants/fonts';

// 밝은 배경 + 차콜 버튼 + 카테고리 색 포인트 (mood·hint 화면과 통일)
const C = {
  bg: '#ecebf0',
  card: '#f6f5f9',
  cardBorder: '#dad8e2',
  title: '#2d2b38',
  body: '#4a4858',
  bodyMuted: '#6a6878',
  caption: '#9b99a8',
  meta: '#8b88a0',
  cta: '#3a3848',
  tap: '#2596a6',
};

// 카테고리별 색 포인트 — hint 화면과 동일 매핑
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

// 지도는 네이티브(실기기/시뮬레이터)에서만 — 웹은 react-native-maps 미지원
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

// 두 점을 모두 담는 지도 영역
function regionFor(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return {
    latitude: (a.lat + b.lat) / 2,
    longitude: (a.lng + b.lng) / 2,
    latitudeDelta: Math.max(Math.abs(a.lat - b.lat) * 2.2, 0.008),
    longitudeDelta: Math.max(Math.abs(a.lng - b.lng) * 2.2, 0.008),
  };
}

const ARRIVE_RADIUS_M = 100; // 이 거리 안에 들어오면 자동 도착 판정

// 두 좌표 사이 거리(m) — 하버사인
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function StopScreen() {
  const { stop: stopParam } = useLocalSearchParams<{ stop: string }>();
  const stop = useMemo(() => {
    try {
      return JSON.parse(stopParam ?? '{}');
    } catch {
      return {};
    }
  }, [stopParam]);

  const accent = catColor(stop.category);

  // reveal 좌표는 도착 판정(거리 계산)에만 쓰고, 도착 전까지 화면엔 안 그림
  const target =
    stop?.reveal && typeof stop.reveal.lat === 'number'
      ? { lat: stop.reveal.lat, lng: stop.reveal.lng }
      : null;

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const intro = useRef(new Animated.Value(0)).current; // reveal 등장 시퀀스 0→1

  // 위치 추적 → 목적지와의 거리 계산 → 반경 안이면 자동 reveal
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 4000 },
        (loc) => {
          const u = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLoc(u);
          if (target) {
            const d = distanceMeters(u, target);
            setDistance(d);
            if (d <= ARRIVE_RADIUS_M) setRevealed(true);
          }
        }
      );
    })();
    return () => sub?.remove();
  }, []);

  // 도착하면 단계적으로 펼쳐지는 reveal 시퀀스 (장식 → 이름 → 이야기 → 지도)
  useEffect(() => {
    if (revealed) {
      Animated.timing(intro, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [revealed]);

  // 한국은 네이버/카카오 지도 사용 (구글은 길찾기 막힘). 좌표로 경로 안내.
  // 도착 전엔 목적지명을 '목적지'로만 넘겨 이름 숨김 유지, 도착 후엔 실명으로.
  const openRoute = (provider: 'naver' | 'kakao') => {
    if (!target) return;
    const name = (revealed ? stop.reveal?.display_name : '목적지') || '목적지';
    const enc = encodeURIComponent(name);
    const kakaoWeb = `https://map.kakao.com/link/to/${enc},${target.lat},${target.lng}`;
    if (provider === 'kakao') {
      Linking.openURL(`kakaomap://route?ep=${target.lat},${target.lng}&by=PUBLICTRANSIT`).catch(() =>
        Linking.openURL(kakaoWeb)
      );
    } else {
      // nmap route: public=대중교통. 앱 미설치 시 카카오 웹으로 폴백(네이버 웹 길찾기 URL은 불안정)
      Linking.openURL(
        `nmap://route/public?dlat=${target.lat}&dlng=${target.lng}&dname=${enc}&appname=wanderwiseapp`
      ).catch(() => Linking.openURL(kakaoWeb));
    }
  };

  // 길찾기 버튼 — 밝은 안내 화면(light)과 다크 reveal 화면에서 대비가 달라 변형 분기
  const renderRoute = (dark: boolean) => (
    <View style={styles.routeRow}>
      <TouchableOpacity style={[styles.routeBtn, dark ? styles.naverBtnDark : styles.naverBtn]} onPress={() => openRoute('naver')}>
        <Text style={[styles.routeBtnText, dark ? styles.naverTextDark : styles.naverText]}>네이버 길찾기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.routeBtn, dark ? styles.kakaoBtnDark : styles.kakaoBtn]} onPress={() => openRoute('kakao')}>
        <Text style={[styles.routeBtnText, dark ? styles.kakaoTextDark : styles.kakaoText]}>카카오맵</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------- 도착 후: reveal ----------
  if (revealed) {
    // intro(0→1)를 구간별로 끊어 장식 → 이름 → 이야기 → 지도 순으로 등장
    const seg = (from: number, to: number) =>
      intro.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' });
    const rise = (from: number, to: number, dist = 20) =>
      intro.interpolate({ inputRange: [from, to], outputRange: [dist, 0], extrapolate: 'clamp' });

    const badgeStyle = { opacity: seg(0, 0.18) };
    const nameStyle = {
      opacity: seg(0.18, 0.5),
      transform: [{ translateY: rise(0.18, 0.5, 26) }, { scale: intro.interpolate({ inputRange: [0.18, 0.5], outputRange: [0.94, 1], extrapolate: 'clamp' }) }],
    };
    const subStyle = { opacity: seg(0.4, 0.62) };
    const storyStyle = { opacity: seg(0.55, 0.8), transform: [{ translateY: rise(0.55, 0.8, 16) }] };
    const restStyle = { opacity: seg(0.8, 1) };

    return (
      <View style={styles.revealContainer}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.revealScroll}>
          <Animated.Text style={[styles.revealBadge, badgeStyle]}>도착</Animated.Text>
          <Animated.Text style={[styles.revealName, nameStyle]}>{stop.reveal?.display_name}</Animated.Text>
          {(stop.neighborhood || stop.category) && (
            <Animated.Text style={[styles.revealSub, subStyle]}>
              {[stop.neighborhood, stop.category].filter(Boolean).join('  ·  ')}
            </Animated.Text>
          )}

          <Animated.View style={[styles.divider, storyStyle]} />
          <Animated.Text style={[styles.revealText, storyStyle]}>{stop.reveal?.reveal_text}</Animated.Text>

          <Animated.View style={[styles.revealRest, restStyle]}>
            <TouchableOpacity
              style={styles.recordBtn}
              onPress={() =>
                router.push({ pathname: '/review', params: { place_id: stop.place_id, name: stop.reveal?.display_name } })
              }
            >
              <Text style={styles.recordBtnText}>이곳을 기록하기</Text>
            </TouchableOpacity>

            <PlaceReviews placeId={stop.place_id} />

            {renderRoute(true)}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.revealBackText}>동선으로 돌아가기</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ---------- 도착 전: 안내 ----------
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.stopHeader}>
        <Text style={[styles.order, { color: accent, borderColor: accent }]}>{stop.order}</Text>
        <Text style={styles.time}>
          {stop.arrive_time} – {stop.depart_time}
        </Text>
      </View>

      {Platform.OS !== 'web' && MapView && userLoc && target ? (
        <MapView
          style={styles.map}
          showsPointsOfInterest={false} /* 상호(POI) 라벨 끔 → 위치는 보이되 이름은 안 샘 */
          showsUserLocation={false}
          region={regionFor(userLoc, target)}
        >
          <Marker coordinate={{ latitude: userLoc.lat, longitude: userLoc.lng }} title="현재 위치" pinColor="#2596a6" />
          {/* 목적지: 정확 위치는 보여주되 이름은 숨긴 익명 핀 */}
          <Marker coordinate={{ latitude: target.lat, longitude: target.lng }} title="???" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.mysteryPin, { backgroundColor: accent }]}>
              <Text style={styles.mysteryPinText}>?</Text>
            </View>
          </Marker>
          {Polyline && (
            <Polyline
              coordinates={[
                { latitude: userLoc.lat, longitude: userLoc.lng },
                { latitude: target.lat, longitude: target.lng },
              ]}
              strokeColor={accent}
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          )}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapPlaceholder]}>
          {Platform.OS === 'web' ? (
            <Text style={styles.placeholderText}>지도는 앱(실기기)에서 보여요</Text>
          ) : (
            <ActivityIndicator color={accent} />
          )}
        </View>
      )}

      <Text style={styles.direction}>🧭 {stop.direction}</Text>
      <Text style={styles.hintText}>&ldquo;{stop.hint}&rdquo;</Text>

      <View style={styles.metaRow}>
        <Text style={[styles.category, { color: accent }]}>#{stop.category}</Text>
        {stop.neighborhood ? <Text style={styles.neighborhood}>{stop.neighborhood}</Text> : null}
      </View>

      <Text style={styles.distance}>
        {distance != null ? `목적지까지 약 ${Math.round(distance)}m` : '위치를 찾는 중...'}
      </Text>

      {renderRoute(false)}
      <TouchableOpacity style={styles.button} onPress={() => setRevealed(true)}>
        <Text style={styles.buttonText}>여기 도착했어요</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>동선으로 돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    paddingTop: 64,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  order: {
    fontFamily: F.num,
    fontSize: 14,
    fontWeight: '700',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1.5,
    textAlign: 'center',
    lineHeight: 30,
    overflow: 'hidden',
  },
  time: {
    fontFamily: F.label,
    fontSize: 13,
    color: C.caption,
  },
  map: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 20,
  },
  mapPlaceholder: {
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysteryPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mysteryPinText: {
    color: '#fff',
    fontFamily: F.labelBold,
    fontSize: 20,
  },
  placeholderText: {
    fontFamily: F.label,
    color: C.caption,
    fontSize: 14,
  },
  direction: {
    fontFamily: F.label,
    fontSize: 15,
    color: C.title,
    fontWeight: '600',
    marginBottom: 12,
  },
  hintText: {
    fontFamily: F.body,
    fontSize: 16,
    color: C.title,
    lineHeight: 26,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  category: {
    fontFamily: F.label,
    fontSize: 13,
    fontWeight: '500',
  },
  neighborhood: {
    fontFamily: F.label,
    fontSize: 13,
    color: C.meta,
  },
  distance: {
    fontFamily: F.label,
    fontSize: 14,
    color: C.tap,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: C.cta,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 28,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: F.label,
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  recordBtn: {
    backgroundColor: '#e9d5ff', // 첫 진입 화면 버튼 색 (다크 배경 위)
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  recordBtnText: {
    fontFamily: F.label,
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  routeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  routeBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  naverBtn: {
    borderColor: 'rgba(47,158,91,0.5)', // 네이버 그린 (밝은 배경용)
  },
  kakaoBtn: {
    borderColor: 'rgba(184,144,26,0.5)', // 카카오 옐로 (밝은 배경용)
  },
  naverBtnDark: {
    borderColor: 'rgba(3,199,90,0.55)', // 네이버 그린 (다크 배경용)
  },
  kakaoBtnDark: {
    borderColor: 'rgba(245,222,90,0.55)', // 카카오 옐로 (다크 배경용)
  },
  routeBtnText: {
    fontFamily: F.label,
    fontSize: 14,
    fontWeight: '600',
  },
  naverText: {
    color: '#2f9e5b',
  },
  kakaoText: {
    color: '#b8901a',
  },
  naverTextDark: {
    color: '#46d889',
  },
  kakaoTextDark: {
    color: '#e7d24e',
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
  // reveal — 첫 진입 화면 다크 팔레트 (#1a1a2e), 폰트만 새 것 유지
  revealContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  revealScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  revealBadge: {
    fontFamily: F.label,
    fontSize: 12,
    color: '#7c7c96',
    letterSpacing: 5,
    marginBottom: 22,
  },
  revealName: {
    fontFamily: F.title,
    fontSize: 33,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  revealSub: {
    fontFamily: F.label,
    fontSize: 13,
    color: '#a78bfa',
    letterSpacing: 1,
    marginBottom: 6,
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: '#a78bfa',
    opacity: 0.6,
    marginVertical: 20,
  },
  revealText: {
    fontFamily: F.body,
    fontSize: 17,
    color: '#dcdce8',
    lineHeight: 29,
    textAlign: 'center',
    marginBottom: 28,
  },
  revealBackText: {
    fontFamily: F.label,
    fontSize: 14,
    color: '#9a9ab5',
  },
  revealRest: {
    width: '100%',
    alignItems: 'stretch',
  },
});

import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Animated, Platform, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import * as Location from 'expo-location';

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

  // reveal 좌표는 도착 판정(거리 계산)에만 쓰고, 도착 전까지 화면엔 안 그림
  const target =
    stop?.reveal && typeof stop.reveal.lat === 'number'
      ? { lat: stop.reveal.lat, lng: stop.reveal.lng }
      : null;

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

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

  // 도착하면 reveal 페이드인
  useEffect(() => {
    if (revealed) {
      Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }).start();
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

  const routeButtons = (
    <View style={styles.routeRow}>
      <TouchableOpacity style={[styles.routeBtn, styles.naverBtn]} onPress={() => openRoute('naver')}>
        <Text style={styles.routeBtnText}>네이버 지도로 길찾기</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.routeBtn, styles.kakaoBtn]} onPress={() => openRoute('kakao')}>
        <Text style={styles.routeBtnText}>카카오맵</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------- 도착 후: reveal ----------
  if (revealed) {
    return (
      <Animated.View style={[styles.container, styles.revealContainer, { opacity: fade }]}>
        <Text style={styles.revealBadge}>도착!</Text>
        <Text style={styles.revealName}>{stop.reveal?.display_name}</Text>
        <Text style={styles.revealText}>{stop.reveal?.reveal_text}</Text>

        {Platform.OS !== 'web' && MapView && target && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: target.lat,
              longitude: target.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker coordinate={{ latitude: target.lat, longitude: target.lng }} title={stop.reveal?.display_name} />
            {userLoc && (
              <Marker
                coordinate={{ latitude: userLoc.lat, longitude: userLoc.lng }}
                title="현재 위치"
                pinColor="#67e8f9"
              />
            )}
          </MapView>
        )}

        {routeButtons}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>동선으로 돌아가기</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ---------- 도착 전: 안내 ----------
  return (
    <View style={styles.container}>
      <View style={styles.stopHeader}>
        <Text style={styles.order}>{stop.order}</Text>
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
          <Marker coordinate={{ latitude: userLoc.lat, longitude: userLoc.lng }} title="현재 위치" pinColor="#67e8f9" />
          {/* 목적지: 정확 위치는 보여주되 이름은 숨긴 익명 핀 */}
          <Marker coordinate={{ latitude: target.lat, longitude: target.lng }} title="???" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.mysteryPin}>
              <Text style={styles.mysteryPinText}>?</Text>
            </View>
          </Marker>
          {Polyline && (
            <Polyline
              coordinates={[
                { latitude: userLoc.lat, longitude: userLoc.lng },
                { latitude: target.lat, longitude: target.lng },
              ]}
              strokeColor="#a78bfa"
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
            <ActivityIndicator color="#a78bfa" />
          )}
        </View>
      )}

      <Text style={styles.direction}>🧭 {stop.direction}</Text>
      <Text style={styles.hintText}>&ldquo;{stop.hint}&rdquo;</Text>

      <View style={styles.metaRow}>
        <Text style={styles.category}>#{stop.category}</Text>
        {stop.neighborhood ? <Text style={styles.neighborhood}>{stop.neighborhood}</Text> : null}
      </View>

      <Text style={styles.distance}>
        {distance != null ? `목적지까지 약 ${Math.round(distance)}m` : '위치를 찾는 중...'}
      </Text>

      {routeButtons}
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
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 40,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  order: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#67e8f9',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a4e',
    textAlign: 'center',
    lineHeight: 32,
    overflow: 'hidden',
  },
  time: {
    fontSize: 14,
    color: '#67e8f9',
  },
  map: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 20,
  },
  mapPlaceholder: {
    backgroundColor: '#2a2a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysteryPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#a78bfa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mysteryPinText: {
    color: '#1a1a2e',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholderText: {
    color: '#888',
    fontSize: 14,
  },
  direction: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  hintText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  category: {
    fontSize: 14,
    color: '#e9d5ff',
  },
  neighborhood: {
    fontSize: 14,
    color: '#a78bfa',
  },
  distance: {
    fontSize: 16,
    color: '#67e8f9',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#a78bfa',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  routeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  routeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naverBtn: {
    flex: 2,
    backgroundColor: '#03c75a', // 네이버 그린
  },
  kakaoBtn: {
    backgroundColor: '#fae100', // 카카오 옐로
  },
  routeBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  backButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#888',
  },
  // reveal
  revealContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealBadge: {
    fontSize: 16,
    color: '#67e8f9',
    letterSpacing: 4,
    marginBottom: 16,
  },
  revealName: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#e9d5ff',
    textAlign: 'center',
    marginBottom: 18,
  },
  revealText: {
    fontSize: 17,
    color: '#ccc',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 24,
  },
});

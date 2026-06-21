import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import * as Location from 'expo-location';

// 지도는 네이티브(실기기/시뮬레이터)에서만 — 웹은 react-native-maps 미지원
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
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

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>동선으로 돌아가기</Text>
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

      {Platform.OS !== 'web' && MapView && userLoc ? (
        <MapView
          style={styles.map}
          region={{
            latitude: userLoc.lat,
            longitude: userLoc.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={{ latitude: userLoc.lat, longitude: userLoc.lng }} title="현재 위치" pinColor="#67e8f9" />
          {/* 목적지 핀은 도착 전까지 표시하지 않음 — 위치가 곧 정체이므로 */}
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

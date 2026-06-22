import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '@/constants/api';

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
        <ActivityIndicator size="large" color="#a78bfa" />
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
        <Text style={styles.moodLabel}>오늘의 무드: {mood}</Text>
        {itinerary.summary ? <Text style={styles.summary}>{itinerary.summary}</Text> : null}

        {itinerary.stops.map((stop: any) => {
          const moved = stop.transport?.mode && stop.transport.mode !== 'start';
          return (
            <TouchableOpacity
              key={stop.order}
              style={styles.stop}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/stop', params: { stop: JSON.stringify(stop) } })}
            >
              <View style={styles.stopHeader}>
                <Text style={styles.order}>{String(stop.order).padStart(2, '0')}</Text>
                <Text style={styles.time}>
                  {stop.arrive_time} – {stop.depart_time}
                </Text>
              </View>

              {/* 시적 힌트가 주인공 — 이름·좌표는 도착 전까지 숨김 */}
              <Text style={styles.hintText}>&ldquo;{stop.hint}&rdquo;</Text>

              <View style={styles.metaRow}>
                <Text style={styles.category}>{stop.category}</Text>
                {stop.neighborhood ? <Text style={styles.dot}>·</Text> : null}
                {stop.neighborhood ? <Text style={styles.neighborhood}>{stop.neighborhood}</Text> : null}
              </View>

              <Text style={styles.direction}>
                {moved ? `${stop.transport.from_prev} · ` : ''}
                {stop.direction}
              </Text>
              <Text style={styles.tapHint}>탭하면 길안내 →</Text>
            </TouchableOpacity>
          );
        })}

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
    backgroundColor: '#f3f2fa',
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f3f2fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#7857d6',
    fontSize: 18,
    marginTop: 20,
  },
  loadingHint: {
    color: '#9a98ad',
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#3a3a4e',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  moodLabel: {
    color: '#8f7fb8',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 10,
  },
  summary: {
    color: '#4a4a5e',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 26,
  },
  stop: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5f2',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  order: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#7857d6',
  },
  time: {
    fontSize: 12,
    color: '#9090a4',
  },
  hintText: {
    fontSize: 15,
    color: '#2a2a3a',
    lineHeight: 23,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#7857d6',
  },
  dot: {
    fontSize: 12,
    color: '#c5c2d8',
  },
  neighborhood: {
    fontSize: 12,
    color: '#8585a0',
  },
  direction: {
    fontSize: 12,
    color: '#9090a4',
    lineHeight: 18,
  },
  tapHint: {
    fontSize: 11,
    color: '#2596a6',
    marginTop: 12,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#7857d6',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#9090a4',
  },
});

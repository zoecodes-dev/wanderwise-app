import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { API_BASE_URL } from '@/constants/api';

// 카테고리별 포인트 색 — 단조로움을 깨고 장소 성격을 색으로 구분 (어두운 톤에 맞춘 차분한 채도)
const CATEGORY_COLORS: Record<string, string> = {
  '카페': '#e0a872',
  '베이커리': '#e8c08a',
  '노포': '#e08a6e',
  '시장': '#d8a15e',
  '바': '#c79be0',
  '갤러리': '#7fb5c9',
  '독립서점': '#9db884',
  '공방': '#caa98a',
  '전망': '#8aa6d8',
  '공원': '#85c0a0',
};
const DEFAULT_ACCENT = '#a78bfa';

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.moodLabel}>오늘의 무드: {mood}</Text>
        {itinerary.summary ? <Text style={styles.summary}>{itinerary.summary}</Text> : null}

        {itinerary.stops.map((stop: any) => {
          const accent = CATEGORY_COLORS[stop.category] ?? DEFAULT_ACCENT;
          const moved = stop.transport?.mode && stop.transport.mode !== 'start';
          return (
            <TouchableOpacity
              key={stop.order}
              style={[styles.stop, { borderLeftColor: accent }]}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/stop', params: { stop: JSON.stringify(stop) } })}
            >
              <View style={styles.stopHeader}>
                <Text style={[styles.order, { color: accent }]}>{String(stop.order).padStart(2, '0')}</Text>
                <Text style={styles.time}>
                  {stop.arrive_time} – {stop.depart_time}
                </Text>
              </View>

              {/* 시적 힌트가 주인공 — 이름·좌표는 도착 전까지 숨김 */}
              <Text style={styles.hintText}>&ldquo;{stop.hint}&rdquo;</Text>

              <View style={styles.metaRow}>
                <Text style={[styles.category, { color: accent }]}>{stop.category}</Text>
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
    backgroundColor: '#1a1a2e',
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#a78bfa',
    fontSize: 18,
    marginTop: 20,
  },
  loadingHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  moodLabel: {
    color: '#9a8cc4',
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  summary: {
    color: '#dcdce8',
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 28,
  },
  stop: {
    backgroundColor: '#20203a',
    borderRadius: 16,
    borderLeftWidth: 3,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  order: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  time: {
    fontSize: 13,
    color: '#8a8aa5',
  },
  hintText: {
    fontSize: 19,
    color: '#ece8f5',
    lineHeight: 30,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dot: {
    fontSize: 13,
    color: '#55556e',
  },
  neighborhood: {
    fontSize: 13,
    color: '#8a8aa5',
  },
  direction: {
    fontSize: 13,
    color: '#7c7c96',
    lineHeight: 19,
  },
  tapHint: {
    fontSize: 12,
    color: '#6f6f8c',
    marginTop: 14,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#a78bfa',
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
});

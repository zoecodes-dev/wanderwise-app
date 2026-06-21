import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.moodLabel}>오늘의 무드: {mood}</Text>
        {itinerary.summary ? <Text style={styles.summary}>{itinerary.summary}</Text> : null}

        {itinerary.stops.map((stop: any) => (
          <View key={stop.order} style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <Text style={styles.order}>{stop.order}</Text>
              <Text style={styles.time}>
                {stop.arrive_time} – {stop.depart_time}
              </Text>
            </View>

            {/* 도착 전 이동 안내 (첫 stop은 출발지라 생략) */}
            {stop.transport?.mode && stop.transport.mode !== 'start' ? (
              <Text style={styles.transport}>↳ {stop.transport.from_prev}</Text>
            ) : null}

            <Text style={styles.direction}>🧭 {stop.direction}</Text>
            <Text style={styles.hintText}>&ldquo;{stop.hint}&rdquo;</Text>

            <View style={styles.metaRow}>
              <Text style={styles.category}>#{stop.category}</Text>
              {stop.neighborhood ? <Text style={styles.neighborhood}>{stop.neighborhood}</Text> : null}
            </View>
            {/* 가게 이름·좌표·reveal_text는 도착 전까지 숨김 — 4일차 reveal에서 공개 */}
          </View>
        ))}

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
    color: '#e9d5ff',
    fontSize: 16,
    marginBottom: 10,
  },
  summary: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  stopCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 16,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  order: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#67e8f9',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 32,
    overflow: 'hidden',
  },
  time: {
    fontSize: 14,
    color: '#67e8f9',
  },
  transport: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  direction: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  category: {
    fontSize: 14,
    color: '#e9d5ff',
  },
  neighborhood: {
    fontSize: 14,
    color: '#a78bfa',
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

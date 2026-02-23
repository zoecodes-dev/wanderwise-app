import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// 웹이 아닐 때만 MapView import
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function HintScreen() {
  const { mood } = useLocalSearchParams();
  const [hint, setHint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getLocationAndFetchHint();
  }, []);

  const getLocationAndFetchHint = async () => {
    try {
      // 1. 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('위치 권한이 필요해요');
        setLoading(false);
        return;
      }

      // 2. 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(coords);

      // 3. 힌트 가져오기
      const response = await fetch(
        `https://wanderwise-wanderwise.up.railway.app/places/hint?lat=${coords.lat}&lng=${coords.lng}&mood=${mood}&radius=5000`
      );
      const data = await response.json();
      setHint(data);
    } catch (error) {
      console.error('에러:', error);
      setLocationError('위치를 가져올 수 없어요');
    } finally {
      setLoading(false);
    }
  };

if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>우연을 찾는 중...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{locationError}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hint || !hint.direction || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>주변에 장소가 없어요 😢</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>다시 선택하기</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.moodLabel}>오늘의 무드: {mood}</Text>
      
      {Platform.OS !== 'web' && MapView && userLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            title="현재 위치"
          />
        </MapView>
      )}

      <View style={styles.hintCard}>
        <Text style={styles.direction}>🧭 {hint.direction}</Text>
        <Text style={styles.distance}>{hint.distance_text}</Text>
        <Text style={styles.hintText}>"{hint.hint_text}"</Text>
        <Text style={styles.category}>#{hint.category}</Text>
      </View>  

      <TouchableOpacity style={styles.button} onPress={getLocationAndFetchHint}>
          <Text style={styles.buttonText}>다른 장소 찾기</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>무드 다시 선택</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  loadingText: {
    color: '#a78bfa',
    fontSize: 18,
    marginTop: 20,
  },
  errorText: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 20,
  },
  moodLabel: {
    color: '#e9d5ff',
    fontSize: 16,
    marginBottom: 15,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
  },
  hintCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  direction: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  distance: {
    fontSize: 20,
    color: '#67e8f9',
    marginBottom: 15,
  },
  hintText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  category: {
    fontSize: 14,
    color: '#e9d5ff',
  },
  button: {
    backgroundColor: '#a78bfa',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#888',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
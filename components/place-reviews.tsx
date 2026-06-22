import { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

function authorName(r: any): string {
  const p = r.profiles;
  const dn = Array.isArray(p) ? p[0]?.display_name : p?.display_name;
  return dn || '여행자';
}

// 이 장소(도착한 곳)의 공개 리뷰 목록. 화면 포커스마다 새로고침 → 방금 쓴 리뷰도 바로 반영.
export function PlaceReviews({ placeId }: { placeId: string }) {
  const [reviews, setReviews] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, body, photos, created_at, profiles(display_name)')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
  }, [placeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (reviews === null) {
    return <ActivityIndicator color="#a78bfa" style={styles.loading} />;
  }
  if (reviews.length === 0) {
    return <Text style={styles.empty}>아직 기록이 없어요.{'\n'}첫 기록을 남겨보세요.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>이곳의 기록 {reviews.length}</Text>
      {reviews.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.author}>{authorName(r)}</Text>
          <Text style={styles.body}>{r.body}</Text>
          {Array.isArray(r.photos) && r.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
              {r.photos.map((u: string, i: number) => (
                <Image key={i} source={{ uri: u }} style={styles.photo} />
              ))}
            </ScrollView>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 24 },
  empty: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 24,
  },
  wrap: { width: '100%', marginTop: 8 },
  heading: {
    color: '#9a9ab5',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#23233f',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  author: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    color: '#dcdce8',
    fontSize: 15,
    lineHeight: 22,
  },
  photos: { marginTop: 10 },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 10,
    marginRight: 8,
  },
});

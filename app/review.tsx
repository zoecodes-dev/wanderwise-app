import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/use-session';

const QUESTIONS = [
  '무엇이 가장 기억에 남았나요?',
  '어떤 점이 좋았나요?',
  '다음에 온다면 무엇을 해보고 싶나요?',
];

export default function ReviewScreen() {
  const { place_id, name } = useLocalSearchParams<{ place_id: string; name?: string }>();
  const { session, user, loading: authLoading } = useSession();
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 로그인 안 됐으면 로그인 유도 (로그인 후 onAuthStateChange로 자동 갱신되어 폼이 보임)
  if (!authLoading && !session) {
    return (
      <View style={styles.center}>
        <Text style={styles.gateTitle}>기록을 남기려면{'\n'}로그인이 필요해요</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>로그인 / 가입</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>나중에</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('사진 접근 권한이 필요해요');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled) {
      setPhotos((prev) => [...prev, ...res.assets].slice(0, 4));
    }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!body.trim()) {
      Alert.alert('한 줄이라도 적어 주세요');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      // 1. 사진 업로드 → 공개 URL
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (!p.base64) continue;
        const ext = (p.mimeType?.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        const path = `${user.id}/${Date.now()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('review-photos')
          .upload(path, decode(p.base64), { contentType: p.mimeType || 'image/jpeg' });
        if (upErr) throw upErr;
        urls.push(supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl);
      }
      // 2. 리뷰 저장
      const { error: insErr } = await supabase
        .from('reviews')
        .insert({ place_id, user_id: user.id, body: body.trim(), photos: urls });
      if (insErr) throw insErr;
      router.back();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '잠시 후 다시 시도해 주세요');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>기록 남기기</Text>
        <TouchableOpacity onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#a78bfa" /> : <Text style={styles.saveText}>저장</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {name ? <Text style={styles.place}>{name}</Text> : null}

        <View style={styles.guide}>
          {QUESTIONS.map((q) => (
            <Text key={q} style={styles.guideItem}>· {q}</Text>
          ))}
        </View>

        <TextInput
          style={styles.body}
          placeholder="이곳에서의 경험을 적어 주세요"
          placeholderTextColor="#666"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => removePhoto(i)} style={styles.thumbWrap} activeOpacity={0.8}>
              <Image source={{ uri: p.uri }} style={styles.thumb} />
              <View style={styles.thumbX}>
                <Text style={styles.thumbXText}>×</Text>
              </View>
            </TouchableOpacity>
          ))}
          {photos.length < 4 && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickPhotos}>
              <Text style={styles.addPhotoText}>＋{'\n'}사진</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 28 },
  gateTitle: { color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 28, marginBottom: 24 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  saveText: { color: '#a78bfa', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#888', fontSize: 15 },
  scroll: { padding: 20 },
  place: { color: '#e9d5ff', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  guide: {
    backgroundColor: '#23233f',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  guideItem: { color: '#9a9ab5', fontSize: 14, lineHeight: 24 },
  body: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 160,
    lineHeight: 24,
    marginBottom: 16,
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: 80, height: 80 },
  thumb: { width: 80, height: 80, borderRadius: 12 },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbXText: { color: '#fff', fontSize: 14, lineHeight: 16 },
  addPhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a5e',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 17 },
  button: {
    backgroundColor: '#a78bfa',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 28,
    alignItems: 'center',
  },
  buttonText: { fontSize: 17, fontWeight: 'bold', color: '#1a1a2e' },
  cancel: { marginTop: 16 },
});

import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { F } from '@/constants/fonts';

// 밝은 배경 + 차콜 CTA 팔레트 (hint.tsx와 공유 예정)
const C = {
  bg: '#ecebf0',
  card: '#f6f5f9',
  cardBorder: '#dad8e2',
  title: '#2d2b38',
  subtitle: '#6a6878',
  labelDefault: '#5a5868',
  cta: '#3a3848',
  ctaDisabled: '#c0bcd2',
};

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// id·label·라우팅 로직은 유지. icon/color/tint 만 추가.
// 아이콘은 Tabler 의도를 MaterialCommunityIcons 로 대체 매핑.
const MOODS: {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  tintBg: string;
  tintBorder: string;
}[] = [
  { id: 'romantic',    label: '로맨틱',     icon: 'heart',            color: '#cd5c84', tintBg: '#f7ecf0', tintBorder: '#cd5c84' },
  { id: 'peaceful',    label: '평화로운',   icon: 'leaf',             color: '#4d8a60', tintBg: '#eef3ec', tintBorder: '#5a9a6e' },
  { id: 'adventurous', label: '모험적인',   icon: 'image-filter-hdr', color: '#3d8a7d', tintBg: '#e8f0ee', tintBorder: '#3d8a7d' },
  { id: 'creative',    label: '창의적인',   icon: 'palette',          color: '#b86fb0', tintBg: '#f3ecf2', tintBorder: '#b86fb0' },
  { id: 'curious',     label: '호기심',     icon: 'magnify',          color: '#d89a3a', tintBg: '#f6f0e4', tintBorder: '#d89a3a' },
  { id: 'local',       label: '현지인처럼', icon: 'home',             color: '#c07a4a', tintBg: '#f5efe8', tintBorder: '#c07a4a' },
  { id: 'indulgent',   label: '여유롭게',   icon: 'glass-wine',       color: '#a85a6e', tintBg: '#f4ecee', tintBorder: '#a85a6e' },
  { id: 'energetic',   label: '활기찬',     icon: 'lightning-bolt',   color: '#d8a020', tintBg: '#f6f1e2', tintBorder: '#d8a020' },
  { id: 'social',      label: '사교적인',   icon: 'account-group',    color: '#4a8ac0', tintBg: '#e9f0f6', tintBorder: '#4a8ac0' },
  { id: 'reflective',  label: '사색적인',   icon: 'weather-night',    color: '#7a6fb8', tintBg: '#efedf5', tintBorder: '#7a6fb8' },
];

export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleSelect = (moodId: string) => {
    setSelectedMood(moodId);
  };

  const handleNext = () => {
    if (!selectedMood) return;
    // 무드는 백엔드에서 자유 텍스트로 임베딩됨 → 한글 label이 한국 장소와 매칭이 더 잘 됨
    const moodText = MOODS.find((m) => m.id === selectedMood)?.label ?? selectedMood;
    router.push(`/hint?mood=${encodeURIComponent(moodText)}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>오늘의 기분은?</Text>
      <Text style={styles.subtitle}>당신의 무드에 맞는 장소를 찾아드릴게요</Text>

      <ScrollView contentContainerStyle={styles.moodGrid}>
        {MOODS.map((mood) => {
          const selected = selectedMood === mood.id;
          return (
            <TouchableOpacity
              key={mood.id}
              activeOpacity={0.8}
              style={[
                styles.moodCard,
                selected && { backgroundColor: mood.tintBg, borderColor: mood.tintBorder, borderWidth: 1.5 },
              ]}
              onPress={() => handleSelect(mood.id)}
            >
              <MaterialCommunityIcons name={mood.icon} size={24} color={mood.color} />
              <Text
                style={[
                  styles.moodLabel,
                  selected && { color: mood.color, fontWeight: '500' },
                ]}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.nextButton, !selectedMood && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!selectedMood}
      >
        <Text style={styles.nextButtonText}>다음</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontFamily: F.title,
    fontSize: 23,
    color: C.title,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.subtitle,
    textAlign: 'center',
    marginBottom: 30,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 14,
    paddingBottom: 12,
  },
  moodCard: {
    width: '29%',
    aspectRatio: 1,
    flexShrink: 0,
    backgroundColor: C.card,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.cardBorder,
  },
  moodLabel: {
    fontFamily: F.body,
    fontSize: 12,
    color: C.labelDefault,
  },
  nextButton: {
    backgroundColor: C.cta,
    paddingVertical: 15,
    borderRadius: 28,
    marginTop: 20,
    marginBottom: 40,
  },
  nextButtonDisabled: {
    backgroundColor: C.ctaDisabled,
  },
  nextButtonText: {
    fontFamily: F.label,
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
});

import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

const MOODS = [
  { id: 'romantic', emoji: '💕', label: '로맨틱' },
  { id: 'peaceful', emoji: '🧘', label: '평화로운' },
  { id: 'adventurous', emoji: '🏔️', label: '모험적인' },
  { id: 'creative', emoji: '🎨', label: '창의적인' },
  { id: 'curious', emoji: '🔍', label: '호기심' },
  { id: 'local', emoji: '🏘️', label: '현지인처럼' },
  { id: 'indulgent', emoji: '🍷', label: '여유롭게' },
  { id: 'energetic', emoji: '⚡', label: '활기찬' },
  { id: 'social', emoji: '👥', label: '사교적인' },
  { id: 'reflective', emoji: '🌙', label: '사색적인' },
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
      <Text style={styles.title}>오늘의 기분은?</Text>
      <Text style={styles.subtitle}>당신의 무드에 맞는 장소를 찾아드릴게요</Text>
      
      <ScrollView contentContainerStyle={styles.moodGrid}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.id}
            style={[
              styles.moodCard,
              selectedMood === mood.id && styles.moodCardSelected,
            ]}
            onPress={() => handleSelect(mood.id)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={[
              styles.moodLabel,
              selectedMood === mood.id && styles.moodLabelSelected,
            ]}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
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
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e9d5ff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  moodCard: {
    width: '28%',
    aspectRatio: 1,
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    paddingBottom: 10,
  },
  moodCardSelected: {
    borderColor: '#e9d5ff',
    backgroundColor: '#3a3a5e',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  moodLabelSelected: {
    color: '#e9d5ff',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#67e8f9',
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
    marginBottom: 40,
  },
  nextButtonDisabled: {
    backgroundColor: '#555',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
  },
});
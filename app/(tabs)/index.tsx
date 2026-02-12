import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {

  const handleStart = () => {
    router.push('/mood');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.ascii}>
{`  .        _
   ***       ***      .
 ** . **   ** . **
**  .  ** **  .  **    _
 ** . **   ** . **
   ***   *   ***   .
      **✨**
   ***   *   ***
 ** . **   ** . **  _
**  .  **.**  .  **
 ** . ** . ** . **    .
   ***   .   ***
  _       .        .
            . .   *
    WanderWise    _`}
      </Text>
      <Text style={styles.subtitle}>Wrong Turn In youR maP</Text>
      <Text style={styles.description}>
        길을 잃은 순간,{'\n'}완벽한 오류를 만나는 건{'\n'}{'\n'}과연 우연일까?  
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>탐험 시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  ascii: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 11,
    color: '#c792ea',
    marginBottom: 20,
    lineHeight: 14,
  },
  subtitle: {
    fontSize: 18,
    color: '#67e8f9',
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#e9d5ff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    const mail = email.trim();
    if (!mail || !password) {
      setNotice('이메일과 비밀번호를 입력해 주세요');
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: nickname.trim() ? { data: { display_name: nickname.trim() } } : undefined,
        });
        if (error) throw error;
        if (!data.session) {
          // 이메일 확인이 켜져 있는 경우
          setNotice('확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.');
          setMode('signin');
          return;
        }
        router.back(); // 가입 즉시 로그인됨
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        router.back();
      }
    } catch (e: any) {
      setNotice(e?.message ?? '문제가 발생했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>{mode === 'signin' ? '다시 만나 반가워요' : '기록을 남기려면'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'signin' ? '이메일로 로그인' : '이메일로 가입하고 시작해요'}
        </Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="닉네임 (선택)"
            placeholderTextColor="#666"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {notice && <Text style={styles.notice}>{notice}</Text>}

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'signin' ? '로그인' : '가입하기'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switch}
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setNotice(null);
          }}
        >
          <Text style={styles.switchText}>
            {mode === 'signin' ? '계정이 없으신가요?  가입하기' : '이미 계정이 있으신가요?  로그인'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>나중에</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9a9ab5',
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  notice: {
    color: '#67e8f9',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#a78bfa',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  switch: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#a78bfa',
    fontSize: 14,
  },
  cancel: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
});

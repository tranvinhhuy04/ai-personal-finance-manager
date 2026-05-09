import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, User2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { authApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const { signIn, verifyTwoFactor } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingTwoFactorToken, setPendingTwoFactorToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const requiresTwoFactor = Boolean(pendingTwoFactorToken);

  const resetTransientState = () => {
    setPendingTwoFactorToken(null);
    setTwoFactorCode('');
    setMessage(null);
    setError(null);
  };

  const toggleMode = () => {
    setIsRegisterMode((current) => !current);
    setShowPassword(false);
    resetTransientState();
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (requiresTwoFactor && pendingTwoFactorToken) {
        if (!twoFactorCode.trim()) {
          throw new Error('Vui lòng nhập mã xác thực 2FA gồm 6 số.');
        }

        await verifyTwoFactor(pendingTwoFactorToken, twoFactorCode.trim());
        setMessage('Đăng nhập thành công. Đang mở ứng dụng...');
        return;
      }

      if (!email.trim() || !password.trim()) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
      }

      if (isRegisterMode) {
        if (!fullName.trim()) {
          throw new Error('Vui lòng nhập họ và tên.');
        }

        await authApi.register({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });

        setMessage('Đăng ký thành công. Hãy đăng nhập bằng tài khoản vừa tạo.');
        setIsRegisterMode(false);
        setPassword('');
        return;
      }

      const result = await signIn({ email: email.trim(), password });

      if (result.requires2FA && result.twoFactorToken) {
        setPendingTwoFactorToken(result.twoFactorToken);
        setMessage('Tài khoản này đã bật 2FA. Hãy nhập mã xác thực để hoàn tất đăng nhập.');
        return;
      }

      setMessage('Đăng nhập thành công. Đang mở ứng dụng...');
    } catch (err: any) {
      setError(err?.message || (isRegisterMode ? 'Không thể đăng ký lúc này.' : 'Không thể đăng nhập lúc này.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            className="flex-1 bg-slate-950"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="px-6">
              <View className="items-center mb-6">
                <View className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">Fintech Mobile</Text>
                </View>
              </View>

              <LinearGradient
                colors={['#0f766e', '#065f46', '#0f172a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="mt-6 rounded-[30px] px-6 py-7"
              >
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-emerald-100">{isRegisterMode ? 'Khởi tạo tài khoản' : 'Đăng nhập an toàn'}</Text>
                    <Text className="mt-2 text-[30px] font-bold tracking-tight text-white">
                      {isRegisterMode ? 'Bắt đầu quản lý tài chính ngay trên mobile' : 'Chào mừng bạn quay lại'}
                    </Text>
                    <Text className="mt-3 text-sm leading-6 text-emerald-50/85">
                      {isRegisterMode
                        ? 'Tạo tài khoản mới để đồng bộ ví, analytics và AI assistant với hệ thống web hiện tại.'
                        : 'Tiếp tục với dữ liệu ví, dòng tiền và phân tích chuyên sâu được đồng bộ từ backend thật.'}
                    </Text>
                  </View>

                  <View className="rounded-2xl bg-white/10 p-3">
                    <Sparkles size={20} color="#ffffff" />
                  </View>
                </View>
              </LinearGradient>

              <View className="mt-6 rounded-[30px] border border-white/10 bg-white/95 px-5 py-6 shadow-2xl shadow-slate-950/30">
                {isRegisterMode ? (
                  <View className="mb-4 flex-row items-center h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <User2 size={18} color="#64748b" />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Nhập họ và tên"
                      placeholderTextColor="#94a3b8"
                      editable={!isSubmitting}
                      className="ml-3 flex-1 text-base text-slate-800"
                    />
                  </View>
                ) : null}

                  <View className="mb-4 flex-row items-center h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <Mail size={18} color="#64748b" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Nhập email của bạn"
                    placeholderTextColor="#94a3b8"
                    editable={!requiresTwoFactor && !isSubmitting}
                    className="ml-3 flex-1 text-base text-slate-800"
                  />
                </View>

                <View className="mb-2 flex-row items-center h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <Lock size={18} color="#64748b" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder={isRegisterMode ? 'Tạo mật khẩu' : 'Nhập mật khẩu'}
                    placeholderTextColor="#94a3b8"
                    editable={!requiresTwoFactor && !isSubmitting}
                    className="ml-3 flex-1 text-base text-slate-800"
                  />
                  <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={8}>
                    {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                  </Pressable>
                </View>

                {!isRegisterMode ? <Text className="self-end mb-8 text-sm font-medium text-emerald-600">Quên mật khẩu?</Text> : <View className="mb-8" />}

                {requiresTwoFactor ? (
                  <View className="mb-4 flex-row items-center h-14 rounded-2xl border border-emerald-200 bg-emerald-50 px-4">
                    <ShieldCheck size={18} color="#059669" />
                    <TextInput
                      value={twoFactorCode}
                      onChangeText={setTwoFactorCode}
                      keyboardType="number-pad"
                      placeholder="Nhập mã 2FA"
                      placeholderTextColor="#94a3b8"
                      editable={!isSubmitting}
                      className="ml-3 flex-1 text-base text-slate-800"
                    />
                  </View>
                ) : null}

                {message ? <Text className="mb-3 text-sm text-emerald-600">{message}</Text> : null}
                {error ? <Text className="mb-3 text-sm text-rose-500">{error}</Text> : null}

                <Pressable
                  onPress={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className={`h-14 items-center justify-center overflow-hidden rounded-2xl ${isSubmitting ? 'opacity-70' : ''}`}
                >
                  <LinearGradient
                    colors={['#059669', '#0f766e', '#115e59']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-14 w-full items-center justify-center px-4"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-center text-lg font-bold text-white" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {requiresTwoFactor ? 'Xác nhận 2FA' : isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View className="mt-8 flex-row items-center justify-center">
                <Text className="text-sm text-slate-300">
                  {isRegisterMode ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                </Text>
                <Pressable onPress={toggleMode}>
                  <Text className="text-sm font-bold text-emerald-600">
                    {isRegisterMode ? 'Đăng nhập' : 'Đăng ký ngay'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import React from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View } from 'react-native';
import { Bell, LogOut, Moon, Shield, Smartphone, User2 } from 'lucide-react-native';

import { API_BASE_URL } from '../api/axiosClient';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { useAuth } from '../contexts/AuthContext';
import { useAppPreferences } from '../hooks/useAppPreferences';

function SettingRow({
  title,
  description,
  icon,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-3">
      <View className="flex-1 flex-row items-start gap-3">
        <View className="rounded-2xl bg-slate-100 p-3">{icon}</View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-slate-800">{title}</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">{description}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#cbd5e1', true: '#10b981' }} />
    </View>
  );
}

export function SettingsScreen() {
  const { preferences, isLoading, setDarkMode, setNotifications, setBiometricLock } = useAppPreferences();
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        eyebrow="System"
        title="Cài đặt"
        subtitle="Điều chỉnh giao diện, thông báo và trạng thái kết nối của ứng dụng mobile."
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center bg-slate-50">
          <ActivityIndicator color="#059669" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-slate-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
          <View className="rounded-[24px] bg-slate-900 p-6 shadow-lg">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-300">Trạng thái ứng dụng</Text>
                <Text className="mt-2 text-2xl font-bold tracking-tight text-white">Fintech Mobile đã sẵn sàng</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-300">
                  Cài đặt của bạn được lưu cục bộ trên thiết bị bằng AsyncStorage và có thể mở rộng cho bảo mật nâng cao.
                </Text>
              </View>
              <View className="rounded-full bg-white/10 p-3">
                <Shield size={20} color="#ffffff" />
              </View>
            </View>
          </View>

          <View className="mt-8">
            <SectionCard title="Tài khoản" subtitle="Phiên đăng nhập hiện tại được lưu tự động trên thiết bị." className="mb-0">
              <View className="rounded-[18px] bg-slate-50 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="rounded-2xl bg-emerald-100 p-3">
                    <User2 size={18} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-800">{user?.fullName || 'Người dùng Fintech'}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{user?.email || 'Chưa có email hiển thị'}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4">
                <PrimaryButton
                  label="Đăng xuất"
                  variant="secondary"
                  icon={<LogOut size={16} color="#0f172a" />}
                  onPress={() => void signOut()}
                />
              </View>
            </SectionCard>
          </View>

          <View className="mt-8">
            <SectionCard title="Tùy chọn cá nhân" subtitle="Các cài đặt được lưu trực tiếp trên thiết bị bằng AsyncStorage." className="mb-0">
              <SettingRow
                title="Dark mode"
                description="Bật giao diện tối dịu mắt giống hệ thống web ở chế độ dark."
                icon={<Moon size={18} color="#0f172a" />}
                value={preferences.darkMode}
                onValueChange={(value) => void setDarkMode(value)}
              />
              <SettingRow
                title="Thông báo"
                description="Nhận cập nhật cho giao dịch, ví và insight AI mới."
                icon={<Bell size={18} color="#0f172a" />}
                value={preferences.notifications}
                onValueChange={(value) => void setNotifications(value)}
              />
              <SettingRow
                title="Khóa sinh trắc học"
                description="Chuẩn bị cho bước nâng cấp bảo mật nâng cao trên mobile."
                icon={<Shield size={18} color="#0f172a" />}
                value={preferences.biometricLock}
                onValueChange={(value) => void setBiometricLock(value)}
              />
            </SectionCard>
          </View>

          <View className="mt-8">
            <SectionCard title="Thiết bị & kết nối" subtitle="Thông tin cần thiết để bạn test app bằng QR và kết nối backend thật." className="mb-0">
              <View className="gap-3">
                <View className="rounded-[18px] bg-slate-50 p-4">
                  <View className="mb-2 flex-row items-center gap-2">
                    <Smartphone size={18} color="#059669" />
                    <Text className="font-semibold text-slate-800">QR Testing Ready</Text>
                  </View>
                  <Text className="text-sm leading-6 text-slate-500">
                    Chỉ cần mở Expo Go và scan QR từ terminal là có thể dùng app ngay trên điện thoại khi cùng Wi‑Fi.
                  </Text>
                </View>

                <View className="rounded-[18px] bg-slate-50 p-4">
                  <Text className="text-sm font-semibold text-slate-800">API Gateway</Text>
                  <Text className="mt-1 text-sm leading-6 text-emerald-700">{API_BASE_URL}</Text>
                </View>
              </View>
            </SectionCard>
          </View>

          <View className="mt-8 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <Text className="text-sm font-semibold text-emerald-900">Gợi ý sử dụng</Text>
            {[
              'Dashboard dùng card trắng nổi trên nền slate-50 giống web.',
              'Bottom tabs thay thế sidebar để thao tác tự nhiên trên mobile.',
              'AI Assistant và Analytics vẫn kết nối trực tiếp backend hiện tại.',
            ].map((item) => (
              <Text key={item} className="mt-2 text-sm leading-6 text-emerald-800">• {item}</Text>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

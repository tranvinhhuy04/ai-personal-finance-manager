import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  ReceiptText,
  ScanLine,
  Wallet2,
} from 'lucide-react-native';

import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { useTransactions } from '../hooks/useTransactions';
import { useWallets } from '../hooks/useWallets';
import { financeApi } from '../api/finance';
import type { TransactionType } from '../types/finance';
import { formatCompactCurrency } from '../utils/formatCurrency';

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (v: TransactionType) => void;
}) {
  return (
    <View className="flex-row overflow-hidden rounded-2xl bg-slate-100 p-1">
      <Pressable
        onPress={() => onChange('EXPENSE')}
        className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${value === 'EXPENSE' ? 'bg-rose-500' : ''}`}
      >
        <ArrowDownRight size={15} color={value === 'EXPENSE' ? '#ffffff' : '#94a3b8'} />
        <Text className={`text-sm font-bold ${value === 'EXPENSE' ? 'text-white' : 'text-slate-400'}`}>Chi tiêu</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('INCOME')}
        className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${value === 'INCOME' ? 'bg-emerald-600' : ''}`}
      >
        <ArrowUpRight size={15} color={value === 'INCOME' ? '#ffffff' : '#94a3b8'} />
        <Text className={`text-sm font-bold ${value === 'INCOME' ? 'text-white' : 'text-slate-400'}`}>Thu nhập</Text>
      </Pressable>
    </View>
  );
}

export function TransactionScreen() {
  const { preferences } = useAppPreferences();
  const walletsHook = useWallets();
  const { transactions, categories, isLoading, isRefreshing, refetch, createTransaction, isCreating } =
    useTransactions();

  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [nlpInput, setNlpInput] = useState('');
  const [isNlpLoading, setIsNlpLoading] = useState(false);

  const activeWallets = walletsHook.rawWallets.filter((w) => w.status === 1);
  const filteredCategories = categories.filter((c) => c.type === txType).slice(0, 9);
  const totalIncome = transactions.filter((t) => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  const handleCreate = async () => {
    if (!amount || Number(amount) <= 0) { setFeedback({ ok: false, msg: 'Vui lòng nhập số tiền hợp lệ.' }); return; }
    if (!selectedWallet) { setFeedback({ ok: false, msg: 'Vui lòng chọn ví.' }); return; }
    if (!description.trim()) { setFeedback({ ok: false, msg: 'Vui lòng nhập mô tả giao dịch.' }); return; }

    try {
      await createTransaction({
        walletId: selectedWallet,
        categoryId: selectedCategory || undefined,
        amount: Number(amount),
        transactionType: txType,
        description: description.trim(),
      });
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setFeedback({ ok: true, msg: 'Ghi nhận thành công!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ ok: false, msg: error instanceof Error ? error.message : 'Không thể ghi nhận giao dịch.' });
    }
  };

  const handleOcrCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền camera để chụp hóa đơn.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) await runOcr(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
  };

  const handleOcrGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền thư viện ảnh để chọn hóa đơn.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) await runOcr(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
  };

  const runOcr = async (uri: string, mime: string) => {
    setIsOcrLoading(true);
    setFeedback(null);
    try {
      const data = await financeApi.extractInvoice(uri, mime);
      if (data.merchantName && data.merchantName !== 'Không rõ') setDescription(data.merchantName);
      if (data.totalAmount && data.totalAmount > 0) { setAmount(String(data.totalAmount)); setTxType('EXPENSE'); }
      setFeedback({ ok: true, msg: `OCR: "${data.merchantName}"${data.totalAmount ? ` • ${formatCompactCurrency(data.totalAmount)}` : ''}` });
    } catch (error) {
      setFeedback({ ok: false, msg: error instanceof Error ? error.message : 'OCR thất bại. Thử ảnh rõ hơn.' });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const tryParseAiJson = (rawText?: string): Record<string, any> | null => {
    if (!rawText) return null;
    const trimmed = rawText.trim();
    const codeBlock = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/```\s*([\s\S]*?)```/i);
    const body = codeBlock?.[1] ?? trimmed;

    try {
      return JSON.parse(body) as Record<string, any>;
    } catch {
      const firstBrace = body.indexOf('{');
      const lastBrace = body.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        try {
          return JSON.parse(body.slice(firstBrace, lastBrace + 1)) as Record<string, any>;
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const normalizeAmount = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const t = value.trim().toLowerCase();
    if (t.endsWith('k')) {
      return Number(t.replace(/[^\d.]/g, '')) * 1000;
    }
    return Number(t.replace(/[^\d]/g, ''));
  };

  const handleNlpExtract = async () => {
    const command = nlpInput.trim();
    if (!command) {
      setFeedback({ ok: false, msg: 'Vui lòng nhập câu lệnh giao dịch tự nhiên.' });
      return;
    }

    setIsNlpLoading(true);
    try {
      const answer = await financeApi.askAI({
        question: [
          'Trích xuất dữ liệu giao dịch tài chính từ câu sau và chỉ trả về JSON thuần.',
          'Schema bắt buộc:',
          '{"description":"string","amount":number,"transactionType":"EXPENSE|INCOME","categoryName":"string"}',
          'Nếu thiếu dữ liệu thì amount=0, categoryName="".',
          `Câu: "${command}"`,
        ].join('\n'),
        useLlm: true,
        range: 'month',
      });

      const parsed = tryParseAiJson(answer.answer);
      if (!parsed) throw new Error('Không đọc được kết quả NLP.');

      const parsedAmount = normalizeAmount(parsed.amount);
      const parsedType = String(parsed.transactionType ?? 'EXPENSE').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const parsedDescription = String(parsed.description ?? command);
      const parsedCategory = String(parsed.categoryName ?? '').toLowerCase();

      setTxType(parsedType);
      setAmount(parsedAmount > 0 ? String(Math.round(parsedAmount)) : '');
      setDescription(parsedDescription);

      if (!selectedWallet && activeWallets[0]) {
        setSelectedWallet(activeWallets[0].id);
      }

      if (parsedCategory) {
        const matched = categories.find((c) => c.type === parsedType && c.name.toLowerCase().includes(parsedCategory));
        if (matched) setSelectedCategory(matched.id);
      }

      setFeedback({ ok: true, msg: 'Đã nhận diện giao dịch từ câu lệnh tự nhiên. Bạn kiểm tra rồi bấm ghi nhận.' });
    } catch (error) {
      setFeedback({ ok: false, msg: error instanceof Error ? error.message : 'Không thể xử lý câu lệnh tự nhiên.' });
    } finally {
      setIsNlpLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <ScreenHeader
        eyebrow="Finance Tracker"
        title="Giao dịch"
        subtitle="Ghi nhận thu chi tức thì hoặc quét hóa đơn bằng OCR để tự động điền thông tin."
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} />}
      >
        {/* Summary strip */}
        <View className="mb-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-emerald-50 p-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <ArrowUpRight size={13} color="#059669" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Thu nhập</Text>
            </View>
            <Text className="text-base font-extrabold text-emerald-800">{formatCompactCurrency(totalIncome)}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-rose-50 p-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <ArrowDownRight size={13} color="#e11d48" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Chi tiêu</Text>
            </View>
            <Text className="text-base font-extrabold text-rose-700">{formatCompactCurrency(totalExpense)}</Text>
          </View>
        </View>

        {/* OCR Banner */}
        <View
          className="mb-5 overflow-hidden rounded-[24px]"
          style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 }}
        >
          <LinearGradient
            colors={['#1e3a5f', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5"
          >
            <View className="flex-row items-center gap-3 mb-4">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <ScanLine size={20} color="#6ee7b7" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-white">Quét hóa đơn bằng OCR</Text>
                <Text className="text-xs text-slate-400">AI tự động nhận diện tên, số tiền từ ảnh hóa đơn</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => void handleOcrCamera()}
                disabled={isOcrLoading}
                className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 ${isOcrLoading ? 'opacity-50' : ''}`}
              >
                <Camera size={16} color="#ffffff" />
                <Text className="flex-shrink text-center text-sm font-bold text-white" numberOfLines={1}>Chụp ảnh</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleOcrGallery()}
                disabled={isOcrLoading}
                className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 ${isOcrLoading ? 'opacity-50' : ''}`}
              >
                <ImageIcon size={16} color="#94a3b8" />
                <Text className="flex-shrink text-center text-sm font-bold text-slate-300" numberOfLines={1}>Thư viện</Text>
              </Pressable>
            </View>
            {isOcrLoading ? (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#6ee7b7" />
                <Text className="text-xs text-slate-400">Đang phân tích hóa đơn bằng PaddleOCR…</Text>
              </View>
            ) : null}
          </LinearGradient>
        </View>

        {/* NLP Banner */}
        <View className="mb-5 overflow-hidden rounded-[24px]" style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
          <LinearGradient colors={['#1e3a5f', '#0f172a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
            <View className="mb-3 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <Sparkles size={18} color="#6ee7b7" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-white">Ghi nhận bằng ngôn ngữ tự nhiên</Text>
                <Text className="text-xs text-slate-400">Ví dụ: "hôm nay uống cafe 50k"</Text>
              </View>
            </View>

            <TextInput
              value={nlpInput}
              onChangeText={setNlpInput}
              placeholder='VD: hôm nay uống cafe 50k'
              placeholderTextColor="#94a3b8"
              className="min-h-[46px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100"
            />

            <Pressable
              onPress={() => void handleNlpExtract()}
              disabled={isNlpLoading}
              className={`mt-3 min-h-[44px] overflow-hidden rounded-2xl ${isNlpLoading ? 'opacity-60' : ''}`}
            >
              <LinearGradient colors={['#059669', '#047857', '#065f46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-row items-center justify-center gap-2 px-4 py-3.5">
                {isNlpLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <Sparkles size={16} color="#ffffff" />}
                <Text className="flex-shrink text-center text-sm font-extrabold text-white" numberOfLines={1}>
                  {isNlpLoading ? 'Đang xử lý câu lệnh...' : 'Phân tích câu lệnh'}
                </Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Quick add form */}
        <SectionCard
          title="Ghi nhận thủ công"
          subtitle="Điền thông tin giao dịch hoặc chỉnh sửa kết quả OCR."
          rightSlot={
            <Pressable onPress={() => setShowForm((v) => !v)} className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-100 p-2">
              {showForm ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
            </Pressable>
          }
        >
          {showForm ? (
            <View className="gap-4">
              {/* Type toggle */}
              <TypeToggle value={txType} onChange={setTxType} />

              {/* Amount */}
              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-600">Số tiền (VND)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  className="min-h-[52px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-bold text-slate-900"
                />
              </View>

              {/* Description */}
              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-600">Mô tả</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="VD: Cà phê, Lương tháng 5, Tiền xăng…"
                  placeholderTextColor="#94a3b8"
                  className="min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />
              </View>

              {/* Wallet selector */}
              {activeWallets.length > 0 ? (
                <View>
                  <Text className="mb-1.5 text-sm font-medium text-slate-600">Chọn ví</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {activeWallets.map((w) => (
                      <Pressable
                        key={w.id}
                        onPress={() => setSelectedWallet(w.id)}
                        className={`min-h-[44px] flex-row items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 ${selectedWallet === w.id ? 'bg-slate-800' : 'bg-slate-100'}`}
                      >
                        <Wallet2 size={12} color={selectedWallet === w.id ? '#ffffff' : '#64748b'} />
                        <Text className={`text-sm font-semibold ${selectedWallet === w.id ? 'text-white' : 'text-slate-600'}`}>
                          {w.walletName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="rounded-2xl bg-amber-50 p-3">
                  <Text className="text-sm text-amber-700">Chưa có ví hoạt động. Vui lòng tạo ví trong tab Ví.</Text>
                </View>
              )}

              {/* Category */}
              {filteredCategories.length > 0 ? (
                <View>
                  <Text className="mb-1.5 text-sm font-medium text-slate-600">Danh mục</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {filteredCategories.map((cat) => (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                        className={`min-h-[44px] flex-row items-center justify-center rounded-xl px-3 py-2 ${selectedCategory === cat.id ? 'bg-emerald-600' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-sm font-medium ${selectedCategory === cat.id ? 'text-white' : 'text-slate-600'}`}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Feedback */}
              {feedback ? (
                <View className={`flex-row items-center gap-2 rounded-xl p-3 ${feedback.ok ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  {feedback.ok ? <CheckCircle2 size={15} color="#059669" /> : null}
                  <Text className={`flex-1 text-sm font-medium ${feedback.ok ? 'text-emerald-800' : 'text-rose-700'}`} numberOfLines={2}>
                    {feedback.msg}
                  </Text>
                </View>
              ) : null}

              {/* Submit button - gradient, color by type */}
              <Pressable
                onPress={() => void handleCreate()}
                disabled={isCreating}
                className={`min-h-[44px] overflow-hidden rounded-2xl ${isCreating ? 'opacity-60' : ''}`}
              >
                <LinearGradient
                  colors={txType === 'EXPENSE' ? ['#fb7185', '#e11d48', '#9f1239'] : ['#34d399', '#059669', '#065f46']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="flex-row items-center justify-center gap-2 px-4 py-4"
                >
                  <ReceiptText size={17} color="#ffffff" />
                  <Text className="flex-shrink text-center text-[15px] font-bold text-white" numberOfLines={1}>
                    {isCreating ? 'Đang lưu…' : txType === 'EXPENSE' ? 'Ghi nhận chi tiêu' : 'Ghi nhận thu nhập'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : null}
        </SectionCard>

        {/* Transaction list */}
        <View className="mt-2">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Lịch sử giao dịch</Text>
            <View className="rounded-full bg-slate-100 px-3 py-1">
              <Text className="text-xs font-semibold text-slate-600">{transactions.length} giao dịch</Text>
            </View>
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#059669" size="large" />
              <Text className="mt-3 text-sm text-slate-400">Đang tải lịch sử…</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View className="items-center rounded-[24px] bg-white p-8 shadow-sm">
              <ReceiptText size={44} color="#cbd5e1" />
              <Text className="mt-4 text-base font-semibold text-slate-700">Chưa có giao dịch nào</Text>
              <Text className="mt-1 text-center text-sm leading-6 text-slate-500">
                Ghi nhận giao dịch đầu tiên hoặc quét hóa đơn bằng OCR ở trên.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {transactions.map((tx) => (
                <View key={tx.id} className="rounded-[20px] bg-white p-4" style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-2xl ${tx.transactionType === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}
                    >
                      {tx.transactionType === 'INCOME' ? (
                        <ArrowUpRight size={17} color="#059669" />
                      ) : (
                        <ArrowDownRight size={17} color="#e11d48" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500">
                        {tx.categoryName ?? 'Khác'} •{' '}
                        {new Date(tx.occurredAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>

                    <Text className={`text-sm font-extrabold ${tx.transactionType === 'INCOME' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {tx.transactionType === 'INCOME' ? '+' : '-'}{formatCompactCurrency(tx.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

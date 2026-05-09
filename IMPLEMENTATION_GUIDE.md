# 📖 Implementation Guide - Fintech Mobile Refactor

## Quick Start

### 1. Review Changes
Start by reading `REFACTOR_SUMMARY.md` for overview of all 3 phases.

### 2. Build & Test
```bash
# Install dependencies (if needed)
npm ci

# Run on iOS with Expo
expo start --ios

# Run on Android with Expo
expo start --android
```

### 3. Key Files to Review

#### New Utility Functions
- `src/utils/formatCurrency.ts` - `formatCurrencyShort()` for display

#### New Components
- `src/components/ChatInput.tsx` - Reusable chat input
- `src/components/ChatMessage.tsx` - Message bubble display
- `src/components/NLPQuickEntry.tsx` - NLP transaction entry

#### Refactored Screens
- `src/screens/AIAssistantScreen.tsx` - Complete FlatList redesign
- `src/screens/TransactionScreen.tsx` - SafeArea + NLP integration
- `src/screens/DashboardScreen.tsx` - SafeArea + formatCurrencyShort

---

## Component Usage Examples

### 1. ChatInput Component

**Location:** `src/components/ChatInput.tsx`

**Basic Usage:**
```typescript
import { ChatInput } from '../components/ChatInput';
import { useState } from 'react';

export function MyScreen() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    // Send message logic
    setMessage('');
    setIsLoading(false);
  };

  return (
    <ChatInput
      value={message}
      onChangeText={setMessage}
      onSend={handleSend}
      isLoading={isLoading}
      placeholder="Type your message..."
      darkMode={false}
      multiline={true}
      numberOfLines={3}
    />
  );
}
```

**Props:**
```typescript
interface ChatInputProps {
  value: string;                    // Current input text
  onChangeText: (text: string) => void;  // Text change handler
  onSend: () => void;              // Send button handler
  placeholder?: string;             // Input placeholder (default: "Nhập câu hỏi...")
  isLoading?: boolean;             // Disable while loading
  darkMode?: boolean;              // Apply dark mode styles
  multiline?: boolean;             // Allow multi-line input
  numberOfLines?: number;          // Initial line count
}
```

---

### 2. ChatMessage Component

**Location:** `src/components/ChatMessage.tsx`

**Basic Usage:**
```typescript
import { ChatMessage, type ChatMessageData } from '../components/ChatMessage';
import { useState } from 'react';

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: '1',
      role: 'assistant',
      text: 'Hello! How can I help you?',
    },
    {
      id: '2',
      role: 'user',
      text: 'I need help with my finances',
    },
  ]);

  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => (
        <ChatMessage message={item} darkMode={false} />
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

**Message Data Format:**
```typescript
interface ChatMessageData {
  id: string;              // Unique identifier
  role: 'assistant' | 'user';  // Message sender
  text: string;            // Message content
  isTyping?: boolean;      // Show typing animation
}
```

**Usage with Typing Indicator:**
```typescript
// When awaiting AI response
const messages = [
  ...previousMessages,
  {
    id: `typing-${Date.now()}`,
    role: 'assistant',
    text: '',
    isTyping: true,  // ← Shows loading spinner
  },
];

// Replace with actual response
const updated = messages.map((msg) =>
  msg.id === typingId
    ? { ...msg, text: response, isTyping: false }
    : msg
);
```

---

### 3. NLPQuickEntry Component

**Location:** `src/components/NLPQuickEntry.tsx`

**Basic Usage:**
```typescript
import { NLPQuickEntry } from '../components/NLPQuickEntry';
import { useState } from 'react';
import { financeApi } from '../api/finance';

export function TransactionScreen() {
  const [nlpInput, setNlpInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExtract = async () => {
    setIsLoading(true);
    try {
      const result = await financeApi.askAI({
        question: `Extract transaction data from: "${nlpInput}"`,
        useLlm: true,
      });
      
      // Parse and apply to form
      const data = JSON.parse(result.answer);
      setAmount(data.amount);
      setDescription(data.description);
      setTxType(data.transactionType);
      
      setNlpInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NLPQuickEntry
      input={nlpInput}
      onInputChange={setNlpInput}
      isLoading={isLoading}
      onExtract={handleExtract}
      placeholder="VD: hôm nay uống cafe 50k"
      darkMode={preferences.darkMode}
    />
  );
}
```

**Props:**
```typescript
interface NLPQuickEntryProps {
  input: string;                      // Current input
  onInputChange: (text: string) => void;  // Input change handler
  isLoading: boolean;                // Disable while processing
  onExtract: () => void;             // Extract button handler
  placeholder?: string;              // Input placeholder
  darkMode?: boolean;               // Dark mode styles
}
```

---

### 4. formatCurrencyShort Utility

**Location:** `src/utils/formatCurrency.ts`

**Basic Usage:**
```typescript
import { formatCurrencyShort } from '../utils/formatCurrency';

// In JSX
<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
  {formatCurrencyShort(1234567890)}  // Output: "1.2 Tỷ đ"
</Text>

<Text>{formatCurrencyShort(5000000)}</Text>      // "5 Triệu đ"
<Text>{formatCurrencyShort(50000)}</Text>        // "50K đ"
<Text>{formatCurrencyShort(1000)}</Text>         // "1K đ"
<Text>{formatCurrencyShort(100)}</Text>          // "100 đ"
```

**Format Examples:**
- >= 1,000,000,000: "X.X Tỷ đ"
- >= 1,000,000: "X.X Triệu đ"
- >= 1,000: "XK đ"
- < 1,000: "X đ"

---

## Screen Integration Examples

### AIAssistantScreen - Phase 3 Implementation

The new AIAssistantScreen uses FlatList for better performance:

```typescript
export function AIAssistantScreen() {
  const { preferences } = useAppPreferences();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([
    { id: 'welcome', role: 'assistant', text: 'Hello!' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: inputValue },
    ]);
    setInputValue('');

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: 'assistant', text: '', isTyping: true },
    ]);

    setIsLoading(true);

    try {
      // Call AI API
      const response = await financeApi.askAI({
        question: inputValue,
        useLlm: true,
      });

      // Replace typing indicator with response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? { ...msg, text: response.answer, isTyping: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScreenHeader title="AI Assistant" />
      
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <ChatMessage message={item} darkMode={preferences.darkMode} />
          )}
          keyExtractor={(item) => item.id}
          onEndReachedThreshold={0.1}
          scrollEventThrottle={16}
        />

        <View className="px-4 py-3">
          <ChatInput
            value={inputValue}
            onChangeText={setInputValue}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### TransactionScreen - NLP Integration

```typescript
import { NLPQuickEntry } from '../components/NLPQuickEntry';

export function TransactionScreen() {
  const [nlpInput, setNlpInput] = useState('');
  const [isNlpLoading, setIsNlpLoading] = useState(false);

  const handleNlpExtract = async () => {
    const prompt = [
      'Extract transaction: {"description":"", "amount":0, "transactionType":"EXPENSE|INCOME", "categoryName":""}',
      `Input: "${nlpInput}"`,
    ].join('\n');

    setIsNlpLoading(true);
    try {
      const result = await financeApi.askAI({
        question: prompt,
        useLlm: true,
      });

      const parsed = JSON.parse(result.answer);
      
      // Auto-fill form
      setAmount(String(parsed.amount));
      setDescription(parsed.description);
      setTxType(parsed.transactionType);
      
    } finally {
      setIsNlpLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Form fields */}
      <NLPQuickEntry
        input={nlpInput}
        onInputChange={setNlpInput}
        isLoading={isNlpLoading}
        onExtract={handleNlpExtract}
        placeholder="VD: hôm nay uống cafe 50k"
        darkMode={preferences.darkMode}
      />
      {/* More form fields */}
    </ScrollView>
  );
}
```

---

## Common Patterns

### Pattern 1: Safe Area + ScrollView
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
  <ScreenHeader ... />
  <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
    {/* Content */}
  </ScrollView>
</SafeAreaView>
```

### Pattern 2: Keyboard Avoiding Form
```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
>
  <ScrollView keyboardShouldPersistTaps="handled">
    {/* Form with inputs */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Pattern 3: Auto-scroll FlatList
```typescript
const flatListRef = useRef<FlatList>(null);

const scrollToBottom = () => {
  flatListRef.current?.scrollToEnd({ animated: true });
};

// Call after adding message
useEffect(() => {
  scrollToBottom();
}, [messages.length]);

<FlatList
  ref={flatListRef}
  onContentSizeChange={scrollToBottom}
/>
```

---

## Testing Tips

### Test SafeArea
```bash
# iOS
1. Open iPhone with notch in Xcode
2. Rotate to landscape
3. Verify no content overlap
```

### Test Currency Display
```typescript
// Test with different values
formatCurrencyShort(1234567890)  // "1.2 Tỷ đ"
formatCurrencyShort(50000)       // "50K đ"
formatCurrencyShort(100)         // "100 đ"
```

### Test NLP
```typescript
// Simulate user input variations
"hôm nay uống cafe 50k"
"mua sách 100 ngàn"
"lương tháng 20 triệu"
"chuyển tiền cho bạn 200k"
```

---

## Troubleshooting

### Issue: Content cut off by Tab Bar
**Solution:** Ensure `contentContainerStyle={{ paddingBottom: 120 }}`

### Issue: Keyboard covers input
**Solution:** Wrap in `KeyboardAvoidingView` with proper `behavior` prop

### Issue: Chat messages don't auto-scroll
**Solution:** 
```typescript
// Ensure FlatList ref is initialized
const flatListRef = useRef<FlatList>(null);
// Add onContentSizeChange handler
<FlatList onContentSizeChange={() => flatListRef.current?.scrollToEnd()} />
```

### Issue: Dark mode not working
**Solution:** Always pass `darkMode={preferences.darkMode}` to components

---

## Performance Tips

1. **FlatList for long lists**: Use FlatList instead of ScrollView + map for 50+ items
2. **Memoization**: Wrap expensive components with `memo()`
3. **useCallback**: Memoize handlers passed to children
4. **Image optimization**: Use `blurhash` for placeholder loading

---

## Resources

- [React Native Docs](https://reactnative.dev/)
- [NativeWind Docs](https://www.nativewind.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Query Docs](https://tanstack.com/query/latest/)

---

**Version:** 1.0  
**Last Updated:** May 9, 2026

# ⚡ Quick Start Guide - Component Usage

## 🏃 Get Started in 5 Minutes

### Step 1: Build & Run
```bash
cd fe-mobile
npm ci
expo start --ios  # or --android
```

### Step 2: Choose Your Task

---

## 📱 Task 1: Using ChatInput Component

### Scenario
You want to add a chat input field to your screen.

### Code
```typescript
import { ChatInput } from '../components/ChatInput';
import { useState } from 'react';

export function MyChatScreen() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    console.log('Sending:', message);
    setIsLoading(true);

    // Do something with message
    // await api.sendMessage(message);

    setMessage('');
    setIsLoading(false);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Your screen content */}

      {/* Chat input at bottom */}
      <ChatInput
        value={message}
        onChangeText={setMessage}
        onSend={handleSend}
        isLoading={isLoading}
        placeholder="Type a message..."
        darkMode={false}
      />
    </View>
  );
}
```

### Result
✅ A fully functional chat input with:
- Text field
- Send button
- Loading state
- Disabled when empty

---

## 🧩 Task 2: Using ChatMessage Component

### Scenario
You want to display chat messages.

### Code
```typescript
import { ChatMessage, type ChatMessageData } from '../components/ChatMessage';
import { FlatList } from 'react-native';

export function MyChatScreen() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: '1',
      role: 'assistant',
      text: 'Hello! How can I help?',
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
    />
  );
}
```

### With Typing Indicator
```typescript
// Show typing indicator
setMessages(prev => [
  ...prev,
  {
    id: 'typing-1',
    role: 'assistant',
    text: '',
    isTyping: true,
  },
]);

// Later, replace with actual message
setMessages(prev =>
  prev.map(msg =>
    msg.id === 'typing-1'
      ? { ...msg, text: 'Actual response here', isTyping: false }
      : msg
  )
);
```

### Result
✅ Message bubbles with:
- User/assistant differentiation
- Avatar icons
- Typing animation
- Dark mode support

---

## 🎙️ Task 3: Using NLPQuickEntry Component

### Scenario
You want users to describe a transaction in natural language.

### Code
```typescript
import { NLPQuickEntry } from '../components/NLPQuickEntry';
import { useState } from 'react';

export function TransactionForm() {
  const [nlpInput, setNlpInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleExtractNLP = async () => {
    if (!nlpInput.trim()) return;

    setIsLoading(true);

    try {
      // Call your NLP API
      const response = await nlpExtract(nlpInput);

      // Auto-fill form
      setAmount(String(response.amount));
      setDescription(response.description);

      setNlpInput(''); // Clear input
    } catch (error) {
      console.error('NLP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="gap-4">
      {/* NLP Entry */}
      <NLPQuickEntry
        input={nlpInput}
        onInputChange={setNlpInput}
        isLoading={isLoading}
        onExtract={handleExtractNLP}
        placeholder="VD: hôm nay uống cafe 50k"
        darkMode={false}
      />

      {/* Auto-filled form fields */}
      {amount && <Text>Amount: {amount}</Text>}
      {description && <Text>Description: {description}</Text>}
    </View>
  );
}
```

### Expected Flow
```
User types: "hôm nay uống cafe 50k"
         ↓
Button press (onExtract)
         ↓
API processing (show loading)
         ↓
Response: { amount: 50000, description: "cà phê", ... }
         ↓
Form auto-fills with extracted data
         ↓
User reviews and saves
```

### Result
✅ NLP-powered form auto-fill with:
- Natural language input
- Loading spinner
- Error handling
- Auto-filled form fields

---

## 💬 Task 4: Using AI Assistant (New FlatList Version)

### Scenario
You want to use the refactored AIAssistantScreen.

### Code
```typescript
import { AIAssistantScreen } from '../screens/AIAssistantScreen';

// Use in your navigation
<Stack.Screen name="AI" component={AIAssistantScreen} />
```

### What Changed
✅ **Before**: ScrollView + static layout
```
[Message 1]
[Message 2]
[Input Field] ← Could be covered by keyboard
```

✅ **After**: FlatList + dynamic keyboard avoidance
```
[FlatList: Messages auto-scroll]
     ↓
[Suggested Questions] ← Shows on startup
     ↓
[ChatInput fixed at bottom] ← Keyboard pushes it up
```

### Result
✅ Production-ready AI chat with:
- Smooth FlatList scrolling
- Typing indicator
- Auto-scroll to latest
- Proper keyboard handling
- Suggested questions

---

## 🛠️ Task 5: Format Large Numbers

### Scenario
Your dashboard shows large balances that overflow on small screens.

### Code
```typescript
import { formatCurrencyShort } from '../utils/formatCurrency';

export function DashboardCard({ balance }) {
  return (
    <View className="rounded-2xl bg-white p-4">
      <Text className="text-sm">Your Balance</Text>
      
      {/* BEFORE: Could overflow */}
      {/* <Text>{formatCurrency(balance)}</Text> */}
      {/* Output: "1,234,567,890 đ" - TOO LONG! */}

      {/* AFTER: Fits perfectly */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {formatCurrencyShort(balance)}
      </Text>
      {/* Output: "1.2 Tỷ đ" - PERFECT! */}
    </View>
  );
}
```

### Format Examples
```typescript
formatCurrencyShort(1_234_567_890)  // "1.2 Tỷ đ"
formatCurrencyShort(50_000_000)     // "50 Triệu đ"
formatCurrencyShort(50_000)         // "50K đ"
formatCurrencyShort(1_000)          // "1K đ"
formatCurrencyShort(100)            // "100 đ"
formatCurrencyShort(-50_000)        // "-50K đ" (works with negatives)
```

### Result
✅ Compact currency display that:
- Fits on small screens
- Auto-scales if needed
- Supports VND and USD
- Works with negative numbers

---

## 🔧 Task 6: Fix SafeArea on Custom Screen

### Scenario
You created a new screen but content is overlapping with notch/Home Indicator.

### Code
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export function MyCustomScreen() {
  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader title="My Screen" />

      {/* Content */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 120, // ← Important! Prevents tab bar cutoff
        }}
      >
        {/* Your content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Key Points
- ✅ `SafeAreaView` with `edges={['top', 'left', 'right']}`
- ✅ `contentContainerStyle` with `paddingBottom: 120`
- ✅ No content covered by notch
- ✅ No content hidden by tab bar

### Result
✅ Properly spaced screen with:
- No notch overlap
- No tab bar cutoff
- Proper padding throughout
- Mobile-optimized layout

---

## 🎮 Task 7: Add Keyboard Avoidance to Form

### Scenario
Your form inputs get covered by the keyboard on iOS.

### Code
```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

export function MyFormScreen() {
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Your form inputs */}
        <TextInput placeholder="Name" />
        <TextInput placeholder="Email" />
        <Button title="Submit" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### Platform-Specific Behavior
```
iOS:
  - behavior="padding" (push content up)
  - keyboardVerticalOffset=50 (header height)

Android:
  - behavior="height" (resize view)
  - keyboardVerticalOffset=0 (no offset needed)
```

### Result
✅ Keyboard-friendly form with:
- Automatic layout adjustment
- Platform-specific behavior
- No input coverage
- Smooth transitions

---

## 📝 Common Patterns

### Pattern 1: SafeArea + ScrollView
```typescript
<SafeAreaView edges={['top', 'left', 'right']}>
  <ScreenHeader />
  <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
    {/* Content */}
  </ScrollView>
</SafeAreaView>
```

### Pattern 2: Chat List + Input
```typescript
<View className="flex-1">
  <FlatList data={messages} renderItem={...} />
  <ChatInput value={...} onSend={...} />
</View>
```

### Pattern 3: Form with NLP
```typescript
<ScrollView>
  <NLPQuickEntry {...nlpProps} />
  {/* Form fields that auto-fill */}
</ScrollView>
```

### Pattern 4: Currency Display
```typescript
<Text numberOfLines={1} adjustsFontSizeToFit>
  {formatCurrencyShort(balance)}
</Text>
```

---

## ✅ Verification Checklist

After implementation:
- [ ] App builds without errors
- [ ] No TypeScript errors
- [ ] Component renders correctly
- [ ] Responsive on small screens
- [ ] Works on both iOS & Android
- [ ] Dark mode looks good
- [ ] No content overlap
- [ ] Keyboard doesn't cover inputs

---

## 🆘 Troubleshooting

### Problem: "Module not found"
**Solution:** Import path is relative, check exact location
```typescript
// ✅ Correct
import { ChatInput } from '../components/ChatInput';

// ❌ Wrong
import { ChatInput } from './ChatInput';
```

### Problem: "Missing property 'id'"
**Solution:** ChatMessageData requires all properties
```typescript
// ✅ Correct
{ id: '1', role: 'user', text: 'Hi' }

// ❌ Wrong
{ role: 'user', text: 'Hi' }  // Missing id
```

### Problem: Content cut off by tab bar
**Solution:** Add paddingBottom to ScrollView
```typescript
// ✅ Correct
contentContainerStyle={{ paddingBottom: 120 }}

// ❌ Wrong
// No paddingBottom specified
```

### Problem: Keyboard covers input
**Solution:** Wrap with KeyboardAvoidingView
```typescript
// ✅ Correct
<KeyboardAvoidingView behavior="padding">
  <ScrollView>...</ScrollView>
</KeyboardAvoidingView>

// ❌ Wrong
<ScrollView>...</ScrollView>  // No keyboard handling
```

---

## 🎓 Next Steps

1. ✅ **Try one task** from above
2. ✅ **Run the app** and test
3. ✅ **Review the code** in the component files
4. ✅ **Read documentation** for deep dive
5. ✅ **Deploy** when ready

---

## 📞 Need More Help?

- **Component details?** → Check the component's TypeScript interface
- **Usage examples?** → See IMPLEMENTATION_GUIDE.md
- **What changed?** → Read CHANGE_SUMMARY.md
- **Technical deep dive?** → Read REFACTOR_SUMMARY.md

---

**Version:** 1.0  
**Ready to code?** Let's go! 🚀

Pick a task above and start implementing!

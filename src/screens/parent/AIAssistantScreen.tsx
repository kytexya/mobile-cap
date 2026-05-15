import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCheck,
  Mic,
  Send,
  Sparkles,
  User,
  Utensils,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { studentService } from '../../services/student.service';

// --- Types ---
type MessageType = 'text' | 'attendance' | 'menu' | 'event';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender: 'ai' | 'user';
  timestamp: string;
  data?: {
    status?: string;
    statusColor?: string;
    checkIn?: string;
    menuItems?: string[];
    eventTitle?: string;
    eventDate?: string;
  };
}

interface QuickAskChip {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const QUICK_ASK_CHIPS: QuickAskChip[] = [
  { id: '1', label: "Bữa trưa của bé thế nào?", icon: <Utensils size={14} color="#1A1F36" /> },
  { id: '2', label: 'Điểm danh hôm nay?', icon: <CalendarDays size={14} color="#1A1F36" /> },
  { id: '3', label: 'Sự kiện sắp tới?', icon: <Sparkles size={14} color="#1A1F36" /> },
  { id: '4', label: 'Liên hệ giáo viên', icon: <User size={14} color="#1A1F36" /> },
];
// --- Components ---

const AIAssistantScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    className: '',
    classId: null as number | null,
    studentId: null as number | null,
  });

  useEffect(() => {
    loadStudentInfo();
  }, []);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const loadStudentInfo = async () => {
    try {
      if (!user) return;
      const primaryChild = await studentService.getPrimaryForAccount(user);
      if (primaryChild) {
        setStudentInfo({
          name: primaryChild?.fullName || '',
          className: primaryChild?.className || '',
          classId: primaryChild?.classId ?? null,
          studentId: primaryChild?.studentId ?? primaryChild?.id ?? null,
        });
      }
    } catch (error) {
      console.warn('Failed to load student info:', error);
    }
  };

  const handleBack = () => {
    navigation?.goBack?.();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Simulate AI typing and response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      simulateAIResponse(inputText.trim());
    }, 1500);
  };

  const handleQuickAsk = (chip: QuickAskChip) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: chip.label,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      simulateAIResponse(chip.label, true);
    }, 1200);
  };

  const simulateAIResponse = (userMessage: string, isQuickAsk: boolean = false) => {
    let response: Message;
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes('lunch') || lowerMsg.includes('ăn') || lowerMsg.includes('menu')) {
      response = {
        id: (Date.now() + 1).toString(),
        type: 'menu',
        content: `Đây là thực đơn bữa trưa hôm nay của ${studentInfo.name} tại ${studentInfo.className}:`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        // data: {
        //   menuItems: ['Cơm trắng', 'Thịt kho trứng', 'Canh bí đỏ', 'Chuối chín'],
        // },
      };
    } else if (lowerMsg.includes('attendance') || lowerMsg.includes('điểm danh') || lowerMsg.includes('đến lớp')) {
      response = {
        id: (Date.now() + 1).toString(),
        type: 'attendance',
        content: `Trạng thái điểm danh hôm nay của ${studentInfo.name}:`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        // data: {
        //   status: 'Đã đến lớp',
        //   statusColor: '#16A34A',
        //   checkIn: '07:02',
        // },
      };
    } else if (lowerMsg.includes('event') || lowerMsg.includes('hoạt động') || lowerMsg.includes('sự kiện')) {
      response = {
        id: (Date.now() + 1).toString(),
        type: 'event',
        content: `Sự kiện sắp tới của ${studentInfo.className}:`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        // data: {
        //   eventTitle: 'Hội phụ huynh HK2',
        //   eventDate: '15/02/2025',
        // },
      };
    } else if (lowerMsg.includes('teacher') || lowerMsg.includes('cô') || lowerMsg.includes('giáo viên')) {
      response = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: `Tôi có thể giúp bạn liên hệ với giáo viên của ${studentInfo.name} tại ${studentInfo.className}. Bạn muốn mở màn hình chat hay xem thông tin liên hệ của giáo viên?`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
    } else {
      response = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: `Tôi hiểu bạn đang hỏi về ${studentInfo.name}. Tôi có thể giúp bạn với điểm danh, thực đơn, sự kiện trường, hoặc kết nối với giáo viên tại ${studentInfo.className}. Bạn cần thông tin cụ thể gì?`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
    }

    setMessages((prev) => [...prev, response]);
  };

  const renderTypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDot} />
        <View style={[styles.typingDot, { marginLeft: 4 }]} />
        <View style={[styles.typingDot, { marginLeft: 4 }]} />
      </View>
    </View>
  );

  const renderDataCard = (message: Message) => {
    if (message.type === 'attendance' && message.data) {
      return (
        <View style={styles.dataCard}>
          <View style={styles.dataCardHeader}>
            <Text style={styles.dataCardTitle}>Trạng thái hôm nay</Text>
            <CalendarDays size={18} color="#4F46E5" />
          </View>
          <View style={styles.dataCardRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${message.data.statusColor}14` }]}>
              <Text style={[styles.statusText, { color: message.data.statusColor }]}>
                {message.data.status}
              </Text>
            </View>
            <Text style={styles.checkInText}>Vào lớp: {message.data.checkIn}</Text>
          </View>
        </View>
      );
    }

    if (message.type === 'menu' && message.data?.menuItems) {
      return (
        <View style={styles.dataCard}>
          <View style={styles.dataCardHeader}>
            <Text style={styles.dataCardTitle}>Thực đơn hôm nay</Text>
            <Utensils size={18} color="#4F46E5" />
          </View>
          {message.data.menuItems.map((item, index) => (
            <Text key={index} style={styles.menuItem}>• {item}</Text>
          ))}
        </View>
      );
    }

    if (message.type === 'event' && message.data) {
      return (
        <View style={styles.dataCard}>
          <View style={styles.dataCardHeader}>
            <Text style={styles.dataCardTitle}>Sự kiện sắp tới</Text>
            <Sparkles size={18} color="#4F46E5" />
          </View>
          <Text style={styles.eventTitle}>{message.data.eventTitle}</Text>
          <Text style={styles.eventDate}>📅 {message.data.eventDate}</Text>
        </View>
      );
    }

    return null;
  };

  const renderMessageBubble = ({ item }: { item: Message }) => {
    const isAI = item.sender === 'ai';

    return (
      <View style={[styles.messageRow, isAI ? styles.aiRow : styles.userRow]}>
        {isAI && (
          <View style={styles.aiAvatar}>
            <Bot size={20} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.bubbleContainer}>
          <View
            style={[
              styles.bubble,
              isAI ? styles.aiBubble : styles.userBubble,
            ]}
          >
            <Text style={isAI ? styles.aiText : styles.userText}>
              {item.content}
            </Text>
            {isAI && renderDataCard(item)}
          </View>

          <View style={[styles.metaRow, isAI ? styles.metaLeft : styles.metaRight]}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            {!isAI && <CheckCheck size={12} color="#9CA3AF" strokeWidth={2} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            <View style={styles.aiAvatarLarge}>
              <Sparkles size={28} color="#FFFFFF" />
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Trợ lý AI KMS</Text>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerStatus}>Trực tuyến - Sẵn sàng hỗ trợ</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Ask Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {QUICK_ASK_CHIPS.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => handleQuickAsk(chip)}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.chipPressed,
                ]}
              >
                {chip.icon}
                <Text style={styles.chipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Message List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageBubble}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isTyping ? renderTypingIndicator : null}
        />

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputWrapper}>
            <Pressable style={styles.micButton}>
              <Mic size={22} color="#6B7280" strokeWidth={2} />
            </Pressable>

            <TextInput
              style={styles.textInput}
              placeholder={`Hỏi về ${studentInfo.name}...`}
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
              maxLength={500}
            />

            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
                inputText.trim() && styles.sendButtonActive,
              ]}
            >
              <Send size={20} color={inputText.trim() ? '#FFFFFF' : '#9CA3AF'} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1F36',
  },
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Header Styles
  header: {
    backgroundColor: '#1A1F36',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  aiAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  headerStatus: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
  },

  // Quick Ask Chips
  chipsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1A1F36',
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chipPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    color: '#1A1F36',
    fontSize: 13,
    fontWeight: '500',
  },

  // Message List
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  aiRow: {
    alignSelf: 'flex-start',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  bubbleContainer: {
    flexShrink: 1,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  aiBubble: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
    backgroundColor: '#FAFBFC',
  },
  userBubble: {
    backgroundColor: '#1A1F36',
    borderBottomRightRadius: 4,
  },
  aiText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
    fontWeight: '400',
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaLeft: {
    marginLeft: 4,
  },
  metaRight: {
    alignSelf: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
  },

  // Data Cards
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dataCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#101828',
  },
  dataCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  checkInText: {
    color: '#475467',
    fontWeight: '500',
    fontSize: 13,
  },
  menuItem: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 22,
  },
  eventTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  eventDate: {
    color: '#475467',
    fontSize: 13,
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },

  // Input Area
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 52,
  },
  micButton: {
    padding: 8,
    borderRadius: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    lineHeight: 20,
    marginHorizontal: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  sendButtonActive: {
    backgroundColor: '#4F46E5',
  },
});

export default AIAssistantScreen;

import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import {
  Camera,
  Mic,
  Paperclip,
  Send,
  Reply,
  Trash,
  Edit,
  X,
} from "lucide-react";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const swipeableRefs = useRef(new Map());
  const scrollViewRef = useRef();

  const sendMessage = () => {
    if (inputText.trim()) {
      if (editingMessage) {
        setMessages((currentMessages) =>
          currentMessages.map((msg) =>
            msg.id === editingMessage.id
              ? { ...msg, text: inputText, edited: true }
              : msg
          )
        );
        setEditingMessage(null);
      } else {
        const newMessage = {
          id: Date.now(), // Make sure we're getting unique IDs
          text: inputText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          replyTo: replyingTo,
        };
        console.log("Creating new message:", newMessage); // Debug
        setMessages((currentMessages) => [...currentMessages, newMessage]);
        setReplyingTo(null);
      }
      setInputText("");
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    swipeableRefs.current.get(message.id)?.close();
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setInputText(message.text);
    setReplyingTo(null);
    swipeableRefs.current.get(message.id)?.close();
  };

  const handleDelete = (messageId) => {
    console.log("Handling delete for message:", messageId);

    // For web environment
    if (Platform.OS === "web") {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete this message?"
      );

      if (confirmDelete) {
        setMessages((currentMessages) => {
          console.log("Current messages before delete:", currentMessages);
          const updatedMessages = currentMessages.filter(
            (m) => m.id !== messageId
          );
          console.log("Messages after delete:", updatedMessages);
          return updatedMessages;
        });

        setReplyingTo((current) =>
          current?.id === messageId ? null : current
        );
        setEditingMessage((current) =>
          current?.id === messageId ? null : current
        );
      }
    } else {
      // For mobile environment, show alert
      //? probably come back and specify for android vs iOS
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            onPress: () => {
              setMessages((currentMessages) =>
                currentMessages.filter((m) => m.id !== messageId)
              );
              setReplyingTo((current) =>
                current?.id === messageId ? null : current
              );
              setEditingMessage((current) =>
                current?.id === messageId ? null : current
              );
            },
            style: "destructive",
          },
        ]
      );
    }
  };

  // reply + edit msg
  const renderRightActions = (message) => (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.rightActionsContainer}>
        <Animated.View
          style={[
            styles.swipeActionButton,
            {
              opacity: trans,
              transform: [{ scale: trans }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.swipeActionButton, styles.replyButton]}
            onPress={() => handleReply(message)}
          >
            <Reply color="#FFFFFF" size={24} />
            <Text style={styles.swipeActionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeActionButton, styles.editButton]}
            onPress={() => handleEdit(message)}
          >
            <Edit color="#FFFFFF" size={24} />
            <Text style={styles.swipeActionText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // delete msg
  const renderLeftActions = (message) => (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    const onDeletePress = () => {
      console.log("Delete pressed for message:", message.id); // Add this for debugging
      handleDelete(message.id);
      // Close the swipeable after pressing
      swipeableRefs.current.get(message.id)?.close();
    };

    return (
      <TouchableOpacity
        style={[styles.swipeDeleteContainer]}
        onPress={onDeletePress}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.deleteButton,
            {
              opacity: trans,
              transform: [{ scale: trans }],
            },
          ]}
        >
          <Trash color="#FFFFFF" size={32} />
          <Text style={styles.swipeActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderMessage = (message) => (
    <Swipeable
      ref={(ref) => {
        if (ref) swipeableRefs.current.set(message.id, ref);
      }}
      renderRightActions={renderRightActions(message)}
      renderLeftActions={renderLeftActions(message)}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
    >
      <View style={styles.messageContainer}>
        {message.replyTo && (
          <View style={styles.replyBubble}>
            <View style={styles.replyLine} />
            <Text style={styles.replyText} numberOfLines={2}>
              {message.replyTo.text}
            </Text>
          </View>
        )}
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{message.text}</Text>
          {message.edited && <Text style={styles.editedText}>edited</Text>}
        </View>
        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message) => (
            <View key={message.id}>{renderMessage(message)}</View>
          ))}
        </ScrollView>

        {(replyingTo || editingMessage) && (
          <View style={styles.previewContainer}>
            <View style={styles.previewContent}>
              <Text style={styles.previewText} numberOfLines={1}>
                {replyingTo
                  ? `Replying to: ${replyingTo.text}`
                  : `Editing message`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                setInputText("");
              }}
              style={styles.closeButton}
            >
              <X color="#999" size={20} />
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inputContainer}
        >
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.iconButton}>
              <Paperclip color="#7C7C7C" size={24} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={editingMessage ? "Edit message" : "Message"}
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity style={styles.iconButton}>
              <Camera color="#7C7C7C" size={24} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
              <Mic color="#7C7C7C" size={24} />
            </TouchableOpacity>

            {inputText.trim() ? (
              <TouchableOpacity onPress={sendMessage} style={styles.iconButton}>
                <Send color="#2196F3" size={24} />
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0", // Matching the screenshot background
  },
  messageList: {
    flex: 1,
    padding: 16,
  },

  messageText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  editedText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  timestamp: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  rightActionsContainer: {
    flexDirection: "row",
    width: 160, // Space for both Reply and Edit
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  replyButton: {
    backgroundColor: "#2196F3",
  },
  editButton: {
    backgroundColor: "#4CAF50",
  },

  messageContainer: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    marginBottom: 8,
  },
  replyBubble: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 8,
    marginBottom: 4,
    position: "relative",
  },
  replyLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#2196F3",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  replyText: {
    color: "#666666",
    fontSize: 14,
    marginLeft: 8,
  },
  messageBubble: {
    backgroundColor: "#2196F3",
    borderRadius: 20,
    padding: 12,
    paddingVertical: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    paddingHorizontal: 10,
  },
  swipeDeleteContainer: {
    width: 90,
    backgroundColor: "#FF3B30",
  },
  swipeActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 4,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  previewContent: {
    flex: 1,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
    paddingLeft: 8,
  },
  previewText: {
    color: "#666666",
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    backgroundColor: "#FFFFFF",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
    color: "#000000",
  },
  iconButton: {
    padding: 8,
  },
});

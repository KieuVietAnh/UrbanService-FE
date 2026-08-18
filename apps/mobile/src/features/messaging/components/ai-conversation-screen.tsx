import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';

import { Text, AppHeader } from '@/components/ui';
import {
  AppEmptyState,
  AppErrorState,
  useToast,
} from '@/components/shared';
import { KeyboardAwareComposerLayout } from '@/components/layouts';
import { semantics } from '@/theme/semantics';

import MessageComposer from './message-composer';
import type { AiMessage } from '../types/messaging.types';
import { messagingApi, messagingKeys } from '../api';

type ApiRecord = Record<string, unknown>;

const isApiRecord = (value: unknown): value is ApiRecord =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const getErrorMessage = (value: unknown): string | null => {
  if (
    !isApiRecord(value) ||
    typeof value.message !== 'string'
  ) {
    return null;
  }

  return value.message;
};

const formatTime = (value: string) => {
  if (!value) return '';

  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeMessage = (
  raw: unknown,
): AiMessage | null => {
  if (!isApiRecord(raw)) return null;

  const nestedData = isApiRecord(raw.data)
    ? raw.data
    : {};

  const id = String(
    raw.messageId ??
      raw.id ??
      raw.uuid ??
      `${raw.createdAt ?? Date.now()}`,
  );

  const content =
    raw.messageText ??
    raw.message ??
    raw.reply ??
    raw.content ??
    nestedData.message ??
    nestedData.reply ??
    nestedData.messageText ??
    '';

  const senderRaw = String(
    raw.senderType ??
      raw.sender ??
      raw.role ??
      '',
  ).toLowerCase();

  const sender: AiMessage['sender'] =
    senderRaw.includes('user')
      ? 'user'
      : 'assistant';

  return {
    id,
    content: String(content),
    sender,
    createdAt: String(
      raw.createdAt ??
        raw.createdAtUtc ??
        new Date().toISOString(),
    ),
  };
};

const normalizeChatReply = (payload: unknown) => {
  const payloadRecord = isApiRecord(payload)
    ? payload
    : {};

  const data = isApiRecord(payloadRecord.data)
    ? payloadRecord.data
    : payloadRecord;

  const nestedData = isApiRecord(data.data)
    ? data.data
    : {};

  const conversation = isApiRecord(data.conversation)
    ? data.conversation
    : {};

  const result = isApiRecord(data.result)
    ? data.result
    : {};

  const message =
    data.message ??
    data.messageText ??
    data.reply ??
    data.content ??
    nestedData.message ??
    nestedData.reply ??
    nestedData.messageText ??
    '';

  const conversationId = String(
    data.conversationId ??
      data.conversationID ??
      data.id ??
      conversation.id ??
      result.conversationId ??
      '',
  );

  const createdAt =
    data.createdAt ??
    data.createdAtUtc ??
    new Date().toISOString();

  return {
    message: String(message),
    conversationId,
    createdAt: String(createdAt),
  };
};

export default function AiConversationDetailScreen() {
  const { conversationId } =
    useLocalSearchParams<{
      conversationId: string;
    }>();

  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const listRef =
    useRef<FlatList<AiMessage> | null>(null);

  const isPlaceholderConversation =
    conversationId === 'ai-assistant';

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AiMessage[]>({
    queryKey: messagingKeys.aiMessages(
      conversationId ?? '',
    ),

    queryFn: async () => {
      if (!conversationId) {
        return [];
      }

      if (isPlaceholderConversation) {
        return [
          {
            id: 'welcome',
            content:
              'Xin chào! Mình là trợ lý AI. Hãy hỏi về phản ánh, trạng thái xử lý hoặc hướng dẫn nhanh.',
            sender: 'assistant',
            createdAt: new Date().toISOString(),
          },
        ];
      }

      const raw =
        await messagingApi.getAiConversationMessages(
          conversationId,
        );

      if (!Array.isArray(raw)) {
        return [];
      }

      return raw
        .map(normalizeMessage)
        .filter(
          (
            message,
          ): message is AiMessage =>
            Boolean(message?.content),
        );
    },

    enabled: Boolean(conversationId),
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const messages = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const scrollToBottom = useCallback(
    (animated = true) => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({
          animated,
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!messages.length) {
      return undefined;
    }

    const timer = setTimeout(() => {
      scrollToBottom(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [messages.length, scrollToBottom]);

  const sendMutation = useMutation({
    mutationFn: async (
      messageText: string,
    ) => {
      if (isPlaceholderConversation) {
        return messagingApi.sendAiMessage({
          message: messageText,
        });
      }

      return messagingApi.sendAiMessage({
        conversationId,
        message: messageText,
      });
    },

    onMutate: async (
      messageText: string,
    ) => {
      const queryKey =
        messagingKeys.aiMessages(
          conversationId ?? '',
        );

      await queryClient.cancelQueries({
        queryKey,
      });

      const tempId = `temp-${Date.now()}`;

      const optimistic: AiMessage = {
        id: tempId,
        content: messageText,
        sender: 'user',
        createdAt:
          new Date().toISOString(),
      };

      queryClient.setQueryData<AiMessage[]>(
        queryKey,
        (old) => {
          const arr = Array.isArray(old)
            ? old
            : [];

          return [...arr, optimistic];
        },
      );

      setTimeout(() => {
        scrollToBottom(true);
      }, 80);

      return { tempId };
    },

    onSuccess: (response) => {
      const reply =
        normalizeChatReply(response);

      const currentQueryKey =
        messagingKeys.aiMessages(
          conversationId ?? '',
        );

      queryClient.setQueryData<AiMessage[]>(
        currentQueryKey,
        (old) => {
          const arr = Array.isArray(old)
            ? old
            : [];

          if (!reply.message) {
            return arr;
          }

          return [
            ...arr,
            {
              id: `ai-${Date.now()}`,
              content: reply.message,
              sender: 'assistant',
              createdAt: reply.createdAt,
            },
          ];
        },
      );

      void queryClient.invalidateQueries({
        queryKey:
          messagingKeys.aiConversations(),
        refetchType: 'none',
      });

      if (
        reply.conversationId &&
        reply.conversationId !==
          conversationId
      ) {
        const optimisticHistory =
          queryClient.getQueryData<
            AiMessage[]
          >(currentQueryKey);

        queryClient.setQueryData(
          messagingKeys.aiMessages(
            reply.conversationId,
          ),
          optimisticHistory,
        );

        void queryClient.invalidateQueries({
          queryKey:
            messagingKeys.aiMessages(
              reply.conversationId,
            ),
          refetchType: 'none',
        });

        router.replace(
          `/(resident)/ai/${reply.conversationId}`,
        );
      }

      scrollToBottom(true);

      setTimeout(() => {
        scrollToBottom(true);
      }, 200);
    },

    onError: () => {
      if (__DEV__) {
        console.warn(
          'AI message send failed',
        );
      }

      toast.error(
        'Gửi tin nhắn AI thất bại. Vui lòng thử lại.',
      );
    },
  });

  const handleSend = async (
    text: string,
  ) => {
    if (
      !text.trim() ||
      !conversationId
    ) {
      return;
    }

    try {
      await sendMutation.mutateAsync(
        text,
      );
    } catch {
      // Mutation callbacks handle UI feedback.
    }
  };

  const renderMessage = ({
    item,
  }: {
    item: AiMessage;
  }) => {
    const isUser =
      item.sender === 'user';

    return (
      <View
        style={[
          styles.messageWrap,
          isUser
            ? styles.messageOwnWrap
            : styles.messageOtherWrap,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.messageOwn
              : styles.messageOther,
          ]}
        >
          <Text
            style={[
              styles.messageSender,
              isUser
                ? styles.messageSenderOwn
                : styles.messageSenderOther,
            ]}
          >
            {isUser
              ? 'Bạn'
              : 'Trợ lý AI'}
          </Text>

          <Text
            style={[
              styles.messageText,
              isUser
                ? styles.messageTextOwn
                : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isUser
                ? styles.messageTimeOwn
                : styles.messageTimeOther,
            ]}
          >
            {formatTime(
              item.createdAt,
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <AppHeader
          showBack
          title="Trợ lý AI"
          subtitle="Câu chuyện của bạn"
        />

        {isError &&
        messages.length === 0 ? (
          <AppErrorState
            onRetry={refetch}
          >
            {getErrorMessage(error) ||
              'Không thể tải hội thoại AI.'}
          </AppErrorState>
        ) : (
          <KeyboardAwareComposerLayout
            composer={
              <View
                style={
                  styles.composerContainer
                }
              >
                <View
                  style={
                    styles.composerWrap
                  }
                >
                  <Text
                    style={
                      styles.composerLabel
                    }
                  >
                    Gửi câu hỏi đến AI
                  </Text>

                  <MessageComposer
                    onSend={handleSend}
                    sending={
                      sendMutation.isPending ||
                      isLoading
                    }
                    onFocus={() =>
                      scrollToBottom(true)
                    }
                  />
                </View>
              </View>
            }
          >
            <View style={styles.container}>
              <View
                style={styles.chatBody}
              >
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(item) =>
                    item.id
                  }
                  renderItem={
                    renderMessage
                  }
                  contentContainerStyle={
                    styles.listContent
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  onContentSizeChange={() => {
                    setTimeout(
                      () =>
                        scrollToBottom(
                          true,
                        ),
                      60,
                    );
                  }}
                  onLayout={() => {
                    setTimeout(
                      () =>
                        scrollToBottom(
                          true,
                        ),
                      60,
                    );
                  }}
                  style={styles.list}
                  refreshControl={
                    <RefreshControl
                      refreshing={
                        isRefetching
                      }
                      onRefresh={refetch}
                      tintColor={
                        semantics.text
                          .brand
                      }
                    />
                  }
                  ListEmptyComponent={
                    isLoading ? (
                      <View
                        style={
                          styles.initialLoading
                        }
                      >
                        <ActivityIndicator
                          size="large"
                          color={
                            semantics
                              .text.brand
                          }
                        />
                      </View>
                    ) : (
                      <AppEmptyState
                        icon={
                          <Icon
                            name="cpu"
                            size={40}
                            color={
                              semantics
                                .text
                                .lightMuted
                            }
                          />
                        }
                      >
                        Chưa có tin
                        nhắn nào trong
                        hội thoại này.
                        Gửi tin nhắn để
                        bắt đầu.
                      </AppEmptyState>
                    )
                  }
                />
              </View>
            </View>
          </KeyboardAwareComposerLayout>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      semantics.bg.app,
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  composerContainer: {
    borderTopWidth: 1,
    borderTopColor:
      semantics.border.default,
    backgroundColor:
      semantics.bg.surface,
  },

  chatBody: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    paddingBottom: 16,
    flexGrow: 1,
  },

  initialLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },

  composerWrap: {
    width: '100%',
    marginTop: 0,
    backgroundColor:
      semantics.bg.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'stretch',
  },

  composerLabel: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: semantics.text.muted,
    marginBottom: 8,
  },

  messageWrap: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  messageOwnWrap: {
    justifyContent: 'flex-end',
  },

  messageOtherWrap: {
    justifyContent: 'flex-start',
  },

  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    padding: 14,
  },

  messageOwn: {
    backgroundColor:
      semantics.bg.primarySoft,
  },

  messageOther: {
    backgroundColor:
      semantics.bg.surface,
    borderWidth: 1,
    borderColor:
      semantics.border.default,
  },

  messageSender: {
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
    marginBottom: 6,
  },

  messageSenderOwn: {
    color: semantics.text.brand,
  },

  messageSenderOther: {
    color: semantics.text.muted,
  },

  messageText: {
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    lineHeight: 22,
  },

  messageTextOwn: {
    color: semantics.text.primary,
  },

  messageTextOther: {
    color: semantics.text.primary,
  },

  messageTime: {
    marginTop: 8,
    fontSize: 11,
    color:
      semantics.text.lightMuted,
    textAlign: 'right',
  },

  messageTimeOwn: {
    color:
      semantics.text.lightMuted,
  },

  messageTimeOther: {
    color:
      semantics.text.lightMuted,
  },
});
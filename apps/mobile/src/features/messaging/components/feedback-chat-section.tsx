import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { KeyboardAwareComposerLayout } from '@/components/layouts';
import {
  AppErrorState,
  useToast,
} from '@/components/shared';
import { semantics } from '@/theme/semantics';

import MessageBubble, {
  ChatMessage,
} from './feedback-message-bubble';
import MessageComposer from './message-composer';
import {
  messagingApi,
  messagingKeys,
} from '../api';

const MESSAGE_POLL_INTERVAL_MS = 2000;

const getPersistedMessageId = (
  message: ChatMessage | null | undefined,
) => {
  const record = message as
    | (ChatMessage & {
        interactionMessageId?: string | number;
      })
    | null
    | undefined;

  const value =
    record?.messageId ??
    record?.interactionMessageId ??
    record?.id;

  if (
    !value ||
    String(value).startsWith('temp-')
  ) {
    return null;
  }

  return String(value);
};

const dedupeMessages = (
  items: ChatMessage[],
) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const persistedId =
      getPersistedMessageId(item);

    if (!persistedId) {
      return true;
    }

    if (seen.has(persistedId)) {
      return false;
    }

    seen.add(persistedId);
    return true;
  });
};

export default function FeedbackChatSection({
  feedbackId,
}: {
  feedbackId: string;
}) {
  const queryClient =
    useQueryClient();

  const toast = useToast();

  const [isAppActive, setIsAppActive] =
    useState(
      AppState.currentState === 'active',
    );

  const [
    isScreenFocused,
    setIsScreenFocused,
  ] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);

      return () =>
        setIsScreenFocused(false);
    }, []),
  );

  const listRef =
    useRef<FlatList<ChatMessage> | null>(
      null,
    );

  const {
    data: messages = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ChatMessage[]>({
    queryKey:
      messagingKeys.feedbackMessages(
        feedbackId,
      ),

    queryFn: async () => {
      const remoteMessages =
        await messagingApi.getFeedbackMessages(
          feedbackId,
        );

      const cachedMessages =
        queryClient.getQueryData<
          ChatMessage[]
        >(
          messagingKeys.feedbackMessages(
            feedbackId,
          ),
        );

      const optimisticMessages =
        Array.isArray(cachedMessages)
          ? cachedMessages.filter(
              (message) =>
                String(
                  message.id,
                ).startsWith('temp-'),
            )
          : [];

      return dedupeMessages([
        ...remoteMessages,
        ...optimisticMessages,
      ]);
    },

    enabled:
      Boolean(feedbackId) &&
      isAppActive &&
      isScreenFocused,

    refetchInterval:
      isAppActive && isScreenFocused
        ? MESSAGE_POLL_INTERVAL_MS
        : false,

    refetchIntervalInBackground: false,

    staleTime: 1000,
  });

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (nextState) => {
          setIsAppActive(
            nextState === 'active',
          );
        },
      );

    return () =>
      subscription.remove();
  }, []);

  useEffect(() => {
    if (
      !isAppActive ||
      !isScreenFocused ||
      !feedbackId
    ) {
      return;
    }

    void queryClient.refetchQueries({
      queryKey:
        messagingKeys.feedbackMessages(
          feedbackId,
        ),
      type: 'active',
    });
  }, [
    feedbackId,
    isAppActive,
    isScreenFocused,
    queryClient,
  ]);

  const scrollToBottom = (
    animated = true,
  ) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({
        animated,
      });
    });
  };

  useEffect(() => {
    if (!messages.length) {
      return undefined;
    }

    const timer = setTimeout(() => {
      scrollToBottom(true);
    }, 150);

    return () =>
      clearTimeout(timer);
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (
      messageText: string,
    ) =>
      messagingApi.sendFeedbackMessage(
        feedbackId,
        messageText,
      ),

    onMutate: async (
      text: string,
    ) => {
      const queryKey =
        messagingKeys.feedbackMessages(
          feedbackId,
        );

      await queryClient.cancelQueries({
        queryKey,
      });

      const tempId =
        `temp-${Date.now()}`;

      const optimistic: ChatMessage = {
        id: tempId,
        feedbackId,
        senderName: 'Bạn',
        senderType: 'ServiceUser',
        messageText: text,
        createdAt:
          new Date().toISOString(),
      };

      queryClient.setQueryData<
        ChatMessage[]
      >(queryKey, (old) => {
        const arr = Array.isArray(old)
          ? old
          : [];

        return dedupeMessages([
          ...arr,
          optimistic,
        ]);
      });

      setTimeout(() => {
        scrollToBottom(true);
      }, 80);

      return { tempId };
    },

    onSuccess: (
      serverMessage,
      _text,
      context,
    ) => {
      const persistedMessage =
        serverMessage as ChatMessage | null;

      const persistedId =
        getPersistedMessageId(
          persistedMessage,
        );

      queryClient.setQueryData<
        ChatMessage[]
      >(
        messagingKeys.feedbackMessages(
          feedbackId,
        ),
        (old) => {
          const current =
            Array.isArray(old)
              ? old
              : [];

          const withoutOptimistic =
            current.filter(
              (message) =>
                message.id !==
                context?.tempId,
            );

          return persistedMessage &&
            persistedId
            ? dedupeMessages([
                ...withoutOptimistic,
                persistedMessage,
              ])
            : withoutOptimistic;
        },
      );

      void queryClient.invalidateQueries({
        queryKey:
          messagingKeys.feedbackMessages(
            feedbackId,
          ),
      });

      void queryClient.invalidateQueries({
        queryKey:
          messagingKeys.supportThreads(),
        refetchType: 'none',
      });

      setTimeout(() => {
        scrollToBottom(true);
      }, 200);
    },

    onError: () => {
      if (__DEV__) {
        console.warn(
          'Feedback message send failed',
        );
      }

      toast.error(
        'Không thể gửi tin nhắn',
      );
    },
  });

  const handleSend = async (
    text: string,
  ) => {
    if (
      !text.trim() ||
      !feedbackId
    ) {
      return;
    }

    try {
      await sendMutation.mutateAsync(
        text,
      );
    } catch {
      // Mutation callback handles toast.
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
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
              <MessageComposer
                onSend={handleSend}
                sending={
                  !feedbackId ||
                  sendMutation.isPending ||
                  isLoading
                }
                onFocus={() => {
                  setTimeout(() => {
                    listRef.current?.scrollToEnd(
                      {
                        animated: true,
                      },
                    );
                  }, 80);
                }}
                containerStyle={
                  styles.feedbackComposer
                }
              />
            </View>
          </View>
        }
      >
        <View style={styles.wrap}>
          <View
            style={styles.headerRow}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Trao đổi
            </Text>
          </View>

          <View
            style={styles.chatBody}
          >
            <View
              style={styles.listWrap}
            >
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(
                  m,
                  i,
                ) =>
                  String(
                    m?.id ??
                      m?.messageId ??
                      m?.tempId ??
                      `${
                        m?.createdAt ??
                        ''
                      }-${i}`,
                  )
                }
                renderItem={({
                  item,
                }) => (
                  <MessageBubble
                    msg={item}
                  />
                )}
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
                  ) : isError ? (
                    <AppErrorState
                      onRetry={
                        refetch
                      }
                    >
                      Không thể tải
                      cuộc hội thoại
                      này.
                    </AppErrorState>
                  ) : (
                    <View
                      style={
                        styles.empty
                      }
                    >
                      <Text
                        style={
                          styles.emptyTitle
                        }
                      >
                        Chưa có trao
                        đổi
                      </Text>

                      <Text
                        style={
                          styles.emptySub
                        }
                      >
                        Bạn có thể hỏi
                        nhân viên hỗ
                        trợ về phản
                        ánh này.
                      </Text>
                    </View>
                  )
                }
                contentContainerStyle={
                  styles.listContent
                }
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onContentSizeChange={() => {
                  setTimeout(() => {
                    scrollToBottom(
                      true,
                    );
                  }, 50);
                }}
                style={
                  styles.list
                }
              />
            </View>
          </View>
        </View>
      </KeyboardAwareComposerLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      semantics.bg.surface,
  },

  wrap: {
    flex: 1,
    marginTop: 8,
    backgroundColor:
      semantics.bg.surface,
    borderTopWidth: 1,
    borderTopColor:
      semantics.border.default,
    position: 'relative',
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
  },

  listWrap: {
    flex: 1,
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingVertical: 10,
    paddingBottom: 16,
    flexGrow: 1,
  },

  initialLoading: {
    flex: 1,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerWrap: {
    width: '100%',
    backgroundColor:
      semantics.bg.surface,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'stretch',
  },

  /*
   * Chỉ áp dụng cho Feedback Chat.
   * Giảm padding dọc từ mặc định 8 xuống 5
   * để composer gọn và thấp hơn một chút.
   */
  feedbackComposer: {
    paddingTop: 5,
    paddingBottom: 5,
  },

  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },

  sectionTitle: {
    fontSize: 12,
    fontFamily:
      'Geist-SemiBold',
    color:
      semantics.text.lightMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  empty: {
    padding: 20,
    alignItems: 'center',
  },

  emptyTitle: {
    fontFamily:
      'Geist-SemiBold',
    fontSize: 14,
    color:
      semantics.text.primary,
    marginBottom: 6,
  },

  emptySub: {
    fontFamily:
      'Geist-Regular',
    fontSize: 13,
    color:
      semantics.text.muted,
    textAlign: 'center',
  },
});
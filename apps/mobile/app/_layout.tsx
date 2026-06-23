import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApi } from '@/config/api';

// Create a query client
const queryClient = new QueryClient();

export default function RootLayout() {
  React.useEffect(() => {
    initApi();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
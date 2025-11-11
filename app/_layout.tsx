import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpc, trpcClient } from "@/lib/trpc";
import { AuthContext } from "@/contexts/AuthContext";
import { ChatContext } from "@/contexts/ChatContext";
import { StyleSheet } from "react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Geri" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="admin/login" options={{ title: "Admin Girişi" }} />
      <Stack.Screen name="admin/dashboard" options={{ title: "Admin Paneli" }} />
      <Stack.Screen name="post/[id]" options={{ title: "Gönderi" }} />
      <Stack.Screen name="profile/[id]" options={{ title: "Profil" }} />
      <Stack.Screen name="chat/[roomId]" options={{ title: "Sohbet" }} />
      <Stack.Screen name="create-post" options={{ headerShown: false }} />
      <Stack.Screen name="all-users" options={{ title: "Kullanıcılar" }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/settings" options={{ title: "Ayarlar" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <ChatContext>
            <GestureHandlerRootView style={styles.container}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </ChatContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

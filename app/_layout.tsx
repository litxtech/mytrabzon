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
      <Stack.Screen name="admin/dashboard" options={{ title: "Admin Paneli" }} />
      <Stack.Screen name="admin/users" options={{ title: "Kullanıcı Yönetimi" }} />
      <Stack.Screen name="admin/policies" options={{ title: "Politika Yönetimi" }} />
      <Stack.Screen name="admin/company-info" options={{ title: "Şirket Bilgileri" }} />
      <Stack.Screen name="admin/support" options={{ title: "Destek Ticket'ları" }} />
      <Stack.Screen name="admin/policy-view/[id]" options={{ title: "Politika" }} />
      <Stack.Screen name="post/[id]" options={{ title: "Gönderi" }} />
      <Stack.Screen name="profile/[id]" options={{ title: "Profil" }} />
      <Stack.Screen name="chat/[roomId]" options={{ title: "Sohbet" }} />
      <Stack.Screen name="create-post" options={{ headerShown: false }} />
      <Stack.Screen name="all-users" options={{ title: "Kullanıcılar" }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/settings" options={{ title: "Ayarlar" }} />
      <Stack.Screen name="kyc/verify" options={{ headerShown: false }} />
      <Stack.Screen name="admin/kyc" options={{ title: "KYC Başvuruları" }} />
      <Stack.Screen name="ktu/verify" options={{ title: "Öğrenci Doğrulama" }} />
      <Stack.Screen name="ktu/announcements" options={{ title: "Duyurular" }} />
      <Stack.Screen name="ktu/events" options={{ title: "Etkinlikler" }} />
      <Stack.Screen name="ktu/clubs" options={{ title: "Kulüpler" }} />
      <Stack.Screen name="ktu/notes" options={{ title: "Ders Notları" }} />
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

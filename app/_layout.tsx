import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpc, trpcClient } from "@/lib/trpc";
import { AuthContext } from "@/contexts/AuthContext";
import { ChatContext } from "@/contexts/ChatContext";
import { StyleSheet, Linking } from "react-native";
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, addNotificationResponseReceivedListener } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 dakika - veri 5 dakika boyunca fresh kalır
      gcTime: 10 * 60 * 1000, // 10 dakika - cache'de tutulma süresi (eski cacheTime)
      refetchOnWindowFocus: false, // Pencere focus olduğunda otomatik refetch yapma
      refetchOnMount: false, // Mount olduğunda otomatik refetch yapma (cache'den kullan)
      refetchOnReconnect: true, // Bağlantı yenilendiğinde refetch yap
      retry: 1, // Hata durumunda sadece 1 kez tekrar dene
      retryDelay: 1000, // Retry arası 1 saniye bekle
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Geri" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="admin/dashboard" options={{ title: "Admin Paneli" }} />
      <Stack.Screen name="admin/users" options={{ title: "Kullanıcı Yönetimi" }} />
      <Stack.Screen name="admin/policies" options={{ title: "Politika Yönetimi" }} />
      <Stack.Screen name="admin/company-info" options={{ title: "Şirket Bilgileri" }} />
      <Stack.Screen name="admin/support" options={{ title: "Destek Ticket'ları" }} />
      <Stack.Screen name="admin/policy-view/[id]" options={{ title: "Politika" }} />
      <Stack.Screen name="post/[id]" options={{ title: "Gönderi" }} />
      <Stack.Screen name="profile/[id]" options={{ title: "Profil" }} />
            <Stack.Screen name="chat/[roomId]" options={{ title: "Sohbet" }} />
            <Stack.Screen name="chat/create-group" options={{ title: "Yeni Grup" }} />
            <Stack.Screen name="chat/new-message" options={{ title: "Yeni Mesaj" }} />
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
      <Stack.Screen name="football/create-match" options={{ title: "Maç Oluştur" }} />
      <Stack.Screen name="football/match/[id]" options={{ title: "Maç Detayı" }} />
      <Stack.Screen name="football/missing-players" options={{ title: "Eksik Oyuncu" }} />
      <Stack.Screen name="football/teams" options={{ title: "Takımlar" }} />
      <Stack.Screen name="football/fields" options={{ title: "Saha Rehberi" }} />
      <Stack.Screen name="football/field/[id]" options={{ title: "Saha Detayı" }} />
      <Stack.Screen name="football/create-team" options={{ title: "Takım Oluştur" }} />
      <Stack.Screen name="football/team/[id]" options={{ title: "Takım Detayı" }} />
      <Stack.Screen name="university/giresun" options={{ title: "Giresun Üniversitesi" }} />
      <Stack.Screen name="match/video/[sessionId]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const deepLinkListener = useRef<{ remove: () => void } | null>(null);
  const router = useRouter();

  useEffect(() => {

    // Deep link handling - Uygulama açılmadan önce gelen link
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('Initial URL:', initialUrl);
          await handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    // Deep link handling fonksiyonu
    const handleDeepLink = async (url: string) => {
      try {
        console.log('Handling deep link:', url);

        // Manuel URL parsing (custom scheme'ler için)
        const parseDeepLink = (urlString: string) => {
          const params: Record<string, string> = {};
          
          // Query string'i bul
          const queryIndex = urlString.indexOf('?');
          if (queryIndex === -1) return params;
          
          const queryString = urlString.substring(queryIndex + 1);
          const pairs = queryString.split('&');
          
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          }
          
          return params;
        };

        // mytrabzon:// veya litxtech:// scheme kontrolü
        if (url.startsWith('mytrabzon://') || url.startsWith('litxtech://')) {
          const params = parseDeepLink(url);
          
          // Reset password
          if (url.includes('reset-password')) {
            const accessToken = params.access_token;
            const refreshToken = params.refresh_token;
            const type = params.type;

            console.log('Reset password params:', { hasToken: !!accessToken, hasRefresh: !!refreshToken, type });

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!error) {
                console.log('Session set successfully for reset password');
                router.replace('/auth/reset-password');
                return;
              } else {
                console.error('Session set error:', error);
              }
            }
          }

          // Callback (OAuth)
          if (url.includes('callback')) {
            console.log('OAuth callback received:', url);
            const accessToken = params.access_token;
            const refreshToken = params.refresh_token;

            console.log('Tokens received:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                console.error('Session set error:', sessionError);
                return;
              }

              console.log('Session set successfully');

              // Session'ı tekrar kontrol et
              const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
              
              if (getSessionError) {
                console.error('Get session error:', getSessionError);
                return;
              }

              if (session?.user) {
                console.log('User authenticated:', session.user.id);
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();

                if (profile && profile.full_name) {
                  console.log('Profile found, redirecting to feed');
                  router.replace('/(tabs)/feed');
                } else {
                  console.log('Profile not found, redirecting to onboarding');
                  router.replace('/auth/onboarding');
                }
              } else {
                console.log('No session found after setting tokens');
              }
              return;
            } else {
              console.log('Missing tokens in callback URL');
            }
          }

          // Onboarding
          if (url.includes('onboarding')) {
            router.replace('/auth/onboarding');
            return;
          }
        }

        // Supabase web URL'inden deep link'e yönlendirme
        if (url.includes('supabase.co') && url.includes('redirect_to=')) {
          const redirectMatch = url.match(/redirect_to=([^&]+)/);
          if (redirectMatch) {
            const redirectUrl = decodeURIComponent(redirectMatch[1]);
            console.log('Redirecting to:', redirectUrl);
            if (redirectUrl.startsWith('mytrabzon://') || redirectUrl.startsWith('litxtech://')) {
              await handleDeepLink(redirectUrl);
              return;
            }
          }
        }
      } catch (error: any) {
        console.error('Error handling deep link:', error.message);
      }
    };

    // İlk URL'i kontrol et
    handleInitialURL();

    // Deep link listener (uygulama açıkken link'e tıklanırsa)
    deepLinkListener.current = Linking.addEventListener('url', async (event) => {
      console.log('Deep link received:', event.url);
      await handleDeepLink(event.url);
    });

    // Push notification kaydı (Expo Go'da çalışmaz, try-catch ile sarmalıyoruz)
    try {
      registerForPushNotifications()
        .then(token => {
          if (token) {
            console.log('Push notification token:', token);
          }
        })
        .catch(err => {
          console.log('Push notification registration failed (normal in Expo Go):', err.message);
        });
    } catch (err: any) {
      console.log('Push notification setup failed (normal in Expo Go):', err.message);
    }

    // Bildirim geldiğinde
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });
    } catch (err: any) {
      console.log('Notification listener setup failed (normal in Expo Go):', err.message);
    }

    // Bildirime tıklandığında
    try {
      responseListener.current = addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log('Notification response:', data);
        
        // Bildirim tipine göre yönlendirme
        if (data?.type === 'match') {
          router.push(`/football/match/${data.matchId}` as any);
        } else if (data?.type === 'missing_player') {
          router.push('/football/missing-players' as any);
        } else if (data?.type === 'team') {
          router.push(`/football/team/${data.teamId}` as any);
        } else if (data?.type === 'chat') {
          router.push(`/chat/${data.roomId}` as any);
        } else if (data?.type === 'post') {
          router.push(`/post/${data.postId}` as any);
        } else if (data?.type === 'EVENT' || data?.event_id) {
          // Event bildirimi - feed'e yönlendir veya event detay sayfasına
          router.push('/(tabs)/feed' as any);
        }
      });
    } catch (err: any) {
      console.log('Notification response listener setup failed (normal in Expo Go):', err.message);
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
      } catch (err: any) {
        console.log('Failed to remove notification listener:', err.message);
      }
      try {
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (err: any) {
        console.log('Failed to remove response listener:', err.message);
      }
      try {
        if (deepLinkListener.current) {
          deepLinkListener.current.remove();
        }
      } catch (err: any) {
        console.log('Failed to remove deep link listener:', err.message);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <ChatContext>
            <ThemeProvider>
              <GestureHandlerRootView style={styles.container}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </ThemeProvider>
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

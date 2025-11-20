import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpc, trpcClient } from "@/lib/trpc";

// Expo Go için BottomSheetModalProvider gerekmez (CommentSheetExpoGo Modal kullanıyor)
const BottomSheetModalProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { AuthContext } from "@/contexts/AuthContext";
import { ChatContext } from "@/contexts/ChatContext";
import { StyleSheet, Linking, Alert } from "react-native";
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, addNotificationResponseReceivedListener } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "@/lib/debug-supabase"; // Supabase bağlantı testi için
import { ProximityManager } from "@/components/ProximityManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
      <Stack.Screen name="video-feed" options={{ title: "Video", headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ title: "Profil" }} />
            <Stack.Screen name="chat/[roomId]" options={{ title: "Sohbet" }} />
            <Stack.Screen name="chat/create-group" options={{ title: "Yeni Grup" }} />
            <Stack.Screen name="chat/new-message" options={{ title: "Yeni Mesaj" }} />
      <Stack.Screen name="create-post" options={{ headerShown: false }} />
      <Stack.Screen name="all-users" options={{ title: "Kullanıcılar" }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/settings" options={{ title: "Ayarlar" }} />
      <Stack.Screen name="profile/followers" options={{ title: "Takipçiler" }} />
      <Stack.Screen name="profile/following" options={{ title: "Takip Edilenler" }} />
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
      <Stack.Screen name="ride/create" options={{ title: "Yeni Yolculuk" }} />
      <Stack.Screen name="ride/search" options={{ title: "Yolculuk Ara" }} />
      <Stack.Screen name="ride/[id]" options={{ title: "Yolculuk Detayı" }} />
      <Stack.Screen name="profile/my-matches" options={{ title: "Paylaşılan Maçlar" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const deepLinkListener = useRef<{ remove: () => void } | null>(null);
  const router = useRouter();
  const handleCallNavigation = useCallback((callData: any) => {
    if (!callData?.callerId) {
      return;
    }

    router.push({
      pathname: '/call/[userId]',
      params: {
        userId: callData.callerId,
        userName: callData.callerName || 'Kullanıcı',
        userAvatar: callData.callerAvatar || '',
        callType: callData.callType || 'audio',
        sessionId: callData.sessionId || '',
      },
    } as any);
  }, [router]);

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
              try {
                params[decodeURIComponent(key)] = decodeURIComponent(value);
              } catch (e) {
                // Decode hatası - raw value kullan
                params[key] = value;
              }
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

          // Callback (OAuth) - Deep link formatı: mytrabzon://auth/callback?code=xxx
          // Callback ekranına yönlendir - orada exchangeCodeForSession ile işlenecek
          if (url.includes('auth/callback') || url.includes('callback')) {
            console.log('🔐 [DeepLink] OAuth callback detected, routing to callback screen');
            router.replace('/auth/callback');
            return;
          }
          
          // Eski callback handling kodu - artık kullanılmıyor
          if (false && url.includes('callback')) {
            console.log('OAuth callback received (deep link):', url);
            
            // Hash fragment'i de kontrol et (# ile başlayan kısım)
            const hashIndex = url.indexOf('#');
            if (hashIndex !== -1) {
              const hashPart = url.substring(hashIndex + 1);
              const hashPairs = hashPart.split('&');
              for (const pair of hashPairs) {
                const [key, value] = pair.split('=');
                if (key && value) {
                  try {
                    params[decodeURIComponent(key)] = decodeURIComponent(value);
                  } catch (e) {
                    params[key] = value;
                  }
                }
              }
            }
            
            const accessToken = params.access_token;
            const refreshToken = params.refresh_token;
            const code = params.code; // OAuth code (eğer varsa)

            console.log('Tokens received:', { 
              hasAccessToken: !!accessToken, 
              hasRefreshToken: !!refreshToken,
              hasCode: !!code 
            });

            // Eğer code varsa, exchangeCodeForSession kullan
            if (code && !accessToken) {
              console.log('Exchanging code for session...');
              try {
                const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                  console.error('Code exchange error:', exchangeError);
                  // Code exchange başarısız olursa, redirect_to'ya yönlendir (token'lar orada olabilir)
                  const redirectUrl = params.redirect_to;
                  if (redirectUrl && (redirectUrl.startsWith('mytrabzon://') || redirectUrl.startsWith('litxtech://'))) {
                    await handleDeepLink(redirectUrl);
                    return;
                  }
                  return;
                }
                if (data.session?.user?.id) {
                  console.log('Session created from code exchange');
                  // Lazy loading - sadece full_name kontrolü için minimal select
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', data.session.user.id)
                    .single();

                  if (profile?.full_name) {
                    router.replace('/(tabs)/feed');
                  } else {
                    router.replace('/auth/onboarding');
                  }
                  return;
                }
              } catch (err) {
                console.error('Code exchange error:', err);
                // Hata durumunda redirect_to'ya yönlendir
                const redirectUrl = params.redirect_to;
                if (redirectUrl && (redirectUrl.startsWith('mytrabzon://') || redirectUrl.startsWith('litxtech://'))) {
                  await handleDeepLink(redirectUrl);
                  return;
                }
              }
            }

            // Token'lar varsa session'ı set et
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

              if (session?.user?.id) {
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
              console.log('Missing tokens in callback URL - checking for session...');
              // Token yoksa mevcut session'ı kontrol et
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();

                if (profile && profile.full_name) {
                  router.replace('/(tabs)/feed');
                } else {
                  router.replace('/auth/onboarding');
                }
                return;
              }
            }
          }

          // Onboarding
          if (url.includes('onboarding')) {
            router.replace('/auth/onboarding');
            return;
          }
        }

        // Supabase callback URL'ini işle - token'ları çıkar ve deep link'e yönlendir
        // Bu URL hem deep link olarak hem de browser'dan gelebilir
        if (url.includes('supabase.co') && (url.includes('/auth/v1/callback') || url.includes('redirect_to='))) {
          console.log('Supabase callback URL detected:', url);
          
          // URL'den token'ları ve redirect_to'yu çıkar (React Native'de URL constructor çalışmayabilir)
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          let redirectTo: string | null = null;
          let code: string | null = null;
          
          // Hash fragment'i kontrol et (# ile başlayan kısım - Supabase OAuth formatı)
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashPart = url.substring(hashIndex + 1);
            const hashPairs = hashPart.split('&');
            for (const pair of hashPairs) {
              const [key, value] = pair.split('=');
              if (key && value) {
                try {
                  const decodedKey = decodeURIComponent(key);
                  const decodedValue = decodeURIComponent(value);
                  if (decodedKey === 'access_token') accessToken = decodedValue;
                  if (decodedKey === 'refresh_token') refreshToken = decodedValue;
                  if (decodedKey === 'code') code = decodedValue;
                  if (decodedKey === 'redirect_to') redirectTo = decodedValue;
                } catch (e) {
                  // Decode hatası - raw value kullan
                  if (key === 'access_token') accessToken = value;
                  if (key === 'refresh_token') refreshToken = value;
                  if (key === 'code') code = value;
                  if (key === 'redirect_to') redirectTo = value;
                }
              }
            }
          }
          
          // Hash fragment yoksa query string'i kontrol et
          if (!accessToken && !refreshToken && !code) {
            try {
              // URL parse etmeyi dene
              const urlObj = new URL(url);
              accessToken = urlObj.searchParams.get('access_token');
              refreshToken = urlObj.searchParams.get('refresh_token');
              redirectTo = urlObj.searchParams.get('redirect_to');
              code = urlObj.searchParams.get('code');
            } catch (urlError) {
              // URL parse hatası - manuel parse
              console.log('URL parse failed, using manual parsing');
              const accessTokenMatch = url.match(/[?&]access_token=([^&]+)/);
              const refreshTokenMatch = url.match(/[?&]refresh_token=([^&]+)/);
              const redirectToMatch = url.match(/[?&]redirect_to=([^&]+)/);
              const codeMatch = url.match(/[?&]code=([^&]+)/);
              
              if (accessTokenMatch) accessToken = decodeURIComponent(accessTokenMatch[1]);
              if (refreshTokenMatch) refreshToken = decodeURIComponent(refreshTokenMatch[1]);
              if (redirectToMatch) redirectTo = decodeURIComponent(redirectToMatch[1]);
              if (codeMatch) code = decodeURIComponent(codeMatch[1]);
            }
          }
          
          console.log('Tokens from Supabase callback:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken,
            hasCode: !!code,
            redirectTo 
          });
          
          // Code varsa önce exchange et
          if (code && !accessToken) {
            console.log('Exchanging code for session from Supabase callback...');
            try {
              const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                console.error('Code exchange error from Supabase callback:', exchangeError);
              } else if (exchangeData.session) {
                console.log('Session created from code exchange in Supabase callback');
                accessToken = exchangeData.session.access_token;
                refreshToken = exchangeData.session.refresh_token;
              }
            } catch (err) {
              console.error('Code exchange error:', err);
            }
          }
          
          // Eğer token'lar varsa, session'ı set et ve redirect_to'ya yönlendir
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('Session set error from Supabase callback:', sessionError);
            } else {
              console.log('Session set successfully from Supabase callback');
              
              // redirect_to varsa oraya yönlendir
              if (redirectTo) {
                const decodedRedirect = decodeURIComponent(redirectTo);
                console.log('Redirecting to:', decodedRedirect);
                if (decodedRedirect.startsWith('mytrabzon://') || decodedRedirect.startsWith('litxtech://')) {
                  // Token'ları redirect URL'e ekle
                  const separator = decodedRedirect.includes('?') ? '&' : '?';
                  const redirectUrlWithTokens = `${decodedRedirect}${separator}access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
                  console.log('Redirecting to deep link with tokens:', redirectUrlWithTokens);
                  await handleDeepLink(redirectUrlWithTokens);
                  return;
                }
              }
              
              // redirect_to yoksa veya deep link değilse session kontrolü yap
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                // Lazy loading - sadece full_name kontrolü için minimal select
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', session.user.id)
                  .single();
                
                if (profile?.full_name) {
                  router.replace('/(tabs)/feed');
                } else {
                  router.replace('/auth/onboarding');
                }
                return;
              }
            }
          } else if (redirectTo) {
            // Token yok ama redirect_to var - redirect_to'ya yönlendir
            const decodedRedirect = decodeURIComponent(redirectTo);
            console.log('Redirecting to (no tokens):', decodedRedirect);
            if (decodedRedirect.startsWith('mytrabzon://') || decodedRedirect.startsWith('litxtech://')) {
              await handleDeepLink(decodedRedirect);
              return;
            }
          } else {
            // Token yok, redirect_to yok - session kontrolü yap
            console.log('No tokens or redirect_to, checking session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (profile && profile.full_name) {
                router.replace('/(tabs)/feed');
              } else {
                router.replace('/auth/onboarding');
              }
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
      // OAuth callback ise direkt callback ekranına yönlendir
      if (event.url.includes('auth/callback') || event.url.includes('callback')) {
        console.log('🔐 [DeepLink] OAuth callback detected (app running), routing to callback screen');
        router.replace('/auth/callback');
        return;
      }
      console.log('Deep link received:', event.url);
      await handleDeepLink(event.url);
    });

    // Supabase callback URL'ini dinle (browser'dan uygulamaya dönüş için)
    // OAuth provider authenticate edip Supabase callback URL'ine yönlendirdiğinde
    // Bu URL'i yakalayıp deep link'e yönlendirmemiz gerekiyor
    const checkSupabaseCallback = async () => {
      try {
        // Eğer uygulama Supabase callback URL'i ile açıldıysa
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (initialUrl.includes('supabase.co') || initialUrl.includes('/auth/v1/callback'))) {
          console.log('Supabase callback URL detected on app start:', initialUrl);
          await handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error checking Supabase callback:', error);
      }
    };
    
    // İlk kontrol
    checkSupabaseCallback();

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
        const data = notification.request.content.data;
        console.log('Notification received:', notification);

        if (data?.type === 'call') {
          const title = data?.callerName ? `${data.callerName} arıyor` : 'Gelen arama';
          const message = data?.callType === 'video' ? 'Görüntülü arama' : 'Sesli arama';
          Alert.alert(title, message, [
            { text: 'Reddet', style: 'cancel' },
            {
              text: 'Yanıtla',
              onPress: () => handleCallNavigation(data),
            },
          ]);
        }
      });
    } catch (err: any) {
      console.log('Notification listener setup failed (normal in Expo Go):', err.message);
    }

    // Bildirime tıklandığında
    try {
      responseListener.current = addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log('Notification response:', data);
        
        if (data?.type === 'call') {
          handleCallNavigation(data);
          return;
        }

        // Bildirim tipine göre yönlendirme
        if (data?.type === 'NEW_MESSAGE' || data?.type === 'chat') {
          // Yeni mesaj bildirimi - ilgili sohbet ekranına git
          const conversationId = data?.conversationId || data?.roomId;
          if (conversationId) {
            console.log('📱 [Notification] Yeni mesaj bildirimi, sohbet ekranına yönlendiriliyor:', conversationId);
            router.push(`/chat/${conversationId}` as any);
          } else {
            // conversationId yoksa chat listesine git
            router.push('/(tabs)/chat' as any);
          }
        } else if (data?.type === 'match') {
          router.push(`/football/match/${data.matchId}` as any);
        } else if (data?.type === 'missing_player') {
          router.push('/football/missing-players' as any);
        } else if (data?.type === 'team') {
          router.push(`/football/team/${data.teamId}` as any);
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
  }, [handleCallNavigation]);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthContext>
            <ChatContext>
              <ThemeProvider>
                <GestureHandlerRootView style={styles.container}>
                  <BottomSheetModalProvider>
                    <RootLayoutNav />
                    <ProximityManager />
                  </BottomSheetModalProvider>
                </GestureHandlerRootView>
              </ThemeProvider>
            </ChatContext>
          </AuthContext>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

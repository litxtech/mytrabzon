import { Tabs, useRouter } from "expo-router";
import { Home, MessageCircle, Bell, User, GraduationCap, Trophy } from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { trpc } from "@/lib/trpc";
import { TabBarBadge } from "@/components/TabBarBadge";

export default function TabLayout() {
  const { profile, user, loading } = useAuth();
  const { theme } = useTheme();
  const { rooms } = useChat();
  const router = useRouter();

  // Okunmamış mesaj sayısını hesapla
  const unreadMessageCount = useMemo(() => {
    return rooms.reduce((total, room) => total + (room.unread_count || 0), 0);
  }, [rooms]);

  // Okunmamış bildirim sayısı
  const { data: unreadNotificationData } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 30000, // 30 saniyede bir güncelle
    }
  );
  const unreadNotificationCount = unreadNotificationData?.count || 0;

  useEffect(() => {
    // Sadece user yoksa ve loading tamamlandıysa redirect yap
    // Profile yoksa da tab layout render edilmeli (profile sayfası kendi kontrolünü yapar)
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  // Loading durumunda loading göster, user yoksa null döndür
  if (loading) {
    return null; // Loading gösterilebilir ama şimdilik null
  }

  // User yoksa null döndür (auth sayfasına yönlendirilecek)
  if (!user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Akış",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ktu"
        options={{
          title: "KTÜ",
          tabBarIcon: ({ color }) => <GraduationCap size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="football"
        options={{
          title: "Halı Saha",
          tabBarIcon: ({ color }) => <Trophy size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Sohbet",
          tabBarIcon: ({ color }) => (
            <TabBarBadge count={unreadMessageCount}>
              <MessageCircle size={24} color={color} />
            </TabBarBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Bildirimler",
          tabBarIcon: ({ color }) => (
            <TabBarBadge count={unreadNotificationCount}>
              <Bell size={24} color={color} />
            </TabBarBadge>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

import { Tabs, useRouter } from "expo-router";
import { Home, MessageCircle, Bell, User, GraduationCap, Trophy, Heart } from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useChat } from "@/contexts/ChatContext";
import { trpc } from "@/lib/trpc";
import { TabBarBadge } from "@/components/TabBarBadge";

export default function TabLayout() {
  const { profile, loading } = useAuth();
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
    if (!loading && !profile) {
      router.replace('/auth/login');
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
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
        name="match"
        options={{
          title: "Eşleş",
          tabBarIcon: ({ color }) => <Heart size={24} color={color} />,
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

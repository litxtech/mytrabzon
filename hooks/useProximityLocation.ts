/**
 * Yakındaki Kullanıcılar - Konum Güncelleme Hook'u
 * Uygulama ön plandayken belirli aralıklarla konum günceller ve yakınlık kontrolü yapar
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

const LOCATION_UPDATE_INTERVAL = 60000; // 60 saniye

export function useProximityLocation() {
  const { profile } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const updateLocationMutation = trpc.user.updateLocationAndCheckProximity.useMutation({
    onError: (error) => {
      console.error('Location update error:', error);
    },
  });

  const updateLocation = async () => {
    try {
      // Konum izni kontrolü
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      // location_opt_in kontrolü
      if (!profile?.location_opt_in) {
        return;
      }

      // Konum al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Backend'e gönder
      updateLocationMutation.mutate({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('Location fetch error:', error);
    }
  };

  useEffect(() => {
    // İlk konum güncellemesi
    updateLocation();

    // Periyodik güncelleme
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        updateLocation();
      }
    }, LOCATION_UPDATE_INTERVAL);

    // App state listener - sadece aktifken güncelle
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Uygulama aktif hale geldiğinde konum güncelle
        updateLocation();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [profile?.location_opt_in]);

  return {
    updateLocation,
  };
}


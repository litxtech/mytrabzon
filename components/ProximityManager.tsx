/**
 * Yakındaki Kullanıcılar - Ana Yönetici Component
 * Bekleyen proximity pair'leri kontrol eder ve bildirim modal'ını gösterir
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { ProximityNotificationModal } from './ProximityNotificationModal';
import { useProximityLocation } from '@/hooks/useProximityLocation';

export function ProximityManager() {
  const { user, profile } = useAuth();
  const [currentPairId, setCurrentPairId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Konum güncelleme hook'unu kullan
  useProximityLocation();

  // Bekleyen proximity pair'leri getir
  const { data: pendingPairsData, refetch } = trpc.user.getPendingProximityPairs.useQuery(
    undefined,
    {
      enabled: !!user && !!profile?.location_opt_in,
      refetchInterval: 30000, // 30 saniyede bir kontrol et
    }
  );

  const pendingPairs = pendingPairsData?.pairs || [];

  useEffect(() => {
    // Eğer bekleyen pair varsa ve modal açık değilse, ilkini göster
    if (pendingPairs.length > 0 && !showModal && currentPairId === null) {
      const firstPair = pendingPairs[0];
      setCurrentPairId(firstPair.id);
      setShowModal(true);
    }
  }, [pendingPairs, showModal, currentPairId]);

  const handleClose = () => {
    setShowModal(false);
    setCurrentPairId(null);
    // Bir sonraki pair'i kontrol et
    setTimeout(() => {
      refetch();
    }, 1000);
  };

  const handleMatch = (otherUserId: string) => {
    // Eşleşme başarılı - profil sayfasına yönlendirilebilir
    // Şimdilik sadece modal'ı kapat
    handleClose();
  };

  if (!user || !profile?.location_opt_in) {
    return null;
  }

  return (
    <>
      {currentPairId && (
        <ProximityNotificationModal
          visible={showModal}
          pairId={currentPairId}
          onClose={handleClose}
          onMatch={handleMatch}
        />
      )}
    </>
  );
}


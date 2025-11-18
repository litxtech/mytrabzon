import React from 'react';
import { TouchableOpacity, StyleSheet, Linking, Animated } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, SPACING } from '@/constants/theme';

interface WhatsAppComplaintButtonProps {
  style?: any;
}

export function WhatsAppComplaintButton({ style }: WhatsAppComplaintButtonProps = {}) {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleWhatsAppPress = () => {
    // Butona basıldığında animasyon
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();

    const phoneNumber = '13072715151'; // + işareti olmadan
    const message = encodeURIComponent('Merhaba, MyTrabzon uygulamasından şikayet/öneri bildirmek istiyorum.');
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
    
    // Eğer WhatsApp yüklü değilse web versiyonunu aç
    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(`https://wa.me/${phoneNumber}?text=${message}`);
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
        style,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handleWhatsAppPress}
        activeOpacity={0.8}
      >
        <MessageSquare size={20} color="#25D366" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  button: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


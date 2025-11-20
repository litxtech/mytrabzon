import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Image as ImageIcon, X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';

export default function CreateSupportTicketScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const createTicketMutation = trpc.support.createTicket.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Destek talebiniz başarıyla oluşturuldu. En kısa sürede size dönüş yapacağız.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Destek talebi oluşturulamadı');
      setUploading(false);
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    const uploadedUrls: string[] = [];
    const { supabase } = await import('@/lib/supabase');

    for (const imageUri of selectedImages) {
      try {
        const fileName = `support/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);

        // Supabase Storage'a yükle
        const { data, error } = await supabase.storage
          .from('media')
          .upload(fileName, {
            uri: imageUri,
            type: 'image/jpeg',
          } as any, {
            contentType: 'image/jpeg',
          });

        if (error) {
          console.error('Image upload error:', error);
          continue;
        }

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (error) {
        console.error('Image upload exception:', error);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Hata', 'Lütfen konu başlığı girin');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Hata', 'Lütfen mesajınızı yazın');
      return;
    }

    setUploading(true);

    try {
      // Önce resimleri yükle
      const mediaUrls = await uploadImages();

      // Ticket oluştur
      createTicketMutation.mutate({
        subject: subject.trim(),
        message: message.trim(),
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Destek talebi oluşturulamadı');
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen
        options={{
          title: 'Destek Talebi Oluştur',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>Konu Başlığı *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Hesap sorunu, Teknik destek..."
            placeholderTextColor={COLORS.textLight}
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Mesajınız *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Sorununuzu detaylı olarak açıklayın..."
            placeholderTextColor={COLORS.textLight}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{message.length}/2000</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Ekran Görüntüleri (Opsiyonel)</Text>
          <Text style={styles.hint}>Sorununuzu daha iyi anlamamız için ekran görüntüsü ekleyebilirsiniz</Text>
          
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            <ImageIcon size={20} color={COLORS.primary} />
            <Text style={styles.imagePickerText}>Fotoğraf Ekle</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <View style={styles.imageGrid}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <ExpoImage source={{ uri }} style={styles.image} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!subject.trim() || !message.trim() || uploading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!subject.trim() || !message.trim() || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Send size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Gönder</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: SPACING.sm,
  },
  imagePickerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});


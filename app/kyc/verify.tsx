import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Upload, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';
import { trpc } from '../../lib/trpc';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type DocumentType = 'id_front' | 'id_back' | 'selfie' | 'selfie_with_id';

export default function KycVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Form, 2: ID Front, 3: ID Back, 4: Selfie, 5: Selfie with ID
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('Türkiye');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  
  // Documents
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieWithId, setSelfieWithId] = useState<string | null>(null);
  
  // Verification code'u başta oluştur
  const generateVerificationCode = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    return `MYTRABZON – ${dateStr} – KOD: ${randomCode}`;
  };
  
  const [verificationCode] = useState(generateVerificationCode());
  
  const { data: existingKyc } = trpc.kyc.get.useQuery(undefined, { enabled: !!user?.id });
  const createKycMutation = trpc.kyc.create.useMutation({
    onSuccess: () => {
      Alert.alert(
        'Başarılı',
        'Kimlik doğrulama başvurunuz alındı. Admin onayı bekleniyor.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
      setLoading(false);
    },
  });
  
  const pickImage = async (type: DocumentType) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gerekiyor.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri, type);
    }
  };
  
  const takePhoto = async (type: DocumentType) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera erişim izni gerekiyor.');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri, type);
    }
  };
  
  const uploadImage = async (uri: string, type: DocumentType) => {
    setLoading(true);
    try {
      let fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      // jpg -> jpeg düzelt
      if (fileExt === 'jpg') fileExt = 'jpeg';
      const fileName = `${user?.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `kyc-documents/${fileName}`;
      
      // MIME type'ı düzelt
      const mimeType = fileExt === 'jpeg' || fileExt === 'jpg' 
        ? 'image/jpeg' 
        : fileExt === 'png' 
        ? 'image/png' 
        : `image/${fileExt}`;
      
      // React Native'de blob() yok, fetch ile base64 veya doğrudan URI kullan
      // Supabase Storage React Native için URI'yi doğrudan kabul eder
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, {
          uri,
          type: mimeType,
          name: fileName,
        } as any, {
          contentType: mimeType,
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Public URL oluşturulamadı');
      }
      
      switch (type) {
        case 'id_front':
          setIdFront(urlData.publicUrl);
          break;
        case 'id_back':
          setIdBack(urlData.publicUrl);
          break;
        case 'selfie':
          setSelfie(urlData.publicUrl);
          break;
        case 'selfie_with_id':
          setSelfieWithId(urlData.publicUrl);
          break;
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Hata', error.message || 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNext = () => {
    if (step === 1) {
      if (!fullName || !nationalId || !birthDate) {
        Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!idFront) {
        Alert.alert('Eksik', 'Lütfen kimlik ön yüz fotoğrafını yükleyin');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!idBack) {
        Alert.alert('Eksik', 'Lütfen kimlik arka yüz fotoğrafını yükleyin');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!selfie) {
        Alert.alert('Eksik', 'Lütfen selfie fotoğrafını çekin');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      if (!selfieWithId) {
        Alert.alert('Eksik', 'Lütfen kimliğinizi elinizde tuttuğunuz fotoğrafı çekin');
        return;
      }
      handleSubmit();
    }
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const documents = [
        { type: 'id_front' as DocumentType, fileUrl: idFront! },
        { type: 'id_back' as DocumentType, fileUrl: idBack! },
        { type: 'selfie' as DocumentType, fileUrl: selfie! },
        { type: 'selfie_with_id' as DocumentType, fileUrl: selfieWithId! },
      ];
      
      await createKycMutation.mutateAsync({
        fullName,
        nationalId,
        birthDate,
        country,
        city,
        email: email || undefined,
        documents,
      });
    } catch {
      // Error handled in mutation
    }
  };
  
  const renderForm = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Kişisel Bilgiler</Text>
      <Text style={styles.stepDescription}>
        Lütfen kimlik bilgilerinizi eksiksiz doldurun
      </Text>
      
      <Text style={styles.label}>Ad Soyad *</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Adınız ve soyadınız"
        placeholderTextColor={COLORS.textLight}
      />
      
      <Text style={styles.label}>TCKN / Pasaport No *</Text>
      <TextInput
        style={styles.input}
        value={nationalId}
        onChangeText={setNationalId}
        placeholder="TCKN veya pasaport numaranız"
        placeholderTextColor={COLORS.textLight}
        keyboardType="numeric"
      />
      
      <Text style={styles.label}>Doğum Tarihi *</Text>
      <TextInput
        style={styles.input}
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="YYYY-MM-DD (örn: 1990-01-15)"
        placeholderTextColor={COLORS.textLight}
      />
      
      <Text style={styles.label}>Ülke</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="Ülke"
        placeholderTextColor={COLORS.textLight}
      />
      
      <Text style={styles.label}>Şehir</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Şehir"
        placeholderTextColor={COLORS.textLight}
      />
      
      <Text style={styles.label}>E-posta</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta adresiniz (opsiyonel)"
        placeholderTextColor={COLORS.textLight}
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>
  );
  
  const renderImageUpload = (type: DocumentType, title: string, description: string, image: string | null) => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
      
      {image ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => {
              if (type === 'id_front') setIdFront(null);
              else if (type === 'id_back') setIdBack(null);
              else if (type === 'selfie') setSelfie(null);
              else if (type === 'selfie_with_id') setSelfieWithId(null);
            }}
          >
            <Text style={styles.changeButtonText}>Değiştir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => takePhoto(type)}
            disabled={loading}
          >
            <Camera size={24} color={COLORS.primary} />
            <Text style={styles.uploadButtonText}>Fotoğraf Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage(type)}
            disabled={loading}
          >
            <Upload size={24} color={COLORS.primary} />
            <Text style={styles.uploadButtonText}>Galeriden Seç</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {type === 'selfie_with_id' && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>ÖNEMLİ: Fotoğrafta bu kodu gösterin:</Text>
          <Text style={styles.codeText}>{verificationCode}</Text>
          <Text style={styles.codeHint}>
            Kimliğinizi elinizde tutarken, bu kodu kimliğinizin yanında gösterin. Kod aynı gün geçerlidir.
          </Text>
        </View>
      )}
    </View>
  );
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 && 'Kişisel Bilgiler'}
          {step === 2 && 'Kimlik Ön Yüz'}
          {step === 3 && 'Kimlik Arka Yüz'}
          {step === 4 && 'Selfie Fotoğrafı'}
          {step === 5 && 'Kimlik + Selfie'}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderForm()}
        {step === 2 && renderImageUpload('id_front', 'Kimlik Ön Yüz', 'Kimliğinizin ön yüzünü düz bir zeminde fotoğraflayın', idFront)}
        {step === 3 && renderImageUpload('id_back', 'Kimlik Arka Yüz', 'Kimliğinizin arka yüzünü düz bir zeminde fotoğraflayın', idBack)}
        {step === 4 && renderImageUpload('selfie', 'Selfie Fotoğrafı', 'Yüzünüzün tam göründüğü bir selfie çekin (şapka olmadan)', selfie)}
        {step === 5 && renderImageUpload('selfie_with_id', 'Kimlik + Selfie', 'Kimliğinizi elinizde tutup selfie çekin. Fotoğrafta gösterilen kodu kimliğinizin yanında gösterin.', selfieWithId)}
      </ScrollView>
      
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButtonFooter}
            onPress={() => setStep(step - 1)}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 5 ? 'Gönder' : 'İleri'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  stepContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  changeButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  changeButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginVertical: SPACING.md,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  uploadButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  codeContainer: {
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  codeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  codeText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  codeHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  backButtonFooter: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
});


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
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function KTUVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [studentNumber, setStudentNumber] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [classYear, setClassYear] = useState<number>(1);
  const [ktuEmail, setKtuEmail] = useState('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fakülteleri ve bölümleri getir
  const { data: faculties } = trpc.ktu.getFaculties.useQuery();
  const { data: departments } = trpc.ktu.getDepartments.useQuery({
    faculty_id: selectedFacultyId || undefined,
  });

  // Mevcut öğrenci bilgilerini getir
  const { data: studentInfo } = trpc.ktu.getStudentInfo.useQuery(undefined, {
    enabled: !!user?.id,
  });

  const verifyMutation = trpc.ktu.verifyStudent.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Öğrenci doğrulama başvurunuz alındı. İnceleme sonrası bilgilendirileceksiniz.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Hata', error.message);
    },
  });

  const pickDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için izin gerekli.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadDocument(result.assets[0].uri);
    }
  };

  const uploadDocument = async (uri: string) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileName = `ktu-verification/${user.id}-${Date.now()}.jpg`;

      // React Native'de blob() yok, doğrudan URI kullan
      const { data: uploadData, error } = await supabase.storage
        .from('kyc_documents')
        .upload(fileName, {
          uri,
          type: 'image/jpeg',
          name: fileName,
        } as any, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Public URL oluşturulamadı');
      }

      setDocumentUri(urlData.publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Hata', error.message || 'Belge yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!studentNumber.trim()) {
      Alert.alert('Hata', 'Öğrenci numarası gereklidir.');
      return;
    }
    if (!selectedFacultyId) {
      Alert.alert('Hata', 'Fakülte seçimi gereklidir.');
      return;
    }
    if (!selectedDepartmentId) {
      Alert.alert('Hata', 'Bölüm seçimi gereklidir.');
      return;
    }
    if (!documentUri) {
      Alert.alert('Hata', 'Öğrenci belgesi yüklenmesi gereklidir.');
      return;
    }

    verifyMutation.mutate({
      student_number: studentNumber.trim(),
      faculty_id: selectedFacultyId,
      department_id: selectedDepartmentId,
      class_year: classYear,
      ktu_email: ktuEmail.trim() || undefined,
      verification_document_url: documentUri,
    });
  };

  // Mevcut bilgileri doldur
  React.useEffect(() => {
    if (studentInfo) {
      setStudentNumber(studentInfo.student_number || '');
      setSelectedFacultyId(studentInfo.faculty_id || '');
      setSelectedDepartmentId(studentInfo.department_id || '');
      setClassYear(studentInfo.class_year || 1);
      setKtuEmail(studentInfo.ktu_email || '');
      setDocumentUri(studentInfo.verification_document_url || null);
    }
  }, [studentInfo]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Öğrenci Doğrulama',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Öğrenci Doğrulama</Text>
          <Text style={styles.infoText}>
            KTÜ özelliklerini kullanmak için öğrenci doğrulaması yapmanız gerekmektedir. Öğrenci belgenizi yükleyin ve bilgilerinizi doldurun.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Öğrenci Numarası *</Text>
            <TextInput
              style={styles.input}
              value={studentNumber}
              onChangeText={setStudentNumber}
              placeholder="Örn: 2020123456"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fakülte *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facultyScroll}>
              {faculties?.map((faculty) => (
                <TouchableOpacity
                  key={faculty.id}
                  style={[
                    styles.facultyButton,
                    selectedFacultyId === faculty.id && styles.facultyButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedFacultyId(faculty.id);
                    setSelectedDepartmentId(''); // Bölümü sıfırla
                  }}
                >
                  <Text
                    style={[
                      styles.facultyButtonText,
                      selectedFacultyId === faculty.id && styles.facultyButtonTextActive,
                    ]}
                  >
                    {faculty.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {selectedFacultyId && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bölüm *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.departmentScroll}>
                {departments?.map((dept) => (
                  <TouchableOpacity
                    key={dept.id}
                    style={[
                      styles.departmentButton,
                      selectedDepartmentId === dept.id && styles.departmentButtonActive,
                    ]}
                    onPress={() => setSelectedDepartmentId(dept.id)}
                  >
                    <Text
                      style={[
                        styles.departmentButtonText,
                        selectedDepartmentId === dept.id && styles.departmentButtonTextActive,
                      ]}
                    >
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sınıf *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.classButton, classYear === year && styles.classButtonActive]}
                  onPress={() => setClassYear(year)}
                >
                  <Text
                    style={[
                      styles.classButtonText,
                      classYear === year && styles.classButtonTextActive,
                    ]}
                  >
                    {year}. Sınıf
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>KTÜ Email (Opsiyonel)</Text>
            <TextInput
              style={styles.input}
              value={ktuEmail}
              onChangeText={setKtuEmail}
              placeholder="ornek@ktu.edu.tr"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Öğrenci Belgesi *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : documentUri ? (
                <>
                  <CheckCircle size={24} color={COLORS.success} />
                  <Text style={styles.uploadButtonText}>Belge Yüklendi</Text>
                </>
              ) : (
                <>
                  <Upload size={24} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Belge Yükle</Text>
                </>
              )}
            </TouchableOpacity>
            {documentUri && (
              <Image source={{ uri: documentUri }} style={styles.documentPreview} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (verifyMutation.isPending || uploading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={verifyMutation.isPending || uploading}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Başvuruyu Gönder</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  form: {
    gap: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  facultyScroll: {
    maxHeight: 50,
  },
  facultyButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  facultyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  facultyButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  facultyButtonTextActive: {
    color: COLORS.white,
  },
  departmentScroll: {
    maxHeight: 50,
  },
  departmentButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  departmentButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  departmentButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  departmentButtonTextActive: {
    color: COLORS.white,
  },
  classScroll: {
    maxHeight: 50,
  },
  classButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  classButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  classButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  classButtonTextActive: {
    color: COLORS.white,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  uploadButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  documentPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: SPACING.md,
    backgroundColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});


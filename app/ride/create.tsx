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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Calendar, Users, DollarSign } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

export default function RideCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [departureTitle, setDepartureTitle] = useState('');
  const [departureDescription, setDepartureDescription] = useState('');
  const [destinationTitle, setDestinationTitle] = useState('');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [stopInput, setStopInput] = useState('');
  const [departureTime, setDepartureTime] = useState(new Date());
  const [totalSeats, setTotalSeats] = useState('3');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [notes, setNotes] = useState('');
  const [allowPets, setAllowPets] = useState(false);
  const [allowSmoking, setAllowSmoking] = useState(false);

  const createRideMutation = trpc.ride.createRide.useMutation({
    onSuccess: () => {
      Alert.alert('Başarılı', 'Yolculuk ilanı oluşturuldu!');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Hata', error.message || 'Yolculuk oluşturulamadı');
      setLoading(false);
    },
  });

  const addStop = () => {
    if (stopInput.trim()) {
      setStops([...stops, stopInput.trim()]);
      setStopInput('');
    }
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!departureTitle.trim() || !destinationTitle.trim()) {
      Alert.alert('Hata', 'Lütfen kalkış ve varış yerlerini girin');
      return;
    }

    if (!totalSeats || parseInt(totalSeats) < 1) {
      Alert.alert('Hata', 'Lütfen geçerli bir koltuk sayısı girin');
      return;
    }

    setLoading(true);
    try {
      await createRideMutation.mutateAsync({
        departure_title: departureTitle.trim(),
        departure_description: departureDescription.trim() || null,
        destination_title: destinationTitle.trim(),
        destination_description: destinationDescription.trim() || null,
        stops: stops,
        departure_time: departureTime.toISOString(),
        total_seats: parseInt(totalSeats),
        price_per_seat: pricePerSeat ? parseFloat(pricePerSeat) : null,
        notes: notes.trim() || null,
        allow_pets: allowPets,
        allow_smoking: allowSmoking,
      });
    } catch (error) {
      console.error('Create ride error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          title: 'Yeni Yolculuk Oluştur',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Kalkış Yeri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kalkış Yeri</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kalkış başlığı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Trabzon Meydan"
              placeholderTextColor={COLORS.textLight}
              value={departureTitle}
              onChangeText={setDepartureTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detaylı adres / tarif</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Örn: Meydan'da belediye önü, Ziraat Bankası karşısı"
              placeholderTextColor={COLORS.textLight}
              value={departureDescription}
              onChangeText={setDepartureDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Uğranacak Yerler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uğranacak Yerler (İsteğe Bağlı)</Text>
          <Text style={styles.sectionSubtitle}>
            Bu yol üzerinde uğrayacağın ilçe, kasaba veya noktaları tek tek ekle.
          </Text>

          <View style={styles.stopInputContainer}>
            <TextInput
              style={styles.stopInput}
              placeholder="Örn: Beşikdüzü merkez"
              placeholderTextColor={COLORS.textLight}
              value={stopInput}
              onChangeText={setStopInput}
              onSubmitEditing={addStop}
            />
            <TouchableOpacity
              style={styles.addStopButton}
              onPress={addStop}
              disabled={!stopInput.trim()}
            >
              <Plus size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {stops.length > 0 && (
            <View style={styles.stopsContainer}>
              {stops.map((stop, index) => (
                <View key={index} style={styles.stopChip}>
                  <Text style={styles.stopChipText}>{stop}</Text>
                  <TouchableOpacity
                    style={styles.removeStopButton}
                    onPress={() => removeStop(index)}
                  >
                    <X size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Varış Noktası */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Varış Noktası</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Varış başlığı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Ordu Merkez"
              placeholderTextColor={COLORS.textLight}
              value={destinationTitle}
              onChangeText={setDestinationTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detaylı tarif</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Örn: Ordu Merkez, sahil yürüyüş yolu başlangıcı"
              placeholderTextColor={COLORS.textLight}
              value={destinationDescription}
              onChangeText={setDestinationDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Tarih & Saat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarih & Saat</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.dateButtonText}>
              {departureTime.toLocaleString('tr-TR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={departureTime}
              mode="datetime"
              is24Hour={true}
              display="default"
              onChange={(event: any, selectedDate?: Date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDepartureTime(selectedDate);
                }
              }}
            />
          )}
        </View>

        {/* Koltuk & Fiyat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kapasite & Fiyat</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Boş koltuk sayısı *</Text>
            <View style={styles.iconInput}>
              <Users size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Örn: 3"
                placeholderTextColor={COLORS.textLight}
                value={totalSeats}
                onChangeText={setTotalSeats}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kişi başı fiyat (TL) - Opsiyonel</Text>
            <View style={styles.iconInput}>
              <DollarSign size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Örn: 50"
                placeholderTextColor={COLORS.textLight}
                value={pricePerSeat}
                onChangeText={setPricePerSeat}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Kurallar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kurallar</Text>
          
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAllowSmoking(!allowSmoking)}
          >
            <View style={[styles.checkbox, allowSmoking && styles.checkboxChecked]}>
              {allowSmoking && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Sigara içilir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAllowPets(!allowPets)}
          >
            <View style={[styles.checkbox, allowPets && styles.checkboxChecked]}>
              {allowPets && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Evcil hayvan olabilir</Text>
          </TouchableOpacity>
        </View>

        {/* Notlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genel Not</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Örn: Zamanında çıkmaya dikkat ediyorum, müzik dinlerim, yol boyu 1-2 mola verebilirim."
              placeholderTextColor={COLORS.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Yolculuk İlanı Oluştur</Text>
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
  backButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: SPACING.md,
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  stopInputContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  stopInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addStopButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  stopsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  stopChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  removeStopButton: {
    padding: SPACING.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  dateButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});


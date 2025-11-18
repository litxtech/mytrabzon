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
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Calendar, Users, Check } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

const PRICE_OPTIONS = Array.from({ length: 500 }, (_, index) => (index + 1) * 10);

export default function RideCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
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
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [showPricePicker, setShowPricePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [allowPets, setAllowPets] = useState(false);
  const [allowSmoking, setAllowSmoking] = useState(false);
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverFullName, setDriverFullName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const createRideMutation = trpc.ride.createRide.useMutation({
    onSuccess: async () => {
      await utils.ride.searchRides.invalidate();
      Alert.alert('Başarılı', 'Yolculuk ilanı oluşturuldu!', [
        {
          text: 'Tamam',
          onPress: () => router.replace('/ride/search' as any),
        },
      ]);
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

    if (!selectedPrice) {
      Alert.alert('Hata', 'Lütfen kişi başı ücret seçin');
      return;
    }

    if (!vehicleBrand.trim() || !vehicleModel.trim() || !vehicleColor.trim()) {
      Alert.alert('Hata', 'Araç marka, model ve renk bilgilerini eksiksiz girin');
      return;
    }

    if (!vehiclePlate.trim()) {
      Alert.alert('Hata', 'Araç plakasını girin');
      return;
    }

    if (!driverFullName.trim()) {
      Alert.alert('Hata', 'Şoför adını ve soyadını girin');
      return;
    }

    if (!driverPhone.trim()) {
      Alert.alert('Hata', 'Şoför telefon numarasını girin');
      return;
    }

    if (driverPhone.replace(/\D/g, '').length < 10) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası girin');
      return;
    }

    if (!policyAccepted) {
      Alert.alert(
        'Politika Onayı Gerekli',
        'Yolculuk ilanı vermeden önce yolculuk paylaşım politikamızı okuyup onaylamanız gerekir.'
      );
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
        price_per_seat: selectedPrice,
        notes: notes.trim() || null,
        allow_pets: allowPets,
        allow_smoking: allowSmoking,
        vehicle_brand: vehicleBrand.trim(),
        vehicle_model: vehicleModel.trim(),
        vehicle_color: vehicleColor.trim(),
        vehicle_plate: vehiclePlate.trim().toUpperCase(),
        driver_full_name: driverFullName.trim(),
        driver_phone: driverPhone.trim(),
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
          onPress={() => {
            if (Platform.OS === 'android') {
              DateTimePickerAndroid.open({
                value: departureTime,
                mode: 'date',
                onChange: (event, selectedDate) => {
                  if (event?.type === 'dismissed') {
                    return;
                  }
                  const baseDate = selectedDate || departureTime;
                  DateTimePickerAndroid.open({
                    value: baseDate,
                    mode: 'time',
                    is24Hour: true,
                    onChange: (timeEvent, selectedTime) => {
                      if (timeEvent?.type === 'dismissed') {
                        return;
                      }
                      if (selectedTime) {
                        const merged = new Date(baseDate);
                        merged.setHours(selectedTime.getHours());
                        merged.setMinutes(selectedTime.getMinutes());
                        merged.setSeconds(0);
                        merged.setMilliseconds(0);
                        setDepartureTime(merged);
                      }
                    },
                  });
                },
              });
              return;
            }
            setShowDatePicker(true);
          }}
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

          {showDatePicker && Platform.OS === 'ios' && (
            <DateTimePicker
              value={departureTime}
              mode="datetime"
              is24Hour={true}
              display="default"
              onChange={(event: any, selectedDate?: Date) => {
                if (event?.type === 'dismissed') {
                  setShowDatePicker(false);
                  return;
                }
                if (selectedDate) {
                  setDepartureTime(selectedDate);
                }
                setShowDatePicker(false);
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
            <Text style={styles.label}>Kişi başı fiyat *</Text>
            <TouchableOpacity
              style={styles.priceSelector}
              onPress={() => setShowPricePicker(true)}
            >
              <Text style={styles.currencyIcon}>₺</Text>
              <Text style={styles.priceSelectorText}>
                {selectedPrice
                  ? `${selectedPrice.toLocaleString('tr-TR')} TL`
                  : "Ücret seç"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sectionSubtitle}>
              10 TL&#39;den 5.000 TL&#39;ye kadar hazır seçenekler
            </Text>
          </View>
        </View>

        {/* Araç & Şoför Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç & Şoför Bilgileri</Text>
          <Text style={styles.sectionSubtitle}>
            Yolcular yolculuğa katılmadan önce aracı ve sürücüyü burada görecek. Lütfen doğru bilgileri girin.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Araç Markası *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Renault"
              placeholderTextColor={COLORS.textLight}
              value={vehicleBrand}
              onChangeText={setVehicleBrand}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Araç Modeli *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Clio"
              placeholderTextColor={COLORS.textLight}
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Araç Rengi *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Beyaz"
              placeholderTextColor={COLORS.textLight}
              value={vehicleColor}
              onChangeText={setVehicleColor}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Araç Plakası *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 61 ABC 123"
              placeholderTextColor={COLORS.textLight}
              value={vehiclePlate}
              autoCapitalize="characters"
              onChangeText={(text) => setVehiclePlate(text.toUpperCase())}
            />
            <Text style={styles.helperText}>Plaka bilgisi yolcularla paylaşılır.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şoför Adı Soyadı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Ali Kaya"
              placeholderTextColor={COLORS.textLight}
              value={driverFullName}
              onChangeText={setDriverFullName}
            />
            <Text style={styles.helperText}>Lütfen gerçek adınızı ve soyadınızı yazın.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şoför Telefonu *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: 05xx xxx xx xx"
              placeholderTextColor={COLORS.textLight}
              value={driverPhone}
              onChangeText={setDriverPhone}
              keyboardType="phone-pad"
              maxLength={20}
            />
            <Text style={styles.helperText}>Admin bilgileri için telefon numarası gereklidir.</Text>
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

        <View style={[styles.section, styles.policySection]}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setPolicyAccepted(!policyAccepted)}
          >
            <View style={[styles.checkbox, policyAccepted && styles.checkboxChecked]}>
              {policyAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.policyText}>
                Yolculuk paylaşım politikası şartlarını okudum, anladım ve kabul ediyorum.
              </Text>
              <TouchableOpacity onPress={() => setShowPolicyModal(true)}>
                <Text style={styles.policyLink}>Politikayı oku</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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

      <Modal visible={showPricePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kişi Başı Ücret Seç</Text>
            <FlatList
              data={PRICE_OPTIONS}
              keyExtractor={(item) => item.toString()}
              initialNumToRender={30}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.priceOption,
                    selectedPrice === item && styles.priceOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPrice(item);
                    setShowPricePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.priceOptionText,
                      selectedPrice === item && styles.priceOptionTextSelected,
                    ]}
                  >
                    {item.toLocaleString('tr-TR')} TL
                  </Text>
                  {selectedPrice === item && (
                    <Check size={18} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPricePicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPolicyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.policyHeader}>
              <Text style={styles.modalTitle}>Yolculuk Paylaşımı ve İlan Kullanım Politikası</Text>
              <TouchableOpacity onPress={() => setShowPolicyModal(false)}>
                <Text style={styles.policyClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.policyScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.policyParagraph}>
                (Ticari olmayan, gönüllü yolcu bırakma – yolculuk paylaşımı modeli)
              </Text>
              <Text style={styles.policyParagraph}>
                Bu politika, mobil uygulamada sunulan yolculuk ilanı verme, yolculuğa başvurma ve kullanıcıların
                karşılıklı anlaşarak birlikte seyahat etmesi sürecinde uygulanacak tüm kuralları ve sorumlulukları içerir.
                Platform, yalnızca kullanıcıları birbirine bağlayan dijital bir aracılık sistemidir. Uygulama hiçbir şekilde
                ticari taşımacılık, taksi, servis veya ücretli yolcu taşıma hizmeti vermez.
              </Text>
              <Text style={styles.policyParagraph}>
                Aşağıdaki hükümleri kabul etmeyen kullanıcıların uygulamayı kullanmaması gerekir.
              </Text>
              <Text style={styles.policySubtitle}>1. SİSTEMİN AMACI VE GENEL TANIMI</Text>
              <Text style={styles.policyParagraph}>
                Uygulamanın amacı, aynı yöne seyahat eden kullanıcıların birbirine yardımcı olabilmesini kolaylaştırmak,
                yakıt ve zaman maliyetini azaltmak ve karşılıklı rıza ile yapılan gönüllü yolculuk paylaşımı sürecini güvenli
                ve düzenli bir çerçeveye oturtmaktır.
              </Text>
              <Text style={styles.policyParagraph}>
                Sistem şu şekilde işler: Bir kullanıcı ilan açarak gideceği yönü, saatini, güzergâhını ve müsait kişileri belirtir.
                Başka bir kullanıcı ilanı görüp başvurabilir. Taraflar uygulama üzerinden iletişim kurar, anlaşırsa beraber yolculuk yapılır.
                Platform taraflar arasındaki yolculuk anlaşmasına karışmaz, fiyat, rota veya güvenlik onayı vermez.
              </Text>
              <Text style={styles.policySubtitle}>2. UYGULAMANIN HUKUKİ STATÜSÜ</Text>
              <Text style={styles.policyParagraph}>
                Uygulama: Bir taşıma şirketi değildir. Yolcu taşımacılığı hizmeti sunmaz. Ücretli taşımayı organize etmez.
                Taşımacılık faaliyeti yürütmez veya yönlendirme yapmaz. Kullanıcıların gerçekleştirdiği yolculuklar; ticari taşıma,
                taksi hizmeti, servis taşımacılığı veya ücretli yolcu taşımacılığı sayılmaz. Platform, yalnızca kullanıcılar arasında ilan,
                başvuru, eşleşme, mesajlaşma ve konum paylaşımı özelliklerini sağlar. Her yolculuk, kullanıcıların kendi sorumluluğunda gerçekleşir.
              </Text>
              <Text style={styles.policySubtitle}>3. KULLANICI PROFİLİ VE DOĞRULAMA</Text>
              <Text style={styles.policyParagraph}>
                Kullanıcılar hesap oluştururken gerçek isim, doğru iletişim bilgisi ve kullanılabilir telefon numarası girmek zorundadır.
                Sahte hesap veya yanıltıcı bilgi tespit edildiğinde hesap askıya alınır. Platform, güvenliği sağlamak için kimlik ve telefon doğrulaması uygulayabilir.
              </Text>
              <Text style={styles.policySubtitle}>4. YOLCULUĞUN NİTELİĞİ</Text>
              <Text style={styles.policyParagraph}>
                Bu uygulamada yapılan yolculuklar gönüllü birliktelik ve masraf paylaşımı esasına dayanır. Taraflar eşit sorumluluğa sahiptir; sürücü ticari hizmet vermez.
              </Text>
              <Text style={styles.policySubtitle}>5. ÜCRET, KATKI PAYI VE MASRAF PAYLAŞIMI</Text>
              <Text style={styles.policyParagraph}>
                Sistem ticari taşımacılık değildir; zorunlu ücret yoktur. Taraflar isterse yakıt katkısı yapabilir. Platform hiçbir ödemeyi belirlemez ve takip etmez.
              </Text>
              <Text style={styles.policySubtitle}>6. İLAN VEREN KULLANICININ SORUMLULUKLARI</Text>
              <Text style={styles.policyParagraph}>
                İlan açan kullanıcı rota ve zamanı doğru girmek, trafik kurallarına uymak, doğru bilgi vermek ve güvenliği sağlamak zorundadır.
              </Text>
              <Text style={styles.policySubtitle}>7. İLANA BAŞVURAN KULLANICININ SORUMLULUKLARI</Text>
              <Text style={styles.policyParagraph}>
                Başvuran kullanıcı yolculuğun gönüllü olduğunu kabul eder, güvenli davranmakla yükümlüdür ve yanlış bilgi veremez.
              </Text>
              <Text style={styles.policySubtitle}>8. PLATFORMUN SORUMLULUK REDDİ</Text>
              <Text style={styles.policyParagraph}>
                Platform araç durumu, kaza, eşya kaybı, rota sorunları veya anlaşmazlıklardan sorumlu değildir. Görevi yalnızca teknik aracılıktır.
              </Text>
              <Text style={styles.policySubtitle}>9. GÜVENLİK VE KULLANICI DAVRANIŞ POLİTİKASI</Text>
              <Text style={styles.policyParagraph}>
                Kullanıcılar saygılı davranmalı, taciz veya güvenliği tehlikeye atan davranışlardan kaçınmalıdır. Kurallara uymayanların hesapları kapatılabilir.
              </Text>
              <Text style={styles.policySubtitle}>10. YASAKLI FAALİYETLER</Text>
              <Text style={styles.policyParagraph}>
                Ticari taşımacılık yapmak, korsan taksi gibi davranmak, sahte ilan açmak, dolandırıcılık, uyuşturucu/alkol etkisinde araç kullanmak gibi faaliyetler yasaktır.
              </Text>
              <Text style={styles.policySubtitle}>11. KVKK VE GİZLİLİK</Text>
              <Text style={styles.policyParagraph}>
                Platform kimlik, telefon, konum ve ilan verilerini sadece hizmet sunmak için işler; üçüncü kişilere satmaz, yasal zorunluluk halinde paylaşır.
              </Text>
              <Text style={styles.policySubtitle}>12. HUKUKİ DAYANAK</Text>
              <Text style={styles.policyParagraph}>
                Yolculuk, Türk Borçlar Kanunu kapsamında gönüllü yol arkadaşlığı – masraf paylaşımı anlaşmasıdır. Platform bu anlaşmanın tarafı değildir.
              </Text>
              <Text style={styles.policySubtitle}>13. ANLAŞMAZLIKLAR</Text>
              <Text style={styles.policyParagraph}>
                Kullanıcılar arasındaki anlaşmazlıklar tarafların sorumluluğundadır; platform gerekli görürse hesabı askıya alabilir.
              </Text>
              <Text style={styles.policySubtitle}>14. POLİTİKA DEĞİŞİKLİKLERİ</Text>
              <Text style={styles.policyParagraph}>
                Platform politikayı güncelleyebilir. Güncel metin uygulamada yayınlandığı anda yürürlüğe girer.
              </Text>
              <Text style={styles.policySubtitle}>15. İLETİŞİM</Text>
              <Text style={styles.policyParagraph}>
                LITXTECH LLC – support@litxtech.com – +1 307 271 5151
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
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
  priceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  currencyIcon: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceSelectorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    maxHeight: '80%',
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  priceOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priceOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  priceOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.text,
  },
  modalCloseButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  policySection: {
    marginBottom: SPACING.md,
  },
  policyText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  policyLink: {
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  policyClose: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  policyScroll: {
    maxHeight: '80%',
  },
  policyParagraph: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  policySubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
});


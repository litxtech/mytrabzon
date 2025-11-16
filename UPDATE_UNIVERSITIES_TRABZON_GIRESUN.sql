-- ===================================================================
-- TRABZON VE GİRESUN ÜNİVERSİTELERİ GÜNCELLEMESİ
-- ===================================================================
-- Bu SQL script'i Trabzon ve Giresun'daki tüm üniversite birimlerini ekler/günceller
-- ===================================================================

-- ===================================================================
-- TRABZON ÜNİVERSİTELERİ
-- ===================================================================

-- Karadeniz Teknik Üniversitesi (KTÜ) - Ortahisar (Merkez)
INSERT INTO ktu_faculties (name, code, description) VALUES
('Tıp Fakültesi', 'TIP', 'KTÜ Tıp Fakültesi - Ortahisar Kanuni Kampüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Mühendislik Fakültesi', 'MUH', 'KTÜ Mühendislik Fakültesi - Ortahisar Kanuni Kampüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Mimarlık Fakültesi', 'MIM', 'KTÜ Mimarlık Fakültesi - Ortahisar Kanuni Kampüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('İktisadi ve İdari Bilimler Fakültesi', 'IIBF', 'KTÜ İİBF - Ortahisar Kanuni Kampüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Fen Fakültesi', 'FEN', 'KTÜ Fen Fakültesi - Ortahisar Kanuni Kampüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Orman Fakültesi', 'ORM', 'KTÜ Orman Fakültesi - Ortahisar Kanuni Kampüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Deniz Bilimleri Fakültesi', 'DENIZ', 'KTÜ Deniz Bilimleri Fakültesi - Sürmene Deniz Bilimleri merkez birimleri')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- KTÜ - Of
INSERT INTO ktu_faculties (name, code, description) VALUES
('Of Teknoloji Fakültesi', 'OF_TEK', 'KTÜ Of Teknoloji Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Of Meslek Yüksekokulu', 'OF_MYO', 'KTÜ Of Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- KTÜ - Yabancı Diller Yüksekokulu
INSERT INTO ktu_faculties (name, code, description) VALUES
('Yabancı Diller Yüksekokulu', 'YADYOK', 'KTÜ Yabancı Diller Yüksekokulu - Yomra bazı birimleri')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Trabzon Üniversitesi - Ana Yerleşke (Akçaabat)
INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Eğitim Fakültesi', 'EGT_TRABZON', 'Trabzon Üniversitesi Eğitim Fakültesi - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi İlahiyat Fakültesi', 'ILAH_TRABZON', 'Trabzon Üniversitesi İlahiyat Fakültesi - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Güzel Sanatlar ve Tasarım Fakültesi', 'GSF_TRABZON', 'Trabzon Üniversitesi Güzel Sanatlar ve Tasarım Fakültesi - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi İletişim Fakültesi', 'ILET_TRABZON', 'Trabzon Üniversitesi İletişim Fakültesi - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Spor Bilimleri Fakültesi', 'SPOR_TRABZON', 'Trabzon Üniversitesi Spor Bilimleri Fakültesi - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Bilgisayar ve Bilişim Bilimleri Fakültesi', 'BILG_TRABZON', 'Trabzon Üniversitesi Bilgisayar ve Bilişim Bilimleri Fakültesi - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Turizm ve Otelcilik Meslek Yüksekokulu', 'TUR_MYO_TRABZON', 'Trabzon Üniversitesi Turizm ve Otelcilik Meslek Yüksekokulu - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Lisansüstü Eğitim Enstitüsü', 'LISANS_TRABZON', 'Trabzon Üniversitesi Lisansüstü Eğitim Enstitüsü - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Trabzon Üniversitesi Devlet Konservatuvarı', 'KONS_TRABZON', 'Trabzon Üniversitesi Devlet Konservatuvarı - Akçaabat Ana Yerleşke')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Trabzon Üniversitesi - İlçe Meslek Yüksekokulları
INSERT INTO ktu_faculties (name, code, description) VALUES
('Beşikdüzü Meslek Yüksekokulu', 'BESIK_MYO', 'Trabzon Üniversitesi Beşikdüzü Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Çarşıbaşı Meslek Yüksekokulu', 'CARSI_MYO', 'Trabzon Üniversitesi Çarşıbaşı Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Tonya Meslek Yüksekokulu', 'TONYA_MYO', 'Trabzon Üniversitesi Tonya Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Vakfıkebir Meslek Yüksekokulu', 'VAKF_MYO', 'Trabzon Üniversitesi Vakfıkebir Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Düzköy Meslek Yüksekokulu', 'DUZKOY_MYO', 'Trabzon Üniversitesi Düzköy Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Şalpazarı Meslek Yüksekokulu', 'SALP_MYO', 'Trabzon Üniversitesi Şalpazarı Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Avrasya Üniversitesi - Yomra Yerleşkesi
INSERT INTO ktu_faculties (name, code, description) VALUES
('Avrasya Üniversitesi Yomra Yerleşkesi', 'AVRASYA_YOMRA', 'Avrasya Üniversitesi Yomra Yerleşkesi (Sağlık ağırlıklı fakülteler)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Avrasya Üniversitesi - Pelitli Yerleşkesi
INSERT INTO ktu_faculties (name, code, description) VALUES
('Avrasya Üniversitesi Pelitli Yerleşkesi', 'AVRASYA_PELIT', 'Avrasya Üniversitesi Pelitli Yerleşkesi (İİBF, MYO, Mühendislik, Sağlık Bilimleri Fakültesi birimleri)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Avrasya Üniversitesi - Ömer Yıldız Yerleşkesi (Ortahisar)
INSERT INTO ktu_faculties (name, code, description) VALUES
('Avrasya Üniversitesi Ömer Yıldız Yerleşkesi', 'AVRASYA_OMER', 'Avrasya Üniversitesi Ömer Yıldız yerleşke birimleri - Ortahisar')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ===================================================================
-- GİRESUN ÜNİVERSİTESİ
-- ===================================================================

-- Giresun Üniversitesi Fakülteler
INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Eğitim Fakültesi', 'EGT_GIRESUN', 'Giresun Üniversitesi Eğitim Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Fen Edebiyat Fakültesi', 'FEN_GIRESUN', 'Giresun Üniversitesi Fen Edebiyat Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi İktisadi ve İdari Bilimler Fakültesi', 'IIBF_GIRESUN', 'Giresun Üniversitesi İktisadi ve İdari Bilimler Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi İslami İlimler Fakültesi', 'ILAH_GIRESUN', 'Giresun Üniversitesi İslami İlimler Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Mühendislik Fakültesi', 'MUH_GIRESUN', 'Giresun Üniversitesi Mühendislik Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Sağlık Bilimleri Fakültesi', 'SAGLIK_GIRESUN', 'Giresun Üniversitesi Sağlık Bilimleri Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Spor Bilimleri Fakültesi', 'SPOR_GIRESUN', 'Giresun Üniversitesi Spor Bilimleri Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Tıp Fakültesi', 'TIP_GIRESUN', 'Giresun Üniversitesi Tıp Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Diş Hekimliği Fakültesi', 'DIS_GIRESUN', 'Giresun Üniversitesi Diş Hekimliği Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Güzel Sanatlar Fakültesi', 'GSF_GIRESUN', 'Giresun Üniversitesi Güzel Sanatlar Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Denizcilik Fakültesi', 'DENIZ_GIRESUN', 'Giresun Üniversitesi Denizcilik Fakültesi')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Giresun Üniversitesi Yüksekokullar
INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Sağlık Yüksekokulu', 'SAGLIK_YOK_GIRESUN', 'Giresun Üniversitesi Sağlık Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Şebinkarahisar Uygulamalı Bilimler Yüksekokulu', 'SEBINK_YOK', 'Giresun Üniversitesi Şebinkarahisar Uygulamalı Bilimler Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Görele Güzel Sanatlar Fakültesi', 'GORELE_GSF', 'Giresun Üniversitesi Görele Güzel Sanatlar Fakültesi (eski yüksekokul yapısından geldi)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Giresun Üniversitesi Meslek Yüksekokulları
INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Giresun Meslek Yüksekokulu', 'GIRESUN_MYO', 'Giresun Üniversitesi Giresun Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Espiye Meslek Yüksekokulu', 'ESPIYE_MYO', 'Giresun Üniversitesi Espiye Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Tirebolu Mehmet Bayrak Meslek Yüksekokulu', 'TIREBOLU_MYO', 'Giresun Üniversitesi Tirebolu Mehmet Bayrak Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Dereli Meslek Yüksekokulu', 'DERELI_MYO', 'Giresun Üniversitesi Dereli Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Alucra Turan Bulutçu Meslek Yüksekokulu', 'ALUCRA_MYO', 'Giresun Üniversitesi Alucra Turan Bulutçu Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Şebinkarahisar Meslek Yüksekokulu', 'SEBINK_MYO', 'Giresun Üniversitesi Şebinkarahisar Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Eynesil Kamil Nalbant Meslek Yüksekokulu', 'EYNESIL_MYO', 'Giresun Üniversitesi Eynesil Kamil Nalbant Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Keşap Meslek Yüksekokulu', 'KESAP_MYO', 'Giresun Üniversitesi Keşap Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Piraziz Meslek Yüksekokulu', 'PIRAZIZ_MYO', 'Giresun Üniversitesi Piraziz Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Bulancak Meslek Yüksekokulu', 'BULANCAK_MYO', 'Giresun Üniversitesi Bulancak Meslek Yüksekokulu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Giresun Üniversitesi Enstitüler
INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Lisansüstü Eğitim Enstitüsü', 'LISANS_GIRESUN', 'Giresun Üniversitesi Lisansüstü Eğitim Enstitüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Sağlık Bilimleri Enstitüsü', 'SAGLIK_ENST_GIRESUN', 'Giresun Üniversitesi Sağlık Bilimleri Enstitüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Sosyal Bilimler Enstitüsü', 'SOSYAL_ENST_GIRESUN', 'Giresun Üniversitesi Sosyal Bilimler Enstitüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Fen Bilimleri Enstitüsü', 'FEN_ENST_GIRESUN', 'Giresun Üniversitesi Fen Bilimleri Enstitüsü')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Giresun Üniversitesi Konservatuvar
INSERT INTO ktu_faculties (name, code, description) VALUES
('Giresun Üniversitesi Devlet Konservatuvarı', 'KONS_GIRESUN', 'Giresun Üniversitesi Devlet Konservatuvarı')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ===================================================================
-- NOT: Bu script sadece fakülteleri ekler/günceller
-- Bölümler (departments) için ayrı bir script veya admin panel üzerinden
-- eklenmesi gerekecektir. Fakülteler eklendikten sonra bölümler
-- ktu_departments tablosuna eklenebilir.
-- ===================================================================


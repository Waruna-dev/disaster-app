import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Verified alerts near you',
    subtitle: 'Receive trusted flood and landslide warnings for the areas that matter to you.',
  },
  {
    id: '2',
    title: 'Report incidents safely',
    subtitle: 'Add the disaster type, location and a short description. Photos are always optional.',
  },
  {
    id: '3',
    title: 'Track every report',
    subtitle: 'See whether your report is Pending, Approved or Rejected, with a clear reason.',
  }
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/(auth)/language-select');
    } catch (e) {
      console.log('Failed to save onboarding status', e);
      router.replace('/(auth)/language-select');
    }
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const renderSlideGraphic = (index: number) => {
    switch (index) {
      case 0:
        return (
          <View style={styles.graphicContainer}>
            <View style={styles.heroBackground}>
              <Svg width="100%" height="100%" viewBox="0 0 375 350" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                <Circle cx="50" cy="50" r="40" fill={Colors.white} fillOpacity={0.15} />
                <Circle cx="320" cy="150" r="80" fill={Colors.white} fillOpacity={0.1} />
                <Path
                  d="M0,250 C100,200 250,300 375,220 L375,350 L0,350 Z"
                  fill="rgba(255,255,255,0.2)"
                />
              </Svg>
              <View style={styles.shieldLarge}>
                <Svg width="100" height="110" viewBox="0 0 100 110">
                  <Path d="M50 0 L90 20 V50 C90 80 50 110 50 110 C50 110 10 80 10 50 V20 Z" fill={Colors.primary} />
                  <Path d="M25 45 C35 35 45 45 50 45 C55 45 65 35 75 45 V65 C65 55 55 65 50 65 C45 65 35 55 25 65 Z" fill={Colors.white} />
                  <Path d="M25 55 C35 45 45 55 50 55 C55 55 65 45 75 55 V75 C65 65 55 75 50 75 C45 75 35 65 25 75 Z" fill="#B2F5EA" />
                </Svg>
              </View>
              <View style={[styles.floatingCard, { bottom: 20 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.warningIconBg}>
                    <Ionicons name="water" size={16} color="#E67E22" />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>Flood warning</Text>
                    <View style={styles.verifiedTag}>
                      <Ionicons name="checkmark" size={10} color={Colors.primary} />
                      <Text style={styles.verifiedText}>VERIFIED</Text>
                    </View>
                  </View>
                  <View style={styles.statusDot} />
                </View>
                <Text style={styles.cardSubtitle}>Kelaniya • Updated 10 min ago</Text>
              </View>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.graphicContainer}>
            <View style={styles.heroBackground}>
               <Svg width="100%" height="100%" viewBox="0 0 375 350" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                <Circle cx="300" cy="50" r="40" fill={Colors.white} fillOpacity={0.15} />
                <Circle cx="50" cy="300" r="50" fill={Colors.white} fillOpacity={0.15} />
              </Svg>
              <View style={styles.formCard}>
                <View style={styles.formFieldActive}>
                  <Ionicons name="water" size={18} color={Colors.white} style={styles.formIconRound} />
                  <Text style={styles.formFieldTextDark}>Flood</Text>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{marginLeft: 'auto'}} />
                </View>
                <View style={styles.formField}>
                  <Ionicons name="location" size={18} color={Colors.primary} />
                  <Text style={styles.formFieldTextLight}>Select affected area</Text>
                </View>
                <View style={styles.formTextArea}>
                  <Text style={styles.formFieldTextLight}>Short description</Text>
                  <View style={styles.mockLine} />
                  <View style={[styles.mockLine, { width: '60%' }]} />
                </View>
                <View style={styles.formActionsRow}>
                  <View style={styles.photoButtonMock}>
                    <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                    <Text style={styles.photoButtonText}>Photo</Text>
                  </View>
                  <View style={styles.submitButtonMock}>
                    <Text style={styles.submitButtonMockText}>Submit</Text>
                  </View>
                </View>
              </View>
              <View style={styles.floatingFab}>
                <Ionicons name="add" size={32} color={Colors.white} />
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.graphicContainer}>
            <View style={styles.heroBackground}>
              <Svg width="100%" height="100%" viewBox="0 0 375 350" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
                <Circle cx="80" cy="60" r="30" fill={Colors.white} fillOpacity={0.15} />
                <Circle cx="320" cy="280" r="60" fill={Colors.white} fillOpacity={0.15} />
              </Svg>
              <View style={[styles.floatingCard, { padding: 24, width: 280, borderRadius: 20 }]}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.cardTitle}>Report status</Text>
                  <Text style={styles.cardSubtitle}>FG-1042</Text>
                </View>
                
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: '#F39C12' }]}>
                    <Text style={{color: Colors.white, fontWeight: 'bold'}}>!</Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Pending</Text>
                    <Text style={styles.timelineDesc}>Your report was received</Text>
                  </View>
                </View>
                
                <View style={styles.timelineLine} />

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: '#E8F5F2', marginTop: 16 }]}>
                    <Ionicons name="add" size={14} color={Colors.primary} />
                  </View>
                  <View style={[styles.timelineContent, { marginTop: 14 }]}>
                    <Text style={styles.timelineTitle}>Under review</Text>
                    <Text style={styles.timelineDesc}>Evidence and location checked</Text>
                  </View>
                </View>

                <View style={styles.timelineLine2} />

                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: '#E8F5F2', marginTop: 16 }]}>
                    <Ionicons name="checkmark" size={14} color={Colors.primary} />
                  </View>
                  <View style={[styles.timelineContent, { marginTop: 14 }]}>
                    <Text style={styles.timelineTitle}>Approved</Text>
                    <Text style={styles.timelineDesc}>Verified alert published</Text>
                  </View>
                </View>

                <View style={styles.clearStatusBtn}>
                  <Text style={styles.clearStatusText}>CLEAR STATUS AT EVERY STEP</Text>
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Ionicons name="shield" size={16} color={Colors.white} />
          </View>
          <Text style={styles.headerBrand}>FloodGuard</Text>
        </View>
        <TouchableOpacity onPress={completeOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            {renderSlideGraphic(index)}
            <View style={styles.textContent}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          {currentIndex > 0 ? (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => scrollRef.current?.scrollTo({ x: (currentIndex - 1) * width, animated: true })}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.textDark} />
            </TouchableOpacity>
          ) : <View style={styles.backButtonPlaceholder} />}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? 'Get started' : 'Next'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
  },
  graphicContainer: {
    flex: 0.6,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  heroBackground: {
    flex: 1,
    backgroundColor: '#E2F8F1',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldLarge: {
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  floatingCard: {
    position: 'absolute',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningIconBg: {
    backgroundColor: '#FDEBD0',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F39C12',
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  formFieldActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  formIconRound: {
    backgroundColor: Colors.primary,
    padding: 4,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  formFieldTextDark: {
    fontWeight: '700',
    color: Colors.textDark,
    fontSize: 14,
  },
  formField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  formFieldTextLight: {
    color: Colors.placeholder,
    fontSize: 13,
    marginLeft: 8,
  },
  formTextArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    height: 80,
  },
  mockLine: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 12,
    width: '90%',
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButtonMock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0FDF4',
    flex: 0.45,
    justifyContent: 'center',
  },
  photoButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  submitButtonMock: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.45,
  },
  submitButtonMockText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  floatingFab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F39C12',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F39C12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  timelineDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 35,
    top: 70,
    width: 2,
    height: 35,
    backgroundColor: '#F39C12',
    zIndex: 1,
  },
  timelineLine2: {
    position: 'absolute',
    left: 35,
    top: 125,
    width: 2,
    height: 35,
    backgroundColor: '#E8F5F2',
    zIndex: 1,
  },
  clearStatusBtn: {
    backgroundColor: '#E8F5F2',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  clearStatusText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  textContent: {
    flex: 0.4,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 56,
  },
  nextButton: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
});

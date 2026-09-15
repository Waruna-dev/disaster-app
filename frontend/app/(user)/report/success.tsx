import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Logo } from '../../../components/Logo';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function SuccessScreen() {
  const { referenceNumber } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Logo width={32} height={32} variant="solid" />
          <Text style={styles.headerTitle}>FloodGuard</Text>
        </View>

        {/* Success Banner */}
        <View style={styles.banner}>
          {/* Background shapes */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Circle cx="15%" cy="20%" r="30" fill="rgba(255,255,255,0.4)" />
            <Path 
              d={`M0,150 Q${width * 0.25},110 ${width * 0.5},130 T${width},90 L${width},250 L0,250 Z`} 
              fill="rgba(255,255,255,0.3)" 
            />
          </Svg>
          
          <View style={styles.checkRing}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={60} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.bannerTitle}>Report submitted!</Text>
          <Text style={styles.bannerSubtitle}>Thank you for helping keep the community safe.</Text>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.disasterIconContainer}>
              <Ionicons name="water" size={24} color={Colors.primary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardLabel}>DISASTER TYPE</Text>
              <Text style={styles.cardValue}>Flood</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>PENDING</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={[styles.cardRow, { marginBottom: 16 }]}>
            <Ionicons name="location" size={20} color={Colors.primary} style={{marginRight: 16, marginLeft: 8}} />
            <View style={styles.cardTextContent}>
              <Text style={styles.cardLabel}>LOCATION</Text>
              <Text style={styles.cardValue}>Biyagama Road, Kelaniya</Text>
            </View>
          </View>
          
          <View style={styles.refRow}>
            <Text style={styles.cardLabel}>REFERENCE NUMBER</Text>
            <View style={styles.refRight}>
              <Text style={styles.refNumber}>{referenceNumber || 'N/A'}</Text>
              <TouchableOpacity style={styles.copyButton}>
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* What happens next */}
        <Text style={styles.sectionTitle}>What happens next?</Text>
        
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {/* Step 1 */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              </View>
              <Text style={styles.stepTextActive}>Submitted</Text>
            </View>
            
            {/* Line 1 */}
            <View style={styles.line}>
              <View style={[styles.lineFill, { width: '50%' }]} />
            </View>
            
            {/* Step 2 */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { borderColor: '#E69C24', backgroundColor: '#FFF9ED' }]}>
                <View style={styles.stepDotOrange} />
              </View>
              <Text style={[styles.stepTextActive, { color: '#E69C24' }]}>Under review</Text>
            </View>
            
            {/* Line 2 */}
            <View style={styles.line} />
            
            {/* Step 3 */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { borderColor: '#D1D5DB' }]} />
              <Text style={styles.stepTextInactive}>Decision</Text>
            </View>
          </View>
          
          <Text style={styles.stepperFooterText}>You can track this report from My Reports.</Text>
        </View>

      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryBtn} 
          activeOpacity={0.8}
          onPress={() => router.replace('/(user)/(tabs)/reports' as any)}
        >
          <Text style={styles.primaryBtnText}>View My Reports</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.white} style={styles.btnIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.outlineBtn} 
          activeOpacity={0.8}
          onPress={() => router.replace('/(user)/(tabs)' as any)}
        >
          <Text style={styles.outlineBtnText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#03392E',
    marginLeft: 12,
  },
  banner: {
    backgroundColor: '#E8F5F2',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  checkRing: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 100,
    marginBottom: 20,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#03392E',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#4B6B63',
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disasterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.placeholder,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2DF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E69C24',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E69C24',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 16,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  refRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginRight: 12,
  },
  copyButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E8F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  stepperCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  step: {
    alignItems: 'center',
    width: 70,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginBottom: 8,
    zIndex: 2,
  },
  stepDotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E69C24',
  },
  stepTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
  },
  stepTextInactive: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.placeholder,
    textAlign: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 13,
    marginHorizontal: -20,
    zIndex: 1,
  },
  lineFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  stepperFooterText: {
    fontSize: 13,
    color: Colors.placeholder,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: Colors.background,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    position: 'absolute',
    right: 20,
  },
  outlineBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  }
});

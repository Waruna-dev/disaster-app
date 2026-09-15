import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors } from '../constants/colors';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const [step, setStep] = useState<'splash' | 'loading'>('splash');
  const { height, width } = useWindowDimensions();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Stage 1: Wait 2.5s on splash, then go to loading
    const splashTimer = setTimeout(() => {
      setStep('loading');
    }, 2500);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (step === 'loading' && !isLoading) {
      // Add a small artificial delay so the loading text is readable for a moment
      const redirectTimer = setTimeout(() => {
        if (user) {
          router.replace('/(user)/(tabs)' as any);
        } else {
          router.replace('/(auth)/login' as any);
        }
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }
  }, [step, isLoading, user]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Background Graphics */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        {/* Top Right large circle */}
        <Circle cx="100%" cy="10%" r="150" fill={Colors.white} fillOpacity={0.03} />
        {/* Middle large circle */}
        <Circle cx="50%" cy="40%" r="90" fill={Colors.white} fillOpacity={0.03} />
        
        {/* Bottom Waves */}
        <Path
          d={`M0 ${height * 0.8} Q ${width * 0.25} ${height * 0.75} ${width * 0.5} ${height * 0.82} T ${width} ${height * 0.78} V ${height} H 0 Z`}
          fill={Colors.white}
          fillOpacity={0.04}
        />
        <Path
          d={`M0 ${height * 0.85} Q ${width * 0.3} ${height * 0.9} ${width * 0.6} ${height * 0.85} T ${width} ${height * 0.88} V ${height} H 0 Z`}
          fill={Colors.white}
          fillOpacity={0.06}
        />
      </Svg>

      <View style={styles.content}>
        
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Logo width={46} height={67} color={Colors.white} variant="outline" />
          </View>
          <Text style={styles.brandTitle}>FloodGuard</Text>
          <Text style={styles.brandSubtitle}>
            {step === 'splash' 
              ? 'Local alerts. Safer communities.'
              : 'Local Disaster & Flood Early-Warning Network'
            }
          </Text>
        </View>

        <View style={styles.dynamicSection}>
          {step === 'splash' ? (
            <View style={styles.pill}>
              <View style={styles.dot} />
              <Text style={styles.pillText}>FLOOD & LANDSLIDE EARLY WARNING</Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.white} style={styles.spinner} />
              <Text style={styles.loadingTitle}>Preparing your safety updates</Text>
              <Text style={styles.loadingSubtitle}>Checking alerts for your selected areas...</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {step === 'splash'
              ? 'Powered by verified community reports'
              : 'Please wait a moment'
            }
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: '35%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 12,
  },
  brandSubtitle: {
    fontSize: 15,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  dynamicSection: {
    height: 120, 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8EF6E4', 
    marginRight: 8,
  },
  pillText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.white,
    opacity: 0.6,
    fontSize: 12,
  }
});

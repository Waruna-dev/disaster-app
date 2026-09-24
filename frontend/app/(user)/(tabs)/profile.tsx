import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Ionicons, Feather } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { useAuth } from '../../../context/AuthContext';
import { auth, db } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '../../../components/UserAvatar';
import { getOptimizedAvatarUrl } from '../../../utils/cloudinaryUtils';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();

  const fullName = userProfile?.fullName || 'User';
  const initial = fullName.charAt(0).toUpperCase();
  const occupation = userProfile?.occupation || t('profile.noOccupation');
  const homeArea = userProfile?.homeArea?.name || userProfile?.homeArea?.address || t('profile.notSet');
  const avatarUrl = getOptimizedAvatarUrl(userProfile?.profileImage);
  
  const scrollRef = React.useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const email = user?.email || 'N/A';

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout') || 'Log out',
      t('profile.logoutConfirm') || 'Are you sure you want to log out?',
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('profile.logout') || 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/(auth)/login');
            } catch (e) {
              console.log(e);
            }
          }
        }
      ]
    );
  };

  const headerHeight = 220 + insets.top; // Adjusted to remove empty space

  const scrollY = React.useRef(new Animated.Value(0)).current;

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [0, 0, -50],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Header Background */}
      <Animated.View style={[styles.headerContainer, { height: headerHeight, transform: [{ translateY: headerTranslateY }] }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 402 ${190 + insets.top}`}
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <SvgLinearGradient id="headerGradient" x1="18" y1="0" x2="384" y2="224" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={Colors.gradientStart} />
              <Stop offset="1" stopColor={Colors.gradientEnd} />
            </SvgLinearGradient>
          </Defs>
          <Path
            d={`
              M0 0
              H402
              V${139 + insets.top}
              C323 ${169 + insets.top} 247 ${164 + insets.top} 183 ${143 + insets.top}
              C117 ${121 + insets.top} 62 ${127 + insets.top} 0 ${154 + insets.top}
              V0
              Z
            `}
            fill="url(#headerGradient)"
          />
          {/* Decorative circles */}
          <Circle cx="419" cy="48" r="100" fill="none" stroke={Colors.white} strokeOpacity={0.05} strokeWidth={26} />
          <Circle cx="-26" cy="61" r="89" fill={Colors.white} fillOpacity={0.035} />
        </Svg>
      </Animated.View>

      {/* Sticky Header Bar */}
      <View style={styles.headerBar}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.gradientStart, opacity: headerBgOpacity }]} />
        <View style={[styles.headerBarContent, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.8} onPress={() => router.push('/(user)/edit-profile')}>
            <Feather name="edit-2" size={16} color={Colors.white} style={styles.editIcon} />
            <Text style={styles.editButtonText}>{t('profile.edit')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight - 120 }]} 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        
        <Animated.View style={[styles.profileInfoContainer, { transform: [{ scale: avatarScale }] }]}>
          <UserAvatar
            imageUrl={avatarUrl}
            name={initial}
            size={90}
            borderWidth={4}
            borderColor={Colors.white}
          />
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileOccupation}>{occupation}</Text>
        </Animated.View>

        {/* Content Section */}
        <View style={styles.mainContent}>
          
          {/* Personal information */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('editProfile.personalInfo')}</Text>
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5F2' }]}>
                <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.rowTextContent}>
                <Text style={styles.rowLabel}>{t('login.email')}</Text>
                <Text style={styles.rowValue}>{email}</Text>
              </View>
            </View>
          </View>

          {/* Saved areas */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{t('profile.savedAreas')}</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(user)/edit-profile', params: { scrollTo: 'alertAreas' } })}>
                <Text style={styles.manageText}>{t('profile.manage')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5F2' }]}>
                <Ionicons name="home" size={22} color={Colors.primary} />
              </View>
              <View style={styles.rowTextContent}>
                <Text style={styles.rowLabel}>{t('profile.homeArea')}</Text>
                <Text style={styles.rowValue}>{homeArea}</Text>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5F2' }]}>
                <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.settingsText}>{t('profile.notificationSettings')}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.placeholder} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
              <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="help-circle-outline" size={22} color="#4F46E5" />
              </View>
              <Text style={styles.settingsText}>{t('profile.privacyPolicy')}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.placeholder} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.danger} style={{ transform: [{ scaleX: -1 }] }} />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>

        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 0,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editIcon: {
    marginRight: 6,
  },
  editButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  profileInfoContainer: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 12, // Added margin bottom since it was on avatarCircle
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  profileOccupation: {
    fontSize: 14,
    color: Colors.placeholder,
  },
  mainContent: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowTextContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.placeholder,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  logoutButton: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFE0E0',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  }
});

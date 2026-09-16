import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Ionicons, Feather } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { useAuth } from '../../../context/AuthContext';
import { auth, db } from '../../../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [fullName, setFullName] = useState('User');
  const [initial, setInitial] = useState('U');
  const [occupation, setOccupation] = useState('No occupation set');
  const [homeArea, setHomeArea] = useState('Not set');
  const [workArea, setWorkArea] = useState('Not set');

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.fullName) {
              setFullName(data.fullName);
              setInitial(data.fullName.charAt(0).toUpperCase());
            }
            if (data.occupation) setOccupation(data.occupation);
            if (data.homeArea) setHomeArea(data.homeArea);
            if (data.workArea) setWorkArea(data.workArea);
          }
        } catch (error) {
          console.log("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, [user]);

  const email = user?.email || 'N/A';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (e) {
      console.log(e);
    }
  };

  const headerHeight = 280 + insets.top; // Increased from 240 to push the wave down

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={[styles.headerContainer, { height: headerHeight }]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 402 ${250 + insets.top}`}
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
                V${199 + insets.top}
                C323 ${229 + insets.top} 247 ${224 + insets.top} 183 ${203 + insets.top}
                C117 ${181 + insets.top} 62 ${187 + insets.top} 0 ${214 + insets.top}
                V0
                Z
              `}
              fill="url(#headerGradient)"
            />
            {/* Decorative circles */}
            <Circle cx="419" cy="78" r="100" fill="none" stroke={Colors.white} strokeOpacity={0.05} strokeWidth={26} />
            <Circle cx="-26" cy="91" r="89" fill={Colors.white} fillOpacity={0.035} />
          </Svg>

          <View style={[styles.headerContent, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>Profile</Text>
              <TouchableOpacity style={styles.editButton} activeOpacity={0.8} onPress={() => router.push('/(user)/edit-profile')}>
                <Feather name="edit-2" size={16} color={Colors.white} style={styles.editIcon} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfoContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileOccupation}>{occupation}</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.mainContent}>
          
          {/* Personal information */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal information</Text>
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5F2' }]}>
                <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.rowTextContent}>
                <Text style={styles.rowLabel}>Email address</Text>
                <Text style={styles.rowValue}>{email}</Text>
              </View>
            </View>
          </View>

          {/* Saved areas */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Saved areas</Text>
              <TouchableOpacity onPress={() => router.push('/(user)/edit-profile')}>
                <Text style={styles.manageText}>Manage</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5F2' }]}>
                <Ionicons name="home" size={22} color={Colors.primary} />
              </View>
              <View style={styles.rowTextContent}>
                <Text style={styles.rowLabel}>Home area</Text>
                <Text style={styles.rowValue}>{homeArea}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.cardRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="school-outline" size={22} color="#4F46E5" />
              </View>
              <View style={styles.rowTextContent}>
                <Text style={styles.rowLabel}>Work/School area</Text>
                <Text style={styles.rowValue}>{workArea}</Text>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5F2' }]}>
                <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.settingsText}>Notification settings</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.placeholder} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
              <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="help-circle-outline" size={22} color="#4F46E5" />
              </View>
              <Text style={styles.settingsText}>Help and support</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.placeholder} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.danger} style={{ transform: [{ scaleX: -1 }] }} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
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
    width: '100%',
    position: 'relative',
    marginBottom: -20,
  },
  headerContent: {
    paddingHorizontal: 24,
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F5F2',
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  profileOccupation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
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

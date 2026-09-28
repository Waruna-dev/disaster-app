import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, PanResponder, Image, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Report } from '../../../types/report';
import { useWarnings } from '../../../hooks/useWarnings';
import { getWarningStatus } from '../../../utils/warningStatus';
import { WarningZone } from '../../../utils/reportMap';
import { UserMapEngine, UserMapEngineRef } from '../../../components/UserMapEngine';

export default function MapScreen() {
  const { t } = useTranslation();

  const [reports, setReports] = useState<Report[]>([]);
  const mapEngineRef = useRef<UserMapEngineRef>(null);

  // Pan Responder for swipe gestures on bottom card
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only claim the touch if they actually swipe (move > 10px vertically)
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Swipe Down
        if (gestureState.dy > 50) {
          setCardState(prev => prev === 'expanded' ? 'default' : 'minimized');
        }
        // Swipe Up
        else if (gestureState.dy < -50) {
          setCardState(prev => prev === 'minimized' ? 'default' : 'expanded');
        }
      }
    })
  ).current;

  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('Loading address...');
  

  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [cardState, setCardState] = useState<'minimized' | 'default' | 'expanded'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'flood' | 'landslide'>('all');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        let q;
        if (activeFilter === 'all') {
          q = query(collection(db, 'reports'), where('status', '==', 'Verified'));
        } else {
          q = query(collection(db, 'reports'), where('status', '==', 'Verified'), where('disasterType', '==', activeFilter));
        }
        
        const snapshot = await getDocs(q);
        const fetchedReports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter((r: any) => r.latitude && r.longitude) as Report[];
        setReports(fetchedReports);
      } catch (error) {
        console.error('Failed to fetch reports for map:', error);
      }
    };
    
    fetchReports();
  }, [activeFilter]);


  const handleLocationSelect = (coords: { latitude: number; longitude: number }, address: string, isResolving: boolean) => {
    setSelectedLocation(coords);
    setSelectedAddress(isResolving ? 'Loading address...' : address);
    setSelectedReport(null);
    setCardState('default');
  };

  const handleReportTap = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      setCardState('default');
    }
  };

  const handleReportLocation = () => {
    if (!selectedLocation) return;
    router.push({
      pathname: '/report/create',
      params: {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        address: selectedAddress,
      }
    });
  };

  // Only initialize the HTML with empty reports so it doesn't reload entirely
  const { warnings } = useWarnings();
  
  const warningZones = useMemo<WarningZone[]>(
    () =>
      warnings
        .filter((w) => getWarningStatus(w) === 'Active' && (activeFilter === 'all' || w.hazardType?.toLowerCase() === activeFilter.toLowerCase()))
        .map((w) => ({
          id: w.id,
          title: w.title,
          affectedArea: w.affectedArea,
          riskLevel: w.riskLevel,
          status: getWarningStatus(w),
          centroid: { latitude: w.latitude, longitude: w.longitude },
          polygon: w.polygon ?? null,
          radiusMeters: w.radius,
        })),
    [warnings, activeFilter]
  );

  return (
    <View style={styles.container}>
      <UserMapEngine
        ref={mapEngineRef}
        mode="report"
        warnings={warningZones}
        onLocationSelect={handleLocationSelect}
        onReportTap={handleReportTap}
        locateMeButtonBottom={cardState === 'minimized' ? 100 : (selectedReport ? (cardState === 'expanded' ? 450 : 210) : 280)}
      />

      {/* Top Floating Header */}
      <View style={styles.topHeaderContainer}>
        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>{t('mapExtra.all')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'flood' && styles.filterChipActive]}
            onPress={() => setActiveFilter('flood')}
          >
            <MaterialIcons name="flood" size={16} color={activeFilter === 'flood' ? 'white' : 'orange'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterText, activeFilter === 'flood' && styles.filterTextActive]}>{t('mapExtra.floods')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, activeFilter === 'landslide' && styles.filterChipActive]}
            onPress={() => setActiveFilter('landslide')}
          >
            <MaterialIcons name="landslide" size={16} color={activeFilter === 'landslide' ? 'white' : Colors.danger} style={{ marginRight: 4 }} />
            <Text style={[styles.filterText, activeFilter === 'landslide' && styles.filterTextActive]}>{t('mapExtra.landslides')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet / Card */}
      <View style={[styles.bottomCard, cardState === 'expanded' && { maxHeight: '70%' }]} {...panResponder.panHandlers}>
        <TouchableOpacity 
          style={styles.dragHandleContainer} 
          activeOpacity={0.7} 
          onPress={() => setCardState(prev => prev === 'minimized' ? 'default' : 'minimized')}
        >
          <View style={styles.dragHandle} />
        </TouchableOpacity>

        {cardState !== 'minimized' && (
          <>
            {selectedReport ? (
              <View>
            <Text style={styles.cardTitle}>{selectedReport.disasterType === 'flood' ? 'Flood' : 'Landslide'} Report</Text>
            <Text style={styles.cardSubtitle}>{selectedReport.affectedArea}</Text>
            
            {selectedReport.createdAt && (
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.dateText}>
                  Submitted: {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleString() : new Date(selectedReport.createdAt.seconds * 1000).toLocaleString()}
                </Text>
              </View>
            )}
            
            <Text style={styles.cardDescription}>{selectedReport.description}</Text>
            {cardState === 'expanded' && (
              <View style={{ marginTop: 16, minHeight: 160, justifyContent: 'center' }}>
                {(selectedReport.photoUrls?.length > 0 || selectedReport.photoUrl) ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(selectedReport.photoUrls || [selectedReport.photoUrl]).map((url: string, index: number) => url ? (
                      <Image 
                        key={index}
                        source={{ uri: url }} 
                        style={{ width: 160, height: 160, borderRadius: 12, marginRight: 12 }} 
                        resizeMode="cover" 
                      />
                    ) : null)}
                  </ScrollView>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: Colors.background, borderRadius: 12 }}>
                    <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
                    <Text style={{ marginTop: 8, color: Colors.textMuted }}>No images attached to this report.</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedReport(null)}>
              <Ionicons name="close" size={20} color={Colors.textDark} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.cardTitle}>{t('mapExtra.reportIncidentHere')}</Text>
            <Text style={styles.cardSubtitle}>{t('mapExtra.tapAnotherPoint')}</Text>
            
            <View style={styles.addressBox}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <View style={styles.addressTextContainer}>
                <Text style={styles.addressText}>{selectedAddress}</Text>
                <Text style={styles.addressSubtext}>{t('mapExtra.selectedLocation')}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.reportButton} onPress={handleReportLocation}>
              <Text style={styles.reportButtonText}>{t('mapExtra.reportThisLocation')}</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
        </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
  },
  topHeaderContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    alignItems: 'flex-start',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  filterTextActive: {
    color: 'white',
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 10,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    minHeight: 50,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 2.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  addressTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  addressSubtext: {
    fontSize: 12,
    color: Colors.textMedium,
  },
  reportButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 8,
  },
});

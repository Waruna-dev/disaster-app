import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ReportCardProps {
  type: 'flood' | 'landslide';
  status: 'pending' | 'approved' | 'rejected';
  id: string;
  location: string;
  date: string;
  rejectReason?: string;
}

export function ReportCard({ type, status, id, location, date, rejectReason }: ReportCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending': return { bg: '#FEF5E7', text: '#D68910', label: 'PENDING' };
      case 'approved': return { bg: '#E8F5F2', text: Colors.primary, label: 'APPROVED' };
      case 'rejected': return { bg: '#FDEDEC', text: Colors.danger, label: 'REJECTED' };
    }
  };

  const getIconConfig = () => {
    switch (status) {
      case 'pending': return { name: 'water', color: '#D68910', bg: '#FEF5E7' };
      case 'approved': return { name: 'checkmark', color: Colors.primary, bg: '#E8F5F2' };
      case 'rejected': return { name: 'close', color: Colors.danger, bg: '#FDEDEC' };
    }
  };

  const statusConfig = getStatusConfig();
  const iconConfig = getIconConfig();
  
  const title = type === 'flood' ? 'Flood report' : 'Landslide report';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.leftGroup}>
          <View style={[styles.iconWrapper, { backgroundColor: iconConfig.bg }]}>
            <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.reportId}>Report ID: {id}</Text>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.badgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.location}>{location}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {status === 'rejected' && rejectReason && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>Reason: {rejectReason}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F5F4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 2,
  },
  reportId: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F5F4',
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  location: {
    fontSize: 13,
    color: Colors.textLight,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  reasonBox: {
    backgroundColor: '#FDEDEC',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reasonText: {
    fontSize: 12,
    color: Colors.danger,
  }
});

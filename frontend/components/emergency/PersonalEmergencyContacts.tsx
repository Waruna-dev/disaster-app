import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useEmergencyContacts } from '../../hooks/useEmergencyContacts';
import { useLocationHelper } from '../../hooks/useLocationHelper';
import { AddEmergencyContactModal } from './AddEmergencyContactModal';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export const PersonalEmergencyContacts = () => {
  const { t } = useTranslation();
  const { contacts, isLoadingContacts, addContact, deleteContact } = useEmergencyContacts();
  const { user } = useAuth();
  const { getCurrentLocationMapLink } = useLocationHelper();
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isSendingLocationId, setIsSendingLocationId] = useState<string | null>(null);

  const handleDeleteContact = (id: string, name: string) => {
    Alert.alert(
      t('emergency.deleteContact', 'Delete Contact'),
      t('emergency.deleteConfirmMsg', 'Are you sure you want to delete {{name}} from your emergency contacts?', { name }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('common.delete', 'Delete'), 
          style: 'destructive',
          onPress: () => deleteContact(id)
        }
      ]
    );
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSendLocation = async (id: string, phone: string, contactName: string) => {
    if (isSendingLocationId) return;
    
    try {
      setIsSendingLocationId(id);
      const mapLink = await getCurrentLocationMapLink(true);
      
      if (mapLink) {
        const senderName = user?.displayName;
        const greeting = senderName
          ? `Hi ${contactName}, this is ${senderName}.`
          : `Hi ${contactName}.`;

        const message = [
          `${greeting} I may need your help, so I’m sharing my current location to help you find me.`,
          "",
          "My current location:",
          mapLink,
          "",
          "Please check the location and call me when you receive this message."
        ].join('\n');

        const separator = Platform.OS === 'ios' ? '&' : '?';
        const smsUrl = `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
        
        const supported = await Linking.canOpenURL(smsUrl);
        if (!supported) {
          Alert.alert(
            t('emergency.messagingUnavailable', "Messaging unavailable"),
            t('emergency.messagingUnavailableMsg', "Your device could not open the messaging application.")
          );
          return;
        }
        
        await Linking.openURL(smsUrl);
      }
    } finally {
      setIsSendingLocationId(null);
    }
  };

  const handleOpenAddModal = () => {
    if (contacts.length >= 5) {
      Alert.alert(t('emergency.limitReached', 'Limit Reached'), t('emergency.limitReachedMsg', 'You can only add up to 5 emergency contacts.'));
      return;
    }
    setAddModalVisible(true);
  };

  const formatDisplayPhone = (phone: string) => {
    if (phone.length === 10 && phone.startsWith('0')) {
      return `${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6)}`;
    }
    if (phone.startsWith('+94')) {
      return `${phone.substring(0, 3)} ${phone.substring(3, 5)} ${phone.substring(5, 8)} ${phone.substring(8)}`;
    }
    return phone;
  };

  return (
    <View>
      <View style={[styles.sectionHeaderRow, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>{t('emergency.myContacts', 'My emergency contacts')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
          <Text style={styles.addButtonText}>+ {t('common.add', 'Add')}</Text>
        </TouchableOpacity>
      </View>

      {isLoadingContacts ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You haven't added any emergency contacts yet.</Text>
        </View>
      ) : (
        contacts.map((contact) => (
          <View style={styles.listCard} key={contact.id}>
            <View style={styles.listCardTop}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.listCardInfo}>
                <Text style={styles.listCardTitle} numberOfLines={1}>{contact.name}</Text>
                <Text style={styles.listCardSubtitle} numberOfLines={1}>{contact.category}   {formatDisplayPhone(contact.phone)}</Text>
              </View>
              <View style={styles.contactActionsRow}>
                <TouchableOpacity 
                  style={[styles.circleButton, { backgroundColor: '#FFEBEE' }]} 
                  onPress={() => handleDeleteContact(contact.id, contact.name)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.circleButton} 
                  onPress={() => handleCall(contact.phone)}
                >
                  <Ionicons name="call" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.circleButton} 
                  onPress={() => handleSendLocation(contact.id, contact.phone, contact.name)}
                  disabled={isSendingLocationId === contact.id}
                >
                  {isSendingLocationId === contact.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="send" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={styles.footerInfoBox}>
        <View style={styles.infoIconCircle}>
          <Text style={styles.infoIconText}>i</Text>
        </View>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.footerInfoText}>Sharing opens your phone's messaging or share menu.</Text>
          <Text style={styles.footerInfoText}>You choose whether the location is sent.</Text>
        </View>
      </View>

      <AddEmergencyContactModal
        visible={isAddModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={addContact}
        existingContacts={contacts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  addButton: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFC',
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E6EFEA',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  listCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  listCardSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F9F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerInfoBox: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
  },
  infoIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoIconText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  infoTextWrapper: {
    flexDirection: 'column',
    flex: 1,
  },
  footerInfoText: {
    fontSize: 12,
    color: Colors.textLight,
  },
});

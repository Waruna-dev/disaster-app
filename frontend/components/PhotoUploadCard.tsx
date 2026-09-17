import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';

interface PhotoUploadCardProps {
  photoUris?: string[];
  onPhotoSelect: (uri: string) => void;
  onPhotoRemove: (index: number) => void;
}

export function PhotoUploadCard({ photoUris = [], onPhotoSelect, onPhotoRemove }: PhotoUploadCardProps) {
  const { t } = useTranslation();
  const handlePress = async () => {
    Alert.alert(
      t('reportCreate.uploadPhoto'),
      t('reportCreate.chooseOption'),
      [
        {
          text: t('reportCreate.takePhoto'),
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(t('reportCreate.permissionNeeded'), t('reportCreate.cameraPermission'));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              onPhotoSelect(result.assets[0].uri);
            }
          }
        },
        {
          text: t('reportCreate.chooseGallery'),
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(t('reportCreate.permissionNeeded'), t('reportCreate.galleryPermission'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              onPhotoSelect(result.assets[0].uri);
            }
          }
        },
        {
          text: t('reportCreate.cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{t('reportCreate.addPhotoEvidence')} <Text style={styles.optional}>({photoUris.length}/3)</Text></Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {photoUris.length < 3 && (
          <TouchableOpacity 
            style={photoUris.length > 0 ? styles.cardSmall : styles.card} 
            activeOpacity={0.7} 
            onPress={handlePress}
          >
            <Ionicons name="camera-outline" size={28} color={Colors.primary} style={photoUris.length === 0 ? styles.icon : undefined} />
            {photoUris.length === 0 && (
              <View>
                <Text style={styles.title}>{t('reportCreate.choosePhoto')}</Text>
                <Text style={styles.subtitle}>{t('reportCreate.photoMax')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {photoUris.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
            {photoUris.map((uri, index) => (
              <View key={index} style={styles.previewContainer}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeButton} onPress={() => onPhotoRemove(index)} activeOpacity={0.8}>
                  <Ionicons name="close-circle" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    /* no padding */
    marginBottom: 32,
  },
  optional: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  optional: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
  scrollContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  cardLarge: {
    borderWidth: 1.5,
    borderColor: '#C3E0D8',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFC',
    marginRight: 12,
    width: '100%',
  },
  textContent: {
    flex: 1,
  },
  cardSmall: {
    borderWidth: 1.5,
    borderColor: '#C3E0D8',
    borderStyle: 'dashed',
    borderRadius: 12,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFCFC',
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  previewContainer: {
    width: 140,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  }
});

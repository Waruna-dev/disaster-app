import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { useTranslation } from 'react-i18next';

interface PhotoUploadCardProps {
  photoUris?: string[];
  onPhotoSelect: (uri: string | string[]) => void;
  onPhotoRemove: (index: number) => void;
}

export function PhotoUploadCard({ photoUris = [], onPhotoSelect, onPhotoRemove }: PhotoUploadCardProps) {
  const { t } = useTranslation();

  const handlePress = async () => {
    Alert.alert(
      t('reportCreate.uploadPhoto', 'Upload Photo'),
      t('reportCreate.chooseOption', 'Choose an option'),
      [
        {
          text: t('reportCreate.takePhoto', 'Take Photo'),
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(t('common.permissionNeeded', 'Permission needed'), t('reportCreate.cameraPermMsg', 'You need to grant camera permissions to take a photo.'));
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
          text: t('reportCreate.chooseGallery', 'Choose from Gallery'),
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert(t('common.permissionNeeded', 'Permission needed'), t('reportCreate.galleryPermMsg', 'You need to grant gallery permissions to pick a photo.'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              allowsMultipleSelection: true,
              selectionLimit: 3 - photoUris.length,
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              onPhotoSelect(result.assets.map(a => a.uri));
            }
          }
        },
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('reportCreate.addPhotoEvidence', 'Add photo evidence')} <Text style={styles.optional}>({photoUris.length}/3)</Text></Text>
      
      <View style={styles.gridContainer}>
        {photoUris.map((uri, index) => (
          <View key={index} style={styles.previewContainer}>
            <Image source={{ uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeButton} onPress={() => onPhotoRemove(index)} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ))}

        {photoUris.length < 3 && (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={handlePress}>
            <Ionicons name="camera-outline" size={28} color={Colors.primary} style={styles.icon} />
            {photoUris.length === 0 && (
              <View style={styles.textContainer}>
                <Text style={styles.title}>{t('reportCreate.choosePhoto', 'Choose photo')}</Text>
                <Text style={styles.subtitle}>{t('reportCreate.maxPhotos', 'Max 3 photos')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    padding: 16,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    borderWidth: 1.5,
    borderColor: '#C3E0D8',
    borderStyle: 'dashed',
    borderRadius: 12,
    width: 110,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFCFC',
  },
  icon: {
    marginBottom: 4,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  previewContainer: {
    width: 110,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
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

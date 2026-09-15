import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';

interface PhotoUploadCardProps {
  photoUri?: string;
  onPhotoSelect: (uri: string) => void;
  onPhotoRemove: () => void;
}

export function PhotoUploadCard({ photoUri, onPhotoSelect, onPhotoRemove }: PhotoUploadCardProps) {
  const handlePress = async () => {
    Alert.alert(
      'Upload Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('Permission needed', 'You need to grant camera permissions to take a photo.');
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
          text: 'Choose from Gallery',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('Permission needed', 'You need to grant gallery permissions to pick a photo.');
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
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Add a photo <Text style={styles.optional}>(optional)</Text></Text>
      
      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removeButton} onPress={onPhotoRemove} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={handlePress}>
          <Ionicons name="camera-outline" size={28} color={Colors.primary} style={styles.icon} />
          <View>
            <Text style={styles.title}>Choose photo</Text>
            <Text style={styles.subtitle}>JPG or PNG, maximum 5 MB</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
  card: {
    borderWidth: 1.5,
    borderColor: '#C3E0D8',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFC',
  },
  icon: {
    marginRight: 16,
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
    width: '100%',
    height: 180,
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
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  }
});

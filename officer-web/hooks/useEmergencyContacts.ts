import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PersonalEmergencyContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  createdAt: number;
}

const EMERGENCY_CONTACTS_KEY = '@floodguard_personal_emergency_contacts';

export const useEmergencyContacts = () => {
  const [contacts, setContacts] = useState<PersonalEmergencyContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoadingContacts(true);
      const storedContacts = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
      if (storedContacts) {
        const parsed = JSON.parse(storedContacts);
        if (Array.isArray(parsed)) {
          setContacts(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load contacts from AsyncStorage', err);
      setError('Failed to load contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const addContact = async (contact: Omit<PersonalEmergencyContact, 'id' | 'createdAt'>) => {
    try {
      const newContact: PersonalEmergencyContact = {
        ...contact,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        createdAt: Date.now(),
      };

      const updatedContacts = [...contacts, newContact];
      setContacts(updatedContacts);
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(updatedContacts));
      return { success: true };
    } catch (err) {
      console.error('Failed to save contact', err);
      return { success: false, error: 'Failed to save contact' };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const updatedContacts = contacts.filter((c) => c.id !== id);
      setContacts(updatedContacts);
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(updatedContacts));
      return { success: true };
    } catch (err) {
      console.error('Failed to delete contact', err);
      return { success: false, error: 'Failed to delete contact' };
    }
  };

  return {
    contacts,
    isLoadingContacts,
    error,
    addContact,
    deleteContact,
  };
};

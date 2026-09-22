import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { registerUser } from '../../services/authService';
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Logo } from "../../components/Logo";
import { useTranslation } from 'react-i18next';

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Original SVG size: 402 × 200 for the header
  const headerHeight = width * (200 / 402);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sriLankaPhoneRegex = /^(?:0|94|\+94)?(?:7\d{8}|[1-9]\d{8})$/;

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return t('register.passwordTooShort') || "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return t('register.passwordNoUpper') || "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return t('register.passwordNoLower') || "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pwd)) return t('register.passwordNoNumber') || "Password must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(pwd)) return t('register.passwordNoSpecial') || "Password must contain at least one special character.";
    return null;
  };

  const handleRegister = async () => {
    if (!fullName || !email || !contactNumber || !password || !confirmPassword) {
      Alert.alert(t('register.error'), t('register.fillFields'));
      return;
    }

    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('register.error'), t('register.invalidEmail') || "Invalid email address format.");
      return;
    }

    if (!sriLankaPhoneRegex.test(contactNumber.trim())) {
      Alert.alert(t('register.error'), t('register.invalidPhone') || "Please enter a valid Sri Lankan phone number (e.g., 0712345678 or +94712345678).");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      Alert.alert(t('register.error'), pwdError);
      return;
    }

    if (!agreeTerms) {
      Alert.alert(t('register.error'), t('register.agreeRequired') || "You must agree to the Terms and Privacy Policy.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('register.error'), t('register.passwordMismatch'));
      return;
    }

    try {
      setLoading(true);
      await registerUser(email.trim(), password, fullName.trim(), contactNumber.trim());
      // Fallback routing, index.tsx splash will also catch it if mounted
      router.replace("/(user)/(tabs)" as any);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(t('register.errorRegistering'), t('register.emailInUse') || "This email is already in use by another account.");
      } else {
        Alert.alert(
          t('register.errorRegistering'),
          error.message || "Failed to create account"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.keyboardView}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >
          {/* Correct curved header */}
          <View style={[styles.topSection, { height: headerHeight }]}>
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 402 200"
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <SvgLinearGradient
                  id="headerGradient"
                  x1="18"
                  y1="0"
                  x2="384"
                  y2="224"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={Colors.gradientStart} />
                  <Stop offset="1" stopColor={Colors.gradientEnd} />
                </SvgLinearGradient>
              </Defs>

              {/* Exact green wave from the reference SVG */}
              <Path
                d="
                  M0 0
                  H402
                  V169
                  C323 199 247 194 183 173
                  C117 151 62 157 0 184
                  V0
                  Z
                "
                fill="url(#headerGradient)"
              />

              {/* Left background circle */}
              <Circle
                cx="-26"
                cy="91"
                r="89"
                fill={Colors.white}
                fillOpacity={0.035}
              />

              {/* Right background ring */}
              <Circle
                cx="419"
                cy="78"
                r="100"
                fill="none"
                stroke={Colors.white}
                strokeOpacity={0.05}
                strokeWidth={26}
              />
            </Svg>

            <View
              style={[
                styles.headerContent,
                { paddingTop: insets.top + 12 },
              ]}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={Colors.white}
                />
              </TouchableOpacity>

              <View style={[styles.headerTextContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                <Logo width={28} height={40} color={Colors.white} variant="outline" />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.brandTitle}>{t('register.headerTitle')}</Text>

                  <Text style={styles.brandSubtitle}>
                    {t('register.headerSubtitle')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Registration form */}
          <View style={styles.formSection}>
            <Text style={styles.title}>{t('register.title')}</Text>

            <Text style={styles.subtitle}>
              {t('register.subtitle')}
            </Text>

            <FormInput
              label={t('register.fullName')}
              placeholder={t('register.fullNamePlaceholder')}
              iconName="person-outline"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <FormInput
              label={t('register.email')}
              placeholder={t('register.emailPlaceholder')}
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              label="Contact Number"
              placeholder={t('0712345678') || '0712345678'}
              iconName="call-outline"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />

            <FormInput
              label={t('register.password')}
              placeholder={t('register.passwordPlaceholder')}
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <FormInput
              label={t('register.confirmPassword')}
              placeholder={t('register.confirmPasswordPlaceholder')}
              iconName="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreeTerms((current) => !current)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  agreeTerms && styles.checkboxActive,
                ]}
              >
                {agreeTerms && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={Colors.white}
                  />
                )}
              </View>

              <Text style={styles.checkboxText}>
                {t('register.agreeTo')}{" "}
                <Text style={styles.checkboxTextBold}>
                  {t('register.terms')}
                </Text>
              </Text>
            </TouchableOpacity>

            <PrimaryButton
              title={t('register.createAccount')}
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <View style={styles.loginLinkContainer}>
              <Text style={styles.noAccountText}>
                {t('register.alreadyHaveAccount')}{" "}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.replace("/(auth)/login" as any)
                }
              >
                <Text style={styles.loginText}>{t('register.login')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },

  topSection: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },

  headerContent: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.13)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  headerTextContainer: {
    justifyContent: "center",
  },

  brandTitle: {
    color: Colors.white,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "700",
  },

  brandSubtitle: {
    color: Colors.headerSubtitle,
    fontSize: 12,
    lineHeight: 18,
  },

  formSection: {
    paddingHorizontal: 28,
    paddingTop: 9,
  },

  title: {
    color: Colors.textDark,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "700",
  },

  subtitle: {
    color: Colors.textLight,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 1,
    marginBottom: 27,
  },

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 25,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  checkboxText: {
    flex: 1,
    color: Colors.checkboxText,
    fontSize: 12.5,
    lineHeight: 18,
  },

  checkboxTextBold: {
    color: Colors.primary,
    fontWeight: "700",
  },

  registerButton: {
    minHeight: 56,
    borderRadius: 14,
    marginBottom: 25,
  },

  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  noAccountText: {
    color: Colors.bottomText,
    fontSize: 14,
  },

  loginText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});

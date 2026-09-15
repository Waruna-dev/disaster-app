import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Alert,
} from "react-native";
import { loginUser } from '../../services/authService';

import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
} from "react-native-svg";

import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../../constants/colors";
import { FormInput } from "../../components/FormInput";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function LoginScreen() {
  const { width } = useWindowDimensions();

  // Original reference width is 402px
  const scale = width / 402;
  const headerHeight = 314 * scale;
  const cardOverlap = 83 * scale;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      await loginUser(email.trim(), password);
      // Fallback routing, index.tsx splash will also catch it if mounted
      router.replace("/(user)/(tabs)" as any);
    } catch (error: any) {
      Alert.alert("Login Failed", "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Exact login header */}
          <View style={[styles.topSection, { height: headerHeight }]}>
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 402 314"
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <SvgLinearGradient
                  id="loginHeaderGradient"
                  x1="22"
                  y1="0"
                  x2="380"
                  y2="310"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={Colors.gradientStart} />
                  <Stop offset="1" stopColor={Colors.gradientEnd} />
                </SvgLinearGradient>
              </Defs>

              {/* Exact login wave */}
              <Path
                d="
                  M0 0
                  H402
                  V280
                  C348 307 292 314 235 291
                  C165 263 96 266 0 306
                  V0
                  Z
                "
                fill="url(#loginHeaderGradient)"
              />

              {/* Decorative circles */}
              <Circle
                cx="-28"
                cy="99"
                r="102"
                fill={Colors.white}
                fillOpacity={0.035}
              />

              <Circle
                cx="414"
                cy="106"
                r="118"
                fill="none"
                stroke={Colors.white}
                strokeOpacity={0.05}
                strokeWidth={28}
              />

              {/* Logo background */}
              <Circle
                cx="201"
                cy="105"
                r="42"
                fill={Colors.white}
                fillOpacity={0.13}
                stroke={Colors.white}
                strokeOpacity={0.2}
              />
              <G x="178" y="72" scale="0.75">
                <Path d="M31 0L62 11V37C62 60 50 79 31 90C12 79 0 60 0 37V11L31 0Z" fill="none" stroke={Colors.white} strokeWidth="6" strokeLinejoin="round" />
              </G>

              {/* Header title */}
              <SvgText
                x="201"
                y="170"
                fill={Colors.white}
                fontSize="27"
                fontWeight="700"
                fontFamily="System"
                textAnchor="middle"
              >
                FloodGuard
              </SvgText>

              {/* Header subtitle */}
              <SvgText
                x="201"
                y="197"
                fill={Colors.headerSubtitle}
                fontSize="13"
                fontWeight="500"
                fontFamily="System"
                textAnchor="middle"
              >
                Stay informed. Stay safe.
              </SvgText>
            </Svg>
          </View>

          {/* Login card */}
          <View
            style={[
              styles.card,
              {
                marginHorizontal: 22 * scale,
                marginTop: -cardOverlap,
                minHeight: 552 * scale,
              },
            ]}
          >
            <Text style={styles.title}>Welcome back</Text>

            <Text style={styles.subtitle}>
              Log in to view local safety updates.
            </Text>

            <FormInput
              label="Email address"
              placeholder="Enter your email"
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              label="Password"
              placeholder="Enter your password"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setRememberMe((currentValue) => !currentValue)
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxActive,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={Colors.white}
                    />
                  )}
                </View>

                <Text style={styles.checkboxText}>
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  router.push("/(auth)/forgot-password" as any)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Log in"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.registerLinkContainer}>
              <Text style={styles.noAccountText}>
                Don’t have an account?{" "}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push("/(auth)/register" as any)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.registerText}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },

  topSection: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,

    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.13,
    shadowRadius: 18,

    elevation: 8,
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

  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 33,
  },

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputSoftBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  checkboxText: {
    color: Colors.checkboxText,
    fontSize: 13,
    lineHeight: 18,
  },

  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  loginButton: {
    minHeight: 58,
    borderRadius: 14,
    marginBottom: 34,
  },

  registerLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  noAccountText: {
    color: Colors.bottomText,
    fontSize: 14,
  },

  registerText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});

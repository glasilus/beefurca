import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";
import { RefereeScreen } from "./src/screens/RefereeScreen";

const API_BASE_URL = "http://localhost:5000"; // Fallback to local dev server

export default function App() {
  const [fontsLoaded] = useFonts({
    "Grafmassa": require("./assets/fonts/Grafmassa-Regular.ttf"),
    "Unifix SP": require("./assets/fonts/UnifixSPDemo.otf"),
    "Beast": require("./assets/fonts/Beast-Regular.otf"),
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentScreen, setCurrentScreen] = useState<"login" | "dashboard" | "referee">("login");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load token on startup
  useEffect(() => {
    SecureStore.getItemAsync("user_token")
      .then((savedToken) => {
        if (savedToken) {
          setToken(savedToken);
          fetchProfile(savedToken);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUserProfile(data.profile);
        setCurrentScreen("dashboard");
      } else {
        // Expired token
        await SecureStore.deleteItemAsync("user_token");
        setToken(null);
      }
    } catch (err) {
      console.log("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.accessToken);
        await SecureStore.setItemAsync("user_token", data.accessToken);
        await fetchProfile(data.accessToken);
      } else {
        setAuthError(data.error || "Неверный логин или пароль");
        setLoading(false);
      }
    } catch (err: any) {
      setAuthError(`Ошибка сети: ${err.message}`);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      // Ignore network errors on logout
    }
    await SecureStore.deleteItemAsync("user_token");
    setToken(null);
    setUserProfile(null);
    setCurrentScreen("login");
    setLoading(false);
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF1F44" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050709" />

      {/* Screen 1: Login */}
      {currentScreen === "login" && (
        <View style={styles.loginContainer}>
          <Text style={styles.logo}>BEEFURCA</Text>
          <Text style={styles.loginTitle}>Вход в мобильный клиент</Text>

          {!!authError && <Text style={styles.errorText}>{authError}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Электронная почта"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnTxt}>Войти</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Screen 2: Dashboard */}
      {currentScreen === "dashboard" && (
        <View style={styles.dashboardContainer}>
          <Text style={styles.headerTitle}>Профиль арбитра</Text>
          <Text style={styles.profileText}>Никнейм: {userProfile?.nickname}</Text>
          <Text style={styles.profileText}>Роль: {userProfile?.role}</Text>
          <Text style={styles.profileText}>Рейтинг ELO: {userProfile?.elo}</Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Открыть судейский протокол</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите ID матча..."
            placeholderTextColor="#64748B"
            value={selectedMatchId}
            onChangeText={setSelectedMatchId}
          />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (selectedMatchId.trim()) {
                setCurrentScreen("referee");
              } else {
                alert("Пожалуйста, введите ID матча");
              }
            }}
          >
            <Text style={styles.actionBtnTxt}>Перейти к судейству</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnTxt}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Screen 3: Referee protocol */}
      {currentScreen === "referee" && (
        <View style={{ flex: 1 }}>
          <RefereeScreen
            matchId={selectedMatchId}
            authToken={token || ""}
            apiBaseUrl={API_BASE_URL}
          />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentScreen("dashboard")}
          >
            <Text style={styles.backBtnTxt}>← Назад в профиль</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050709",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050709",
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontFamily: "Beast",
    fontSize: 36,
    color: "#FF1F44",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 8,
  },
  loginTitle: {
    fontFamily: "Unifix SP",
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 30,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: "Grafmassa",
    color: "#FF1F44",
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  input: {
    fontFamily: "Grafmassa",
    height: 50,
    backgroundColor: "#11161B",
    borderColor: "#1B232D",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    marginBottom: 16,
    fontSize: 14,
  },
  loginBtn: {
    height: 50,
    backgroundColor: "#FF1F44",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginBtnTxt: {
    fontFamily: "Grafmassa",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  dashboardContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Grafmassa",
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  profileText: {
    fontFamily: "Grafmassa",
    fontSize: 14,
    color: "#E2E8F0",
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#1B232D",
    marginVertical: 24,
  },
  sectionTitle: {
    fontFamily: "Grafmassa",
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionBtn: {
    height: 50,
    backgroundColor: "#00E5FF",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  actionBtnTxt: {
    fontFamily: "Grafmassa",
    color: "#050709",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  logoutBtn: {
    height: 50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1B232D",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtnTxt: {
    fontFamily: "Grafmassa",
    color: "#64748B",
    fontSize: 14,
    fontWeight: "bold",
  },
  backBtn: {
    height: 48,
    backgroundColor: "#11161B",
    justifyContent: "center",
    paddingLeft: 24,
    borderTopWidth: 1,
    borderTopColor: "#1B232D",
  },
  backBtnTxt: {
    fontFamily: "Grafmassa",
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});

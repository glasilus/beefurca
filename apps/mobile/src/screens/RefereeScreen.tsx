import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SkiaFractal } from "../components/SkiaFractal";
import EventSource from "react-native-sse";

interface RefereeScreenProps {
  matchId: string;
  authToken: string;
  apiBaseUrl: string; // e.g. "https://api.beefurca.com"
}

export const RefereeScreen: React.FC<RefereeScreenProps> = ({
  matchId,
  authToken,
  apiBaseUrl,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);

  // Score inputs
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});

  // 1. Fetch initial data and setup SSE stream
  useEffect(() => {
    fetchMatchDetails();

    // Setup EventSource real-time stream subscription (as requested: sse on mobile client)
    const sseUrl = `${apiBaseUrl}/tournaments/${matchData?.tournamentId || "temp"}/stream`;
    const eventSource = new EventSource(sseUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    (eventSource as any).addEventListener("update", (event: any) => {
      try {
        const matchesList = JSON.parse(event.data);
        const updatedMatch = matchesList.find((m: any) => m.id === matchId);
        if (updatedMatch) {
          console.log("SSE: Match updated in real-time:", updatedMatch);
          setMatchData(updatedMatch);
          setScore1(updatedMatch.score1 ?? 0);
          setScore2(updatedMatch.score2 ?? 0);
          setCustomFieldsData(updatedMatch.customFieldsData ?? {});
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMatchData(data.match);
        setScore1(data.match.score1 ?? 0);
        setScore2(data.match.score2 ?? 0);
        setCustomFieldsData(data.match.customFieldsData ?? {});
        
        // Fetch tournament custom fields schema
        const tRes = await fetch(`${apiBaseUrl}/tournaments/${data.match.tournamentId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const tData = await tRes.json();
        setTournament(tData.tournament);
      }
    } catch (err: any) {
      Alert.alert("Ошибка", `Не удалось загрузить матч: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Score modification buttons
  const incrementScore = (player: 1 | 2) => {
    if (player === 1) setScore1((prev) => prev + 1);
    else setScore2((prev) => prev + 1);
  };

  const decrementScore = (player: 1 | 2) => {
    if (player === 1) setScore1((prev) => Math.max(0, prev - 1));
    else setScore2((prev) => Math.max(0, prev - 1));
  };

  // 2. Submit scores
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          score1,
          score2,
          customFieldsData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Успех", "Результаты матча успешно внесены.");
        fetchMatchDetails();
      } else {
        Alert.alert("Ошибка", data.error || "Не удалось отправить результат.");
      }
    } catch (err: any) {
      Alert.alert("Ошибка", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Submit technical defeat
  const handleTechDefeat = (loserParticipantId: string) => {
    Alert.alert(
      "Подтверждение",
      "Зафиксировать техническое поражение для выбранного участника?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Да, выставить",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await fetch(`${apiBaseUrl}/matches/${matchId}/tech-defeat`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ loserParticipantId }),
              });
              const data = await res.json();
              if (res.ok) {
                Alert.alert("Успех", "Техническое поражение оформлено.");
                fetchMatchDetails();
              } else {
                Alert.alert("Ошибка", data.error || "Не удалось оформить техническое поражение.");
              }
            } catch (err: any) {
              Alert.alert("Ошибка", err.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF1F44" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SkiaFractal seed={matchId} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Title / Status */}
        <Text style={styles.title}>Судейский протокол</Text>
        <Text style={styles.subtitle}>Матч ID: {matchId.slice(0, 8)}...</Text>

        {/* Competitors Score inputs - Large buttons for touch accessibility */}
        <View style={styles.competitorsContainer}>
          <View style={styles.competitorCard}>
            <Text style={styles.competitorName}>Участник 1</Text>
            <Text style={styles.scoreText}>{score1}</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => decrementScore(1)} style={styles.scoreBtn}>
                <Text style={styles.btnTxt}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => incrementScore(1)} style={styles.scoreBtn}>
                <Text style={styles.btnTxt}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => handleTechDefeat(matchData?.participant1Id)}
              style={styles.techDefeatBtn}
            >
              <Text style={styles.techTxt}>Тех. поражение</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.competitorCard}>
            <Text style={styles.competitorName}>Участник 2</Text>
            <Text style={styles.scoreText}>{score2}</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => decrementScore(2)} style={styles.scoreBtn}>
                <Text style={styles.btnTxt}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => incrementScore(2)} style={styles.scoreBtn}>
                <Text style={styles.btnTxt}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => handleTechDefeat(matchData?.participant2Id)}
              style={styles.techDefeatBtn}
            >
              <Text style={styles.techTxt}>Тех. поражение</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Metadata fields configuration (JSONB EAV form) */}
        {tournament?.customFieldsSchema && tournament.customFieldsSchema.length > 0 && (
          <View style={styles.customSection}>
            <Text style={styles.sectionHeader}>Дополнительные параметры матча</Text>
            {tournament.customFieldsSchema.map((field: any) => (
              <View key={field.name} style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {field.label} {field.required && "*"}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={`Введите ${field.label.toLowerCase()}`}
                  placeholderTextColor="#64748B"
                  value={String(customFieldsData[field.name] || "")}
                  onChangeText={(val) => {
                    const parsedValue = field.type === "number" ? Number(val) || 0 : val;
                    setCustomFieldsData((prev) => ({
                      ...prev,
                      [field.name]: parsedValue,
                    }));
                  }}
                  keyboardType={field.type === "number" ? "numeric" : "default"}
                />
              </View>
            ))}
          </View>
        )}

        {/* Submit Action */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitBtn}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Утвердить счет</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050709",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050709",
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontFamily: "Grafmassa",
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Unifix SP",
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 30,
  },
  competitorsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  competitorCard: {
    width: "48%",
    backgroundColor: "rgba(17, 22, 27, 0.8)",
    borderWidth: 1,
    borderColor: "#1B232D",
    borderRadius: 6,
    padding: 16,
    alignItems: "center",
  },
  competitorName: {
    fontFamily: "Grafmassa",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  scoreText: {
    fontFamily: "Beast",
    fontSize: 44,
    color: "#00E5FF",
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: "#1B232D",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  btnTxt: {
    fontFamily: "Grafmassa",
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  techDefeatBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,31,68,0.3)",
    backgroundColor: "rgba(255,31,68,0.05)",
  },
  techTxt: {
    fontFamily: "Grafmassa",
    fontSize: 10,
    color: "#FF1F44",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  customSection: {
    backgroundColor: "rgba(17, 22, 27, 0.8)",
    borderWidth: 1,
    borderColor: "#1B232D",
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: "Grafmassa",
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1B232D",
    paddingBottom: 8,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: "Grafmassa",
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  textInput: {
    fontFamily: "Grafmassa",
    height: 40,
    backgroundColor: "#0B0E12",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1B232D",
    paddingHorizontal: 12,
    color: "#FFFFFF",
    fontSize: 12,
  },
  submitBtn: {
    height: 52,
    backgroundColor: "#FF1F44",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF1F44",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: {
    fontFamily: "Grafmassa",
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

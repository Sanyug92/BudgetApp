import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Card, Button, TextInput, ActivityIndicator } from "react-native-paper";
import { formatDistanceToNow } from "date-fns";
import { CreditCard as CreditCardIcon, Edit3, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useBudgetContext } from "@/context/BudgetContext";

const getRandomGradient = (seed: string | number) => {
  const colors = [
    ["#2563eb", "#1e40af"],
    ["#9333ea", "#4f46e5"],
    ["#059669", "#0d9488"],
    ["#e11d48", "#db2777"],
    ["#d97706", "#ea580c"],
    ["#7c3aed", "#6d28d9"],
    ["#0891b2", "#1d4ed8"],
    ["#c026d3", "#db2777"],
  ];
  const seedStr = typeof seed === "number" ? seed.toString() : String(seed);
  const hash = seedStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[Math.abs(hash) % colors.length];
};

export function CreditCardCarousel() {
  const { budgetData, updateCreditCard, deleteCreditCard, addCreditCard, loading, error } =
    useBudgetContext();

  const cards = budgetData?.creditCards || [];
  const defaultCards = [
    { id: -1, name: "Chase Sapphire", limit: 5000, available: 4200, lastUpdated: new Date().toISOString() },
    { id: -2, name: "Capital One", limit: 3000, available: 2100, lastUpdated: new Date().toISOString() },
    { id: -3, name: "Discover", limit: 2500, available: 2300, lastUpdated: new Date().toISOString() },
  ];
  const displayCards = cards.length > 0 ? cards : defaultCards;

  const [editingCard, setEditingCard] = useState<string | number | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempLimit, setTempLimit] = useState("");
  const [tempAvailable, setTempAvailable] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleEditStart = (card: any) => {
    if (!card.id) return;
    setEditingCard(card.id);
    setTempName(card.name);
    setTempLimit(card.limit?.toString() || "0");
    setTempAvailable(card.available?.toString() || "0");
  };

  const handleEditSave = async (cardId: string | number) => {
    const newLimit = parseFloat(tempLimit);
    const newAvailable = parseFloat(tempAvailable);
    if (!isNaN(newLimit) && !isNaN(newAvailable) && newAvailable <= newLimit) {
      if (typeof cardId === "number" && cardId < 0) {
        await addCreditCard({ name: tempName, limit: newLimit, available: newAvailable });
      } else {
        const cardIdStr = typeof cardId === "number" ? cardId.toString() : cardId;
        await updateCreditCard(cardIdStr, {
          name: tempName,
          limit: newLimit,
          available: newAvailable,
          balance: newLimit - newAvailable,
        });
      }
    }
    setEditingCard(null);
    setTempName("");
    setTempLimit("");
    setTempAvailable("");
  };

  const handleDeleteCard = async (cardId: string | number) => {
    if (typeof cardId === "number" && cardId < 0) return;
    const cardIdStr = typeof cardId === "number" ? cardId.toString() : cardId;
    await deleteCreditCard(cardIdStr);
  };

  const handleAddCard = async () => {
    await addCreditCard({ name: "New Card", limit: 0, available: 0 });
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ color: "red" }}>Error loading credit cards. Please try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setIsExpanded(!isExpanded)}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <CreditCardIcon size={16} color="#000" />
          <Text style={styles.headerText}> Credit Cards</Text>
        </View>
        <Text>{isExpanded ? "▼" : "▲"}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          <Button
            mode="outlined"
            style={styles.addCardButton}
            onPress={handleAddCard}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add New Card"}
          </Button>

          {displayCards.map((card) => {
            const balance = card.limit - card.available;
            const utilization = ((card.limit - card.available) / card.limit) * 100 || 0;
            const [startColor, endColor] = getRandomGradient(card.id);

            return (
              <Card key={card.id} style={styles.card}>
                <LinearGradient colors={[startColor, endColor]} style={styles.gradientHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{card.name}</Text>
                    <Text style={styles.maskedNumber}>•••• •••• •••• ••••</Text>
                  </View>
                  <View style={styles.utilizationBadge}>
                    <Text style={{ color: "#fff", fontSize: 12 }}>{utilization.toFixed(0)}% Used</Text>
                  </View>
                </LinearGradient>

                <Card.Content>
                  {editingCard === card.id ? (
                    <View>
                      <TextInput label="Card Name" value={tempName} onChangeText={setTempName} />
                      <TextInput label="Credit Limit" value={tempLimit} onChangeText={setTempLimit} keyboardType="numeric" />
                      <TextInput label="Available Credit" value={tempAvailable} onChangeText={setTempAvailable} keyboardType="numeric" />
                      <Button onPress={() => handleEditSave(card.id)}>Save</Button>
                      <Button onPress={() => setEditingCard(null)}>Cancel</Button>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.row}>
                        <Text>Spent: ${balance}</Text>
                        <Text>Limit: ${card.limit}</Text>
                      </View>
                      <Text style={styles.updatedText}>
                        Updated {formatDistanceToNow(new Date(card.lastUpdated), { addSuffix: true })}
                      </Text>
                      <View style={styles.row}>
                        <Button compact onPress={() => handleEditStart(card)}>
                          <Edit3 size={16} />
                        </Button>
                        <Button compact onPress={() => handleDeleteCard(card.id)}>
                          <X size={16} color="red" />
                        </Button>
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderColor: "#ddd" },
  headerText: { fontWeight: "bold" },
  scrollContainer: { padding: 10, flexDirection: "row", gap: 10 },
  addCardButton: { height: 180, justifyContent: "center", alignItems: "center", marginRight: 10 },
  card: { width: 280, marginRight: 10 },
  gradientHeader: { padding: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8, flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { color: "#fff", fontWeight: "bold" },
  maskedNumber: { color: "#fff", opacity: 0.8 },
  utilizationBadge: { backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  updatedText: { fontSize: 12, color: "#666", marginTop: 8 },
  errorContainer: { padding: 10, backgroundColor: "#fee2e2" },
});

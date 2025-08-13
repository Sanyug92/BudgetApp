import React, { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions, ScrollView, FlatList } from "react-native";
import { Text, Card, Button, TextInput, ActivityIndicator, useTheme } from "react-native-paper";
import { formatDistanceToNow } from "date-fns";
import { CreditCard as CreditCardIcon, Edit3, X, Plus, ChevronUp, ChevronDown } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useBudgetContext } from "@/context/BudgetContext";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_SPACING = 16;
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

export function CreditCardDrawer() {
  const theme = useTheme();
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
  const [isExpanded, setIsExpanded] = useState(false);
  // const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<FlatList<any>>(null);
    const MIN_DRAWER_HEIGHT = 100;
  const MAX_DRAWER_HEIGHT = Dimensions.get('window').height * 0.6; // Reduced from 0.7 to account for tab bar
  const [drawerHeight] = useState(new Animated.Value(MIN_DRAWER_HEIGHT));

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
    // Scroll to end when new card is added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleDrawer = () => {
    Animated.spring(drawerHeight, {
      toValue: isExpanded ? MIN_DRAWER_HEIGHT : MAX_DRAWER_HEIGHT,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 3);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        drawerHeight.setValue(Math.max(MIN_DRAWER_HEIGHT, MAX_DRAWER_HEIGHT - gestureState.dy));
      } else {
        drawerHeight.setValue(Math.min(MAX_DRAWER_HEIGHT, MIN_DRAWER_HEIGHT - gestureState.dy));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 50) {
        Animated.spring(drawerHeight, {
          toValue: MIN_DRAWER_HEIGHT,
          useNativeDriver: false
        }).start();
        setIsExpanded(false);
      } else if (gestureState.dy < -50) {
        Animated.spring(drawerHeight, {
          toValue: MAX_DRAWER_HEIGHT,
          useNativeDriver: false
        }).start();
        setIsExpanded(true);
      } else {
        Animated.spring(drawerHeight, {
          toValue: isExpanded ? MAX_DRAWER_HEIGHT : MIN_DRAWER_HEIGHT,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const renderCard = ({ item: card }: { item: any }) => {
    const balance = card.limit - card.available;
    const utilization = ((card.limit - card.available) / card.limit) * 100 || 0;
    const [startColor, endColor] = getRandomGradient(card.id);

    return (
      <View style={styles.cardWrapper}>
        <Card style={styles.card}>
          <LinearGradient
            colors={[startColor, endColor]}
            style={styles.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{card.name}</Text>
              <View style={styles.utilizationBadge}>
                <Text style={styles.utilizationText}>
                  {utilization.toFixed(0)}% Used
                </Text>
              </View>
            </View>
            <Text style={styles.maskedNumber}>•••• •••• •••• ••••</Text>
          </LinearGradient>

          <Card.Content style={styles.cardContent}>
            {editingCard === card.id ? (
              <View style={styles.editForm}>
                <TextInput
                  mode="outlined"
                  label="Card Name"
                  value={tempName}
                  onChangeText={setTempName}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Credit Limit"
                  value={tempLimit}
                  onChangeText={setTempLimit}
                  keyboardType="numeric"
                  style={styles.input}
                  left={<TextInput.Affix text="$" />}
                />
                <TextInput
                  mode="outlined"
                  label="Available Credit"
                  value={tempAvailable}
                  onChangeText={setTempAvailable}
                  keyboardType="numeric"
                  style={styles.input}
                  left={<TextInput.Affix text="$" />}
                />
                <View style={styles.editButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setEditingCard(null)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleEditSave(card.id)}
                    style={styles.saveButton}
                  >
                    Save
                  </Button>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Spent:</Text>
                  <Text style={styles.cardValue}>${balance.toFixed(2)}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Limit:</Text>
                  <Text style={styles.cardValue}>${card.limit.toFixed(2)}</Text>
                </View>
                <Text style={styles.updatedText}>
                  Updated {formatDistanceToNow(new Date(card.lastUpdated), { addSuffix: true })}
                </Text>
                <View style={styles.cardActions}>
                  <Button
                    mode="text"
                    onPress={() => handleEditStart(card)}
                    textColor={theme.colors.primary}
                    icon={() => <Edit3 size={16} color={theme.colors.primary} />}
                  >
                    Edit
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => handleDeleteCard(card.id)}
                    textColor={theme.colors.error}
                    icon={() => <X size={16} color={theme.colors.error} />}
                  >
                    Remove
                  </Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ color: theme.colors.error }}>Error loading credit cards</Text>
        <Button onPress={() => { }}>Retry</Button>
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, { height: drawerHeight }]}
      {...panResponder.panHandlers}
    >
      {/* Drawer Handle */}
      <TouchableOpacity
        style={styles.handle}
        onPress={toggleDrawer}
        activeOpacity={0.8}
      >
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <CreditCardIcon size={20} color={theme.colors.primary} />
          <Text style={styles.headerText}>Credit Cards</Text>
          {isExpanded ? (
            <ChevronDown size={20} color={theme.colors.primary} />
          ) : (
            <ChevronUp size={20} color={theme.colors.primary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Drawer Content */}
      <View style={styles.content}>
        {isExpanded && (
          <>
            <Button
              mode="contained-tonal"
              style={styles.addButton}
              onPress={handleAddCard}
              disabled={loading}
              icon={() => <Plus size={16} color={theme.colors.primary} />}
            >
              Add Card
            </Button>

            <FlatList
              ref={scrollViewRef}
              data={displayCards}
              renderItem={renderCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
              snapToInterval={CARD_WIDTH + 16} // width + marginRight
              decelerationRate="fast"
              snapToAlignment="start"
              pagingEnabled={false}
              getItemLayout={(_, index) => ({
                length: CARD_WIDTH + 16,
                offset: (CARD_WIDTH + 16) * index,
                index,
              })}
              style={{ flexGrow: 0 }} // Ensures it doesn’t take full height
            />

          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    marginBottom: 0,
  },
  handle: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  addButton: {
    margin: 16,
    marginBottom: 8,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  gradientHeader: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  maskedNumber: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 14,
  },
  utilizationBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  utilizationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  updatedText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editForm: {
    marginTop: 8,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: 16,
  },
});
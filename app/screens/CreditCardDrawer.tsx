import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions, FlatList, Alert } from "react-native";
import { Text, Card, Button, TextInput, ActivityIndicator, useTheme } from "react-native-paper";
import { formatDistanceToNow } from "date-fns";
import { CreditCard as CreditCardIcon, Edit3, X, Plus, Info } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CreditCard, useBudgetContext } from "@/context/BudgetContext";
import ReanimatedCarousel from "react-native-reanimated-carousel";

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.85; // Slightly wider for better mobile viewing
const CARD_MARGIN = 8; // Reduced margin for more compact layout

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
  const carouselRef = useRef<any>(null);
  const cards = budgetData?.creditCards || [];
  const sortedCards = [...cards].sort((a: CreditCard, b: CreditCard) => {
    // Try created_at first, fall back to lastUpdated
    return new Date(a.created_at || a.lastUpdated).getTime() -
      new Date(b.created_at || b.lastUpdated).getTime();
  });

  const defaultCards = [
    { id: -1, name: "Chase Sapphire", limit: 5000, available: 4200, lastUpdated: new Date().toISOString() },
    { id: -2, name: "Capital One", limit: 3000, available: 2100, lastUpdated: new Date().toISOString() },
    { id: -3, name: "Discover", limit: 2500, available: 2300, lastUpdated: new Date().toISOString() },
  ];
  const displayCards = sortedCards.length > 0 ? sortedCards : defaultCards;
  //const displayCards = cards.length > 0 ? cards : defaultCards;

  const [editingCard, setEditingCard] = useState<string | number | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempLimit, setTempLimit] = useState("");
  const [tempAvailable, setTempAvailable] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollViewRef = useRef<FlatList<any>>(null);

  // Adjusted heights for better mobile experience
  const MIN_DRAWER_HEIGHT = 100; // More compact minimum height
  const MAX_DRAWER_HEIGHT = Dimensions.get('window').height * 0.6; // More space for cards

  const drawerHeight = useRef(new Animated.Value(MIN_DRAWER_HEIGHT)).current;

  // Track the current height for calculations
  const currentHeight = useRef(MIN_DRAWER_HEIGHT);

  // Update the current height whenever the animated value changes
  useEffect(() => {
    const id = drawerHeight.addListener((value) => {
      currentHeight.current = value.value;
    });
    return () => drawerHeight.removeListener(id);
  }, [drawerHeight]);

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

  const handleDeleteCard = (cardId: string | number) => {
    if (typeof cardId === "number" && cardId < 0) return;
    const cardIdStr = typeof cardId === "number" ? cardId.toString() : cardId;

    Alert.alert(
      'Delete Credit Card',
      'Are you sure you want to delete this credit card? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCreditCard(cardIdStr);
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Failed to delete the credit card. Please try again.');
            }
          },
        },
      ]
    );
  };

  // const handleAddCard = async () => {
  //   if (loading) return;

  //   const newCard = {
  //     name: 'New Credit Card',
  //     limit: 0,
  //     available: 0,
  //     lastUpdated: new Date().toISOString(),
  //   };

  //   try {
  //     await addCreditCard(newCard);
  //     // After adding the card, find its index and scroll to it
  //     const newCardIndex = displayCards.length; // New card will be at the end
  //     setTimeout(() => {
  //       if (scrollViewRef.current) {
  //         scrollViewRef.current.scrollToIndex({
  //           index: newCardIndex,
  //           animated: true,
  //           viewPosition: 0.5 // Center the new card
  //         });
  //       }
  //     }, 300); // Small delay to ensure the card is rendered
  //   } catch (err) {
  //     console.error('Error adding card:', err);
  //   }
  // };

  const handleAddCard = async () => {
    if (loading) return;

    const newCard = {
      name: 'New Credit Card',
      limit: 0,
      available: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await addCreditCard(newCard);
      // Wait a moment for the card to appear
      setTimeout(() => {
        const newCardIndex = displayCards.length; // new one will be at the end
        if (carouselRef.current) {
          carouselRef.current.scrollTo({
            index: newCardIndex,
            animated: true,
          });
        }
      }, 300);
    } catch (err) {
      console.error('Error adding card:', err);
    }
  };

  const toggleDrawer = () => {
    Animated.spring(drawerHeight, {
      toValue: isExpanded ? MIN_DRAWER_HEIGHT : MAX_DRAWER_HEIGHT,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        return gestureState.y0 < 40;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const vertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const inHandleArea = gestureState.y0 < 40;
        return vertical && inHandleArea;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = Math.max(
          MIN_DRAWER_HEIGHT,
          Math.min(MAX_DRAWER_HEIGHT, currentHeight.current - gestureState.dy)
        );
        drawerHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldExpand = gestureState.vy < 0 ||
          (currentHeight.current > (MIN_DRAWER_HEIGHT + MAX_DRAWER_HEIGHT) / 2);
        const targetHeight = shouldExpand ? MAX_DRAWER_HEIGHT : MIN_DRAWER_HEIGHT;

        Animated.spring(drawerHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          tension: 80,
          friction: 10
        }).start(() => {
          setIsExpanded(shouldExpand);
          currentHeight.current = targetHeight;
        });
      },
      onPanResponderTerminate: () => {
        const shouldExpand = currentHeight.current > (MIN_DRAWER_HEIGHT + MAX_DRAWER_HEIGHT) / 2;
        const targetHeight = shouldExpand ? MAX_DRAWER_HEIGHT : MIN_DRAWER_HEIGHT;

        Animated.spring(drawerHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
        }).start(() => {
          currentHeight.current = targetHeight;
        });
      },
    })
  ).current;

  const renderCard = ({ item: card }: { item: any }) => {
    const balance = card.limit - card.available;
    const utilization = ((card.limit - card.available) / card.limit) * 100 || 0;
    const [startColor, endColor] = getRandomGradient(card.id);

    return (
      <View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={styles.infoText}>
              Add each credit card with a name and its credit limit. Update your available credit{' '}
              <Text style={styles.noteText}>— not your balance —</Text> to see the real picture.
            </Text>
          </View>
        </View>
        <Card style={styles.card}>
          <LinearGradient
            colors={[startColor, endColor]}
            style={styles.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                {card.name}
              </Text>
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
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Credit Limit"
                  value={tempLimit}
                  onChangeText={setTempLimit}
                  keyboardType="numeric"
                  style={styles.input}
                  left={<TextInput.Affix text="$" />}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Available Credit"
                  value={tempAvailable}
                  onChangeText={setTempAvailable}
                  keyboardType="numeric"
                  style={styles.input}
                  left={<TextInput.Affix text="$" />}
                  dense
                />
                <View style={styles.editButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setEditingCard(null)}
                    style={styles.cancelButton}
                    compact
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleEditSave(card.id)}
                    style={styles.saveButton}
                    compact
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
                <Text style={styles.updatedText} numberOfLines={1}>
                  Updated {formatDistanceToNow(new Date(card.lastUpdated), { addSuffix: true })}
                </Text>
                <View style={styles.cardActions}>
                  <Button
                    mode="text"
                    onPress={() => handleEditStart(card)}
                    textColor={theme.colors.primary}
                    icon={() => <Edit3 size={16} color={theme.colors.primary} />}
                    compact
                  >
                    Edit
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => handleDeleteCard(card.id)}
                    textColor={theme.colors.error}
                    icon={() => <X size={16} color={theme.colors.error} />}
                    compact
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
              compact
            >
              Add Card
            </Button>

            {loading ? (
              <ActivityIndicator style={styles.loadingIndicator} />
            ) : (
              <ReanimatedCarousel
                ref={carouselRef}
                data={displayCards}
                renderItem={renderCard}
                width={SCREEN_WIDTH}
                height={CARD_WIDTH}
                scrollAnimationDuration={1000}
                style={styles.carousel}
              />
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    flex: 1,
  },
  noteText: {
    fontStyle: 'italic',
    color: '#3b82f6',
    fontWeight: '800',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
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
    paddingBottom: 24, // Add bottom padding to ensure save button is accessible
  },
  addButton: {
    margin: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  cardsContainer: {
    paddingHorizontal: CARD_MARGIN,
    paddingBottom: 16,
  },
  cardWrapper: {
    marginHorizontal: CARD_MARGIN,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    elevation: 2,
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
    flex: 1,
    marginRight: 8,
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
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editForm: {
    marginTop: 4,
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
  carousel: {
    flexGrow: 0,
    marginBottom: 8,
  },
  loadingIndicator: {
    marginVertical: 24,
  },
});
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { DrawerActions, useNavigation } from '@react-navigation/native';

interface AppHeaderProps {
  title: string;
  showMenu?: boolean;
}

export function AppHeader({ title, showMenu = true }: AppHeaderProps) {
  const theme = useTheme();
  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.background }]}>
      {showMenu && (
        <Appbar.Action
          icon="menu"
          onPress={handleMenuPress}
          color={theme.colors.onBackground}
        />
      )}
      <Appbar.Content
        title={title}
        titleStyle={[styles.title, { color: theme.colors.onBackground }]}
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    elevation: 0,
    shadowOpacity: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

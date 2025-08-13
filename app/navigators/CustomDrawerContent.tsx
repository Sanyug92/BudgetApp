import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useTheme, Avatar, Text, Divider, Icon } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';

interface CustomDrawerContentProps {
  state: any;
  navigation: any;
  descriptors: any;
}

export function CustomDrawerContent(props: CustomDrawerContentProps) {
  const theme = useTheme();
  const { user } = useAuth();

  const getIcon = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return 'home';
      case 'Bills':
        return 'file-document';
      case 'Budget':
        return 'chart-pie';
      default:
        return 'folder';
    }
  };

  return (
    <DrawerContentScrollView 
      {...props}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Avatar.Icon size={64} icon="account" style={styles.avatar} />
        <Text variant="titleMedium" style={styles.userName}>
          Credit Wise Budget
        </Text>
      </View>
      
      <Divider style={styles.divider} />

      {props.state.routes.map((route: any, index: number) => {
        const { options } = props.descriptors[route.key];
        const label =
          options.drawerLabel !== undefined
            ? options.drawerLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        return (
          <DrawerItem
            key={route.key}
            label={label}
            icon={({ color, size }) => (
              <Icon source={getIcon(route.name)} color={color} size={size} />
            )}
            onPress={() => {
              props.navigation.navigate(route.name);
            }}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={styles.drawerItem}
          />
        );
      })}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#e0e0e0',
  },
  userName: {
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
  drawerItem: {
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
  },
});

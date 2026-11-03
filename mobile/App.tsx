import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Bell, ChartPie, CircleDollarSign, ListChecks, Settings, SplitSquareVertical } from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { LoginScreen } from './src/screens/Auth/LoginScreen';
import { SignupScreen } from './src/screens/Auth/SignupScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { BudgetsScreen } from './src/screens/BudgetsScreen';
import { RemindersScreen } from './src/screens/RemindersScreen';
import { SplitKroScreen } from './src/screens/SplitKroScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { COLORS } from './src/utils/constants';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.splashText}>Loading FinMax...</Text>
    </View>
  );
}

function AuthStack() {
  const [showLogin, setShowLogin] = useState(true);
  return showLogin ? (
    <LoginScreen onSwitchToSignup={() => setShowLogin(false)} />
  ) : (
    <SignupScreen onSwitchToLogin={() => setShowLogin(true)} />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTitleStyle: { color: COLORS.text, fontWeight: '700' },
        headerTintColor: COLORS.text,
        tabBarStyle: {
          backgroundColor: '#080A0B',
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#7F8A8D',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ChartPie color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <CircleDollarSign color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SplitKro"
        component={SplitKroScreen}
        options={{
          title: 'Split Kro',
          tabBarIcon: ({ color, size }) => <SplitSquareVertical color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <RootNavigator />
      </DataProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  splashText: { marginTop: 10, color: COLORS.textSecondary },
});

import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();

  // Still loading session from AsyncStorage — show spinner
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Redirect based on auth state
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'ADMIN') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(tabs)/dashboard" />;
}

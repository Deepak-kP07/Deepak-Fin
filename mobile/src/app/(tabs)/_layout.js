import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { colors } from '../../lib/theme'
import { useData } from '../../state/DataProvider'

const icon = (name) => ({ color, size }) => <Feather name={name} size={size - 2} color={color} />

export default function TabsLayout() {
  const { accent } = useData()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: '#0b0f19', borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: icon('repeat') }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts', tabBarIcon: icon('credit-card') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('menu') }} />
    </Tabs>
  )
}

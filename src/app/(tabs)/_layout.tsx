import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={{ width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accentTint : 'transparent' }}>
      <Icon name={name} size={22} color={focused ? colors.accent : colors.muted} strokeWidth={1.9} />
    </View>
  );
}

export default function TabsLayout() {
  const tab = (name: string, title: string, icon: IconName) => (
    <Tabs.Screen name={name} options={{ title, tabBarIcon: ({ focused }) => <TabIcon name={icon} focused={focused} /> }} />
  );
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 84, paddingTop: 6 },
      tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
      sceneStyle: { backgroundColor: colors.bg },
    }}>
      {tab('tonight', 'Tonight', 'tonight')}
      {tab('kitchen', 'Kitchen', 'kitchen')}
      {tab('browse', 'Browse', 'browse')}
      {tab('goals', 'Goals', 'goals')}
      {tab('account', 'Account', 'account')}
    </Tabs>
  );
}

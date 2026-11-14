import { Pressable, View } from 'react-native'
import { tw } from '../lib/tw'

// Port of components/shared/ToggleSwitch.jsx.
export function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <Pressable disabled={disabled} onPress={() => onChange(!checked)} className={tw('relative h-6 w-10 rounded-full', checked ? 'bg-accent-400' : 'bg-white/15', disabled && 'opacity-50')}>
      <View className="absolute top-0.5 h-5 w-5 rounded-full bg-white" style={{ left: checked ? 18 : 2 }} />
    </Pressable>
  )
}

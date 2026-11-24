import { useLocalSearchParams } from 'expo-router'
import { InviteView } from '../../../views/InviteView'

// /invite/<token> — a Family / Company share invite (same path as the web page the server links to).
export default function ProfileInviteScreen() {
  const { token } = useLocalSearchParams()
  return <InviteView kind="profile" token={String(token || '')} />
}

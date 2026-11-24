import { useLocalSearchParams } from 'expo-router'
import { InviteView } from '../../../../views/InviteView'

// /invite/lend/<token> — a Lend / Borrow share invite (same path as the web page the server links to).
export default function LendInviteScreen() {
  const { token } = useLocalSearchParams()
  return <InviteView kind="lend" token={String(token || '')} />
}

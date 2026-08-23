'use client'

import { VaultView } from '@/features/vault/VaultView'

export function SettingsVault({ data, onAddVaultItem, onEditVaultItem, onDeleteVaultItem }) {
  return <VaultView data={data} onAdd={onAddVaultItem} onEdit={onEditVaultItem} onDelete={onDeleteVaultItem} />
}
